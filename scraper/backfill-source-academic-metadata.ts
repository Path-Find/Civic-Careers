/**
 * Repair source metadata for PeopleSoft academic postings without re-scraping.
 *
 *   npx tsx backfill-source-academic-metadata.ts       # dry run
 *   npx tsx backfill-source-academic-metadata.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractSourceAcademicCourse, extractSourceAcademicCourseFromRaw, extractSourceAcademicTerm, extractSourceAcademicTermFromRaw, normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const CURRENT_ONLY = process.argv.includes('--current-only');
const SOURCE_FILTER = process.argv.find(arg => arg.startsWith('--source='))?.slice('--source='.length).trim().toLowerCase() || '';
const isAcademicSource = (source: string) => /university|college|polytechnic|institut/i.test(source);

const STORED_COURSE_PATTERNS: Record<string, RegExp> = {
  'Brock University': /^(?:[A-Z]{3}\s?\d{4}|[A-Z]{4}\s\d[A-Z]\d{2})(?:\s—\s.*)?$/i,
  'Toronto Metropolitan University': /^[A-Z]{2,4}\s?\d{3,4}(?:\s*\(\d+\))?(?:\s—\s.*)?$/i,
  'University of Ottawa': /^(?!JR|REQ)[A-Z]{2,6}\s?(?!20\d{2}\b)\d{3,5}[A-Z]?(?:\d{2})?(?:\s—\s.*)?$/i,
  'University of Toronto': /^(?!LEC\d{3,4}\b)[A-Z]{3,5}\d{3,4}[A-Z0-9]{0,3}(?:\s—\s.*)?$/i,
  'York University': /^[A-Z]{2,5}\s\d{3,4}(?:\s*\/\s*(?:[A-Z]{2,5}\s?)?\d{3,4})?(?:\s—\s.*)?$/i,
  'University of Northern British Columbia': /^(?:[A-Z]{2,6}\s?\d{3}(?:-\d)?(?:\s*\/\s*[A-Z]{2,6}\s?\d{3}(?:-\d)?)?|[A-Z][A-Za-z]+(?:\s+[A-Za-z]+){0,5}\s+\d{3}-\d)(?:\s—\s.*)?$/i,
};

const UNBC_COURSE_OVERRIDES: Record<string, string> = {
  // The source title contained only the course name and was lost from the
  // preserved title capture during the first cleanup pass.
  'J0825-0285': 'Early Modern Literature in English',
  'J0726-0383': 'First Nations Studies 390-3 — Seminar in First Nations Studies',
};

function isStoredCourseValid(source: string, course: string): boolean {
  const pattern = STORED_COURSE_PATTERNS[source];
  return pattern ? pattern.test(course.trim()) : true;
}

type Store = {
  label: string;
  execute: (statement: string | { sql: string; args: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }>;
  batch: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown>;
};

async function main() {
  const db = await initDb();
  const stores: Store[] = [{ label: 'current', execute: statement => db.execute(statement), batch: statements => db.batch(statements) }];
  const archiveDb = db as unknown as { executeArchive?: Store['execute']; batchArchive?: Store['batch'] };
  if (archiveDb.executeArchive && archiveDb.batchArchive && !CURRENT_ONLY) {
    stores.push({ label: 'archive', execute: statement => archiveDb.executeArchive!(statement), batch: statements => archiveDb.batchArchive!(statements) });
  }

  const query = `
    SELECT j.id, j.source, r.title AS raw_title, r.raw_text, d.job_title AS detail_title,
           d.academic_course, d.academic_term
           ,d.department
    FROM jobs j
    LEFT JOIN raw_jobs r ON r.id = j.id
    LEFT JOIN job_details d ON d.id = j.id
      WHERE (j.source ILIKE '%university%'
        OR j.source ILIKE '%college%'
        OR j.source ILIKE '%polytechnic%'
        OR j.source ILIKE '%institute%')
      AND (r.title IS NOT NULL OR d.job_title IS NOT NULL)
  `;

  for (const store of stores) {
    const result = await store.execute(query);
    let titleChanges = 0;
    let courseChanges = 0;
    let termChanges = 0;
    let departmentChanges = 0;
    const writes: Array<{ sql: string; args: unknown[] }> = [];

    for (const row of result.rows) {
      const source = String(row.source ?? '');
      if (!isAcademicSource(source)) continue;
      if (SOURCE_FILTER && source.toLowerCase() !== SOURCE_FILTER) continue;
      const rawTitle = String(row.raw_title ?? '').trim();
      const detailTitle = String(row.detail_title ?? '').trim();
      const sourceTitle = rawTitle || detailTitle;
      const rawText = String(row.raw_text ?? '');
      const storedCourse = String(row.academic_course ?? '').trim();
      const storedDepartment = String(row.department ?? '').trim();
      let title = normalizeSourceJobTitle(source, sourceTitle);
      // Never use the record ID as academic evidence. PeopleSoft, Workday,
      // and hashed source IDs resemble course codes closely enough to poison
      // the academic_course field.
      const course = extractSourceAcademicCourseFromRaw(source, rawText) || extractSourceAcademicCourse(source, sourceTitle);
      const term = extractSourceAcademicTermFromRaw(source, rawText) || extractSourceAcademicTerm(source, sourceTitle);
      if (source === 'University of Ottawa') {
        if (storedCourse && /^APTPUO\b/i.test(sourceTitle)) title = 'Course Instructor';
        if (/^APTPUO\s+Étudiant\.e/i.test(sourceTitle)) title = 'Student Professor';
        if (/^Student\s+Part-time\s+Prof\s+APTPUO$/i.test(sourceTitle)) title = 'Student Professor';
        if (/^CUPE\s*[-–—:]\s*Academic\s+Year/i.test(sourceTitle)) title = 'Indigenous Academic Tutor';
      }
      if (source === 'University of Ottawa' && /^(?:Printemps|Automne|Hiver|Fall|Winter|Spring|Summer)$/i.test(title)) {
        title = /(?:Professor|Professeure|Professeur)/i.test(rawText) ? 'Professor' : 'Course Instructor';
      }

      if (rawTitle && rawTitle !== title) {
        titleChanges += 1;
        writes.push({ sql: 'UPDATE raw_jobs SET title = ? WHERE id = ?', args: [title, String(row.id)] });
      }
      if (detailTitle && detailTitle !== title) {
        titleChanges += 1;
        writes.push({ sql: 'UPDATE job_details SET job_title = ? WHERE id = ?', args: [title, String(row.id)] });
      }
      // Reconcile old poisoned values as well as filling blanks. A known
      // source-specific format is the safety boundary for clearing a value;
      // unknown academic sources retain their existing field untouched.
      let repairedCourse = course || (isStoredCourseValid(source, storedCourse) ? storedCourse : '');
      if (source === 'University of Northern British Columbia') {
        repairedCourse = UNBC_COURSE_OVERRIDES[String(row.id)]
          || (/^Instructor$/i.test(title) ? repairedCourse : '');
        repairedCourse = repairedCourse
          .replace(/^Studies\s+390\s+—\s+3:\s*/i, 'First Nations Studies 390-3 — ')
          .replace(/^CPSC\s+100\s+—\s+&\s+CPSC\s+321$/i, 'CPSC 100 & CPSC 321');
      }
      if (repairedCourse !== storedCourse) {
        courseChanges += 1;
        writes.push({ sql: 'UPDATE job_details SET academic_course = ? WHERE id = ?', args: [repairedCourse || null, String(row.id)] });
      }
      if (term && term !== String(row.academic_term ?? '').trim()) {
        termChanges += 1;
        writes.push({ sql: 'UPDATE job_details SET academic_term = ? WHERE id = ?', args: [term, String(row.id)] });
      }
      if (source === 'University of Ottawa') {
        const repairedDepartment = storedDepartment
          .replace(/[_\s]+FT(?=Campus:)/i, '')
          .replace(/Campus:[\s\S]*$/i, '')
          .trim();
        if (repairedDepartment !== storedDepartment) {
          departmentChanges += 1;
          writes.push({ sql: 'UPDATE job_details SET department = ? WHERE id = ?', args: [repairedDepartment || null, String(row.id)] });
        }
      }
    }

    console.log(`[Source academic metadata:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${titleChanges} title change(s), ${courseChanges} course field(s), ${termChanges} term field(s), ${departmentChanges} department field(s).`);
    if (APPLY && writes.length > 0) await store.batch(writes);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
