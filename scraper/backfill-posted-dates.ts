/**
 * Extract posted dates from raw_text (Date Posted / Posted: / Posted on / …)
 * into raw_jobs.posted_at and job_details.posted_at.
 *
 * Only fills empty fields — never overwrites an existing posted_at.
 *
 *   npx tsx backfill-posted-dates.ts           # dry-run
 *   npx tsx backfill-posted-dates.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { extractPostedDate, extractRecentRelativePostedDate, normalizePostedDate } from './posted-date';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Candidate = {
  id: string;
  source: string;
  title: string;
  postedAt: string;
  fillRaw: boolean;
  fillDetails: boolean;
};

async function main() {
  const db = await initDb();

  const pageSize = 200;
  const rows: any[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const result = await db.execute({
      sql: `
        SELECT r.id, r.source, r.title, r.raw_text, r.posted_at,
               jd.id AS details_id, jd.posted_at AS details_posted_at, jd.job_title, jd.description
        FROM raw_jobs r
        LEFT JOIN job_details jd ON jd.id = r.id
        WHERE (r.posted_at IS NULL OR r.posted_at = '')
           OR (jd.id IS NOT NULL AND (jd.posted_at IS NULL OR jd.posted_at = ''))
        ORDER BY r.id
        LIMIT ? OFFSET ?
      `,
      args: [pageSize, offset],
    });
    rows.push(...result.rows);
    if (result.rows.length < pageSize) break;
  }

  const candidates: Candidate[] = [];
  const bySource = new Map<string, number>();
  let scanned = 0;
  let alreadyComplete = 0;
  let extractableButFilled = 0;

  for (const row of rows) {
    scanned += 1;
    const extracted = extractPostedDate(String(row.raw_text ?? ''))
      || extractRecentRelativePostedDate(String(row.raw_text ?? ''))
      || extractPostedDate(String(row.description ?? ''))
      || extractRecentRelativePostedDate(String(row.description ?? ''));
    if (!extracted) continue;

    const currentRaw = normalizePostedDate(row.posted_at as string | null);
    const currentDetails = normalizePostedDate(row.details_posted_at as string | null);
    const fillRaw = !currentRaw;
    const fillDetails = Boolean(row.details_id) && !currentDetails;

    if (!fillRaw && !fillDetails) {
      extractableButFilled += 1;
      continue;
    }

    // If one side already has a different date, leave it — only fill empties.
    if (currentRaw && currentRaw !== extracted && !fillDetails) {
      alreadyComplete += 1;
      continue;
    }
    if (currentDetails && currentDetails !== extracted && !fillRaw) {
      alreadyComplete += 1;
      continue;
    }

    const source = String(row.source);
    candidates.push({
      id: String(row.id),
      source,
      title: String(row.job_title ?? row.title ?? ''),
      postedAt: extracted,
      fillRaw,
      fillDetails,
    });
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }

  console.log(`[Posted date backfill] Scanned ${scanned} candidate raw_jobs.`);
  console.log(`[Posted date backfill] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length} row(s) to fill.`);
  console.log(`[Posted date backfill] Already had a date (extractable but filled): ${extractableButFilled}.`);
  console.log('[Posted date backfill] By source:', JSON.stringify(Object.fromEntries([...bySource.entries()].sort((a, b) => b[1] - a[1])), null, 2));
  for (const candidate of candidates.slice(0, 30)) {
    console.log(`- ${candidate.postedAt} | ${candidate.source} | ${candidate.title || candidate.id}`);
  }
  if (candidates.length > 30) console.log(`- … ${candidates.length - 30} more`);

  if (!APPLY || candidates.length === 0) {
    if (!APPLY) console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  for (const candidate of candidates) {
    if (candidate.fillRaw) {
      await db.execute({
        sql: `UPDATE raw_jobs SET posted_at = ? WHERE id = ? AND (posted_at IS NULL OR posted_at = '')`,
        args: [candidate.postedAt, candidate.id],
      });
    }
    if (candidate.fillDetails) {
      await db.execute({
        sql: `UPDATE job_details SET posted_at = ? WHERE id = ? AND (posted_at IS NULL OR posted_at = '')`,
        args: [candidate.postedAt, candidate.id],
      });
    }
    updated += 1;
  }
  console.log(`[Posted date backfill] Updated ${updated} record(s).`);

}

main().catch(error => {
  console.error('[Posted date backfill] Failed:', error);
  process.exitCode = 1;
});
