/**
 * Extract posted dates from raw_text (Date Posted / Posted: / Posted on / …)
 * into raw_jobs.posted_at and job_details.posted_at.
 *
 * Only fills empty fields — never overwrites an existing posted_at.
 *
 *   npx tsx backfill-posted-dates.ts           # dry-run
 *   npx tsx backfill-posted-dates.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractPostedDate, normalizePostedDate } from './posted-date';

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
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT r.id, r.source, r.title, r.raw_text, r.posted_at,
           jd.id AS details_id, jd.posted_at AS details_posted_at, jd.job_title
    FROM raw_jobs r
    LEFT JOIN job_details jd ON jd.id = r.id
    WHERE r.raw_text IS NOT NULL AND r.raw_text != ''
  `);

  const candidates: Candidate[] = [];
  const bySource = new Map<string, number>();
  let scanned = 0;
  let alreadyComplete = 0;
  let extractableButFilled = 0;

  for (const row of result.rows) {
    scanned += 1;
    const extracted = extractPostedDate(String(row.raw_text ?? ''));
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

  console.log(`[Posted date backfill] Scanned ${scanned} raw_jobs.`);
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

  const outPath = path.resolve(__dirname, '../docs/posted-date-backfill-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Posted date backfill — 2026-08-04',
    '',
    'Extracted calendar posted dates from `raw_jobs.raw_text` into empty `posted_at` fields.',
    '',
    `Updated: ${updated} rows.`,
    '',
    '## Patterns',
    '',
    '- `Date Posted:` / `Date Posted (YYYY/MM/DD):` / `Date Posted By`',
    '- `Posting Date:`',
    '- `Posted:` / `Posted on` / `Posted On:` (with optional weekday)',
    '- Two-digit years (`07/13/26` → `2026-07-13`)',
    '- Skips relative Workday noise (`Posted 30+ Days Ago`)',
    '',
    '## By source',
    '',
    ...[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `- ${s}: ${n}`),
    '',
    '## Job IDs',
    '',
    '```',
    ...candidates.map(c => `${c.id}\t${c.postedAt}`),
    '```',
    '',
  ].join('\n'));
  console.log(`[Posted date backfill] Wrote ${outPath}`);
}

main().catch(error => {
  console.error('[Posted date backfill] Failed:', error);
  process.exitCode = 1;
});
