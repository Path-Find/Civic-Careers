import { initDb } from './db';
import { extractSoftwareRequirements } from './requirements';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 100));

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `SELECT jd.id, jd.job_title, j.source, jd.description, jd.software_requirements
          FROM job_details jd JOIN jobs j ON j.id = jd.id
          WHERE jd.description IS NOT NULL
          ORDER BY RANDOM()`
  });

  const candidates = [] as Array<{ id: string; job_title: string; source: string; values: string[]; skippedOptionalLines: number }>;
  let skippedOptionalLines = 0;
  for (const row of result.rows) {
    const extracted = extractSoftwareRequirements(String(row.description));
    skippedOptionalLines += extracted.skippedOptionalLines;
    if (!extracted.values.length) continue;
    const currentValues = row.software_requirements ? JSON.parse(String(row.software_requirements)) : [];
    const hasSameValues = currentValues.length === extracted.values.length
      && currentValues.every((value: string) => extracted.values.includes(value));
    if (hasSameValues) continue;
    candidates.push({
      id: String(row.id),
      job_title: String(row.job_title),
      source: String(row.source),
      values: extracted.values,
      skippedOptionalLines: extracted.skippedOptionalLines,
    });
    if (candidates.length >= limit) break;
  }

  console.log(`[Software backfill] ${apply ? 'Applying' : 'Dry run'} ${candidates.length} candidate(s); skipped ${skippedOptionalLines} optional software line(s).`);
  for (const candidate of candidates) {
    console.log(`- ${candidate.job_title} (${candidate.source}): ${candidate.values.join(', ')}`);
  }

  if (!apply || candidates.length === 0) return;
  await db.batch(candidates.map(candidate => ({
    sql: `UPDATE job_details SET software_requirements = ?
          WHERE id = ?`,
    args: [JSON.stringify(candidate.values), candidate.id],
  })), 'write');
  console.log(`[Software backfill] Updated ${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Software backfill] Failed:', error);
  process.exitCode = 1;
});
