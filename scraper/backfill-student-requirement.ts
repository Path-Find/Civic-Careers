import { initDb } from './db';
import { classifyCareerStage } from './career-stage';
import { classifyStudentRequirement } from './requirements';
import { GOVERNMENT_OF_CANADA_FIXES } from './source-fixes';

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  source: string;
  title: string;
  rawText: string;
  isStudent: number;
  careerStage: string | null;
};

async function main() {
  const db = await initDb();
  const stores = [{ label: 'current', execute: (statement: string | { sql: string; args: unknown[] }) => db.execute(statement), batch: (statements: Array<{ sql: string; args: unknown[] }>) => db.batch(statements) }];
  const archiveDb = db as unknown as {
    executeArchive?: (statement: string | { sql: string; args: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }>;
    batchArchive?: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown>;
  };
  if (archiveDb.executeArchive && archiveDb.batchArchive) stores.push({ label: 'archive', execute: statement => archiveDb.executeArchive!(statement), batch: statements => archiveDb.batchArchive!(statements) });

  for (const store of stores) {
  const result = await store.execute(`
    SELECT COALESCE(jd.id, raw.id) AS id, j.source, jd.job_title, jd.is_student, jd.career_stage,
           raw.id AS raw_id, raw.pending_is_student,
           COALESCE(raw.title, '') AS raw_title, COALESCE(raw.raw_text, '') AS raw_text
    FROM jobs j
    LEFT JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE jd.id IS NOT NULL OR raw.id IS NOT NULL
    ORDER BY jd.id
  `);

  const candidates = result.rows.map(row => {
    const id = String(row.id);
    const source = String(row.source ?? '');
    const title = String(row.job_title ?? row.raw_title ?? '');
    const rawText = String(row.raw_text ?? '');
    const sourceFix = GOVERNMENT_OF_CANADA_FIXES[id];
    const nextStudent = sourceFix?.isStudent ?? (classifyStudentRequirement(title, rawText) ? 1 : 0);
    const nextStage = (String(row.career_stage ?? '') === 'student' || nextStudent === 1)
      ? classifyCareerStage({ title, rawText, isStudent: nextStudent })
      : row.career_stage == null ? null : String(row.career_stage);
    return {
      id,
      source,
      title,
      rawText,
      isStudent: row.is_student == null ? null : Number(row.is_student),
      pendingStudent: row.pending_is_student == null ? null : Number(row.pending_is_student),
      hasDetails: row.id != null,
      rawId: row.raw_id == null ? null : String(row.raw_id),
      careerStage: row.career_stage == null ? null : String(row.career_stage),
      nextStudent,
      nextStage,
    };
  }).filter(row => {
    const detailsChanged = row.hasDetails
      && (row.isStudent !== row.nextStudent || row.careerStage !== row.nextStage);
    // A null pending value means the row has not been parsed yet. Leave it
    // null so the parser can classify it when it creates the details row.
    const pendingChanged = row.rawId != null
      && row.pendingStudent != null
      && row.pendingStudent !== row.nextStudent;
    return detailsChanged || pendingChanged;
  });

  console.log(`[Student requirement backfill:${store.label}] ${APPLY ? 'Applying' : 'Dry run'} ${candidates.length} change(s).`);
  for (const row of candidates.slice(0, 40)) {
    console.log(JSON.stringify({ id: row.id, source: row.source, title: row.title, student: `${row.isStudent}->${row.nextStudent}`, careerStage: `${row.careerStage ?? 'null'}->${row.nextStage ?? 'null'}` }));
  }
  if (!APPLY) continue;

  for (let index = 0; index < candidates.length; index += 400) {
    const chunk = candidates.slice(index, index + 400);
    const detailRows = chunk.filter(row => row.hasDetails
      && (row.isStudent !== row.nextStudent || row.careerStage !== row.nextStage));
    const pendingRows = chunk.filter(row => row.rawId != null
      && row.pendingStudent != null
      && row.pendingStudent !== row.nextStudent);
    const statements: Array<{ sql: string; args: unknown[] }> = [];
    if (detailRows.length > 0) {
      statements.push({
        sql: `UPDATE job_details AS details
              SET is_student = patch_values.is_student, career_stage = patch_values.career_stage
              FROM (VALUES ${detailRows.map(() => '(?, ?::integer, ?::text)').join(', ')})
                AS patch_values(id, is_student, career_stage)
              WHERE details.id = patch_values.id`,
        args: detailRows.flatMap(row => [row.id, row.nextStudent, row.nextStage]),
      });
    }
    if (pendingRows.length > 0) {
      statements.push({
        sql: `UPDATE raw_jobs AS raw
              SET pending_is_student = patch_values.is_student
              FROM (VALUES ${pendingRows.map(() => '(?, ?::integer)').join(', ')})
                AS patch_values(id, is_student)
              WHERE raw.id = patch_values.id`,
        args: pendingRows.flatMap(row => [row.rawId, row.nextStudent]),
      });
    }
    if (statements.length > 0) await store.batch(statements);
  }
  console.log(`[Student requirement backfill:${store.label}] Updated ${candidates.length} job(s).`);
  }
}

main().catch(error => {
  console.error('[Student requirement backfill] Failed:', error);
  process.exitCode = 1;
});
