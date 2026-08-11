import { initDb } from './db';
import { QUICK_SCAN_TAGS } from '../shared/quick-scan-tags';

const APPLY = process.argv.includes('--apply');
const CONCURRENCY = 5;

type Candidate = {
  id: string;
  source: string;
  title: string;
  responsibility_tags: string;
  qualification_tags: string;
};

const RESPONSIBILITY_TAGS = new Set(QUICK_SCAN_TAGS.filter(tag => tag !== 'Student'));
const QUALIFICATION_TAGS = new Set(QUICK_SCAN_TAGS);

function parseTags(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? '[]'));
    return Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}

function invalidTags(row: Candidate): string[] {
  const invalid: string[] = [];
  for (const tag of parseTags(row.responsibility_tags)) {
    if (!RESPONSIBILITY_TAGS.has(tag as never)) invalid.push(`responsibility_tags:${tag}`);
  }
  for (const tag of parseTags(row.qualification_tags)) {
    if (!QUALIFICATION_TAGS.has(tag as never)) invalid.push(`qualification_tags:${tag}`);
  }
  return invalid;
}

async function loadCandidates(db: Awaited<ReturnType<typeof initDb>>): Promise<Candidate[]> {
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title AS title,
           jd.responsibility_tags, jd.qualification_tags
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    JOIN raw_jobs raw ON raw.id = j.id
    WHERE j.is_active = 1 AND raw.parsed_at IS NOT NULL
    ORDER BY j.source, jd.job_title, j.id
  `);
  return result.rows.map(row => ({
    id: String(row.id),
    source: String(row.source ?? ''),
    title: String(row.title ?? ''),
    responsibility_tags: String(row.responsibility_tags ?? '[]'),
    qualification_tags: String(row.qualification_tags ?? '[]'),
  })).filter(row => invalidTags(row).length > 0);
}

async function main(): Promise<void> {
  const db = await initDb();
  const candidates = await loadCandidates(db);
  const invalidEntryCount = candidates.reduce((total, row) => total + invalidTags(row).length, 0);
  console.log(`${candidates.length} active job(s) contain ${invalidEntryCount} tag value(s) outside the current vocabulary.`);

  if (!APPLY) {
    console.log('Dry run only — re-run with --apply to normalize only responsibility_tags and qualification_tags.');
    for (const row of candidates) console.log(`  ${row.source}: ${row.title} (${row.id})`);
    return;
  }

  let completed = 0;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async row => {
      const responsibilityTags = [...new Set(parseTags(row.responsibility_tags).filter(tag => RESPONSIBILITY_TAGS.has(tag as never)))];
      const qualificationTags = [...new Set(parseTags(row.qualification_tags).filter(tag => QUALIFICATION_TAGS.has(tag as never)))];
      if (parseTags(row.responsibility_tags).includes('Student') && !qualificationTags.includes('Student')) {
        qualificationTags.push('Student');
      }
      await db.execute({
        sql: `UPDATE job_details
              SET responsibility_tags = ?, qualification_tags = ?
              WHERE id = ?`,
        args: [
          JSON.stringify(responsibilityTags),
          JSON.stringify(qualificationTags),
          row.id,
        ],
      });
      completed += 1;
      process.stdout.write(`\r[Tag backfill] ${completed}/${candidates.length} complete`);
    }));
  }
  console.log('');

  const remaining = await loadCandidates(db);
  console.log(`Updated: ${completed}; remaining invalid jobs: ${remaining.length}.`);
  if (remaining.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
