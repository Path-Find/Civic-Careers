import { initDb } from './db';
import { extractPostedDate, normalizePostedDate } from './posted-date';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 5000));

type Candidate = {
  id: string;
  source: string;
  title: string;
  postedAt: string;
  currentRaw: string | null;
  currentDetails: string | null;
  hasDetails: boolean;
};

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT r.id, r.source, r.title, r.raw_text, r.posted_at,
           jd.id AS details_id, jd.posted_at AS details_posted_at
    FROM raw_jobs r
    LEFT JOIN job_details jd ON jd.id = r.id
    WHERE r.raw_text IS NOT NULL
    ORDER BY r.scraped_at DESC
  `);

  const candidates: Candidate[] = [];
  const bySource = new Map<string, number>();
  for (const row of result.rows) {
    const extracted = extractPostedDate(String(row.raw_text ?? ''));
    const postedAt = extracted ?? normalizePostedDate(row.posted_at as string | null);
    if (!postedAt) continue;

    const currentRaw = normalizePostedDate(row.posted_at as string | null);
    const currentDetails = normalizePostedDate(row.details_posted_at as string | null);
    if (currentRaw === postedAt && (!row.details_id || currentDetails === postedAt)) continue;

    const source = String(row.source);
    candidates.push({
      id: String(row.id),
      source,
      title: String(row.title ?? ''),
      postedAt,
      currentRaw,
      currentDetails,
      hasDetails: Boolean(row.details_id),
    });
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
    if (candidates.length >= limit) break;
  }

  console.log(`[Posted date backfill] ${apply ? 'Applying' : 'Dry run'} ${candidates.length} candidate(s).`);
  console.log(`[Posted date backfill] Coverage: ${candidates.length} raw_jobs rows; ${candidates.filter(candidate => candidate.hasDetails).length} matching job_details rows.`);
  console.log('[Posted date backfill] By source:', JSON.stringify(Object.fromEntries(bySource), null, 2));
  for (const candidate of candidates.slice(0, 25)) {
    console.log(`- ${candidate.title || candidate.id} (${candidate.source}): ${candidate.postedAt}`);
  }
  if (candidates.length > 25) console.log(`- ... ${candidates.length - 25} more`);

  if (!apply || candidates.length === 0) return;
  await db.batch(candidates.flatMap(candidate => [
    {
      sql: `UPDATE raw_jobs SET posted_at = ? WHERE id = ?`,
      args: [candidate.postedAt, candidate.id],
    },
    {
      sql: `UPDATE job_details SET posted_at = ? WHERE id = ?`,
      args: [candidate.postedAt, candidate.id],
    },
  ]), 'write');
  console.log(`[Posted date backfill] Updated ${candidates.length} record(s) in each matching table.`);
}

main().catch(error => {
  console.error('[Posted date backfill] Failed:', error);
  process.exitCode = 1;
});
