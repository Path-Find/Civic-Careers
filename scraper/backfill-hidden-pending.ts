/**
 * Recover source-backed application deadlines from currently hidden parsed
 * jobs, then put a bounded batch back into the pending-details queue.
 *
 *   npx tsx backfill-hidden-pending.ts                 # dry run
 *   npx tsx backfill-hidden-pending.ts --limit=100 --apply
 *
 * The existing job_details row is retained for recovery. Clearing
 * raw_jobs.parsed_at is the pending state; the API hides the parsed body while
 * the row waits for the normal parser queue.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractClosingDateStatus } from './closing-date';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const limitArgument = process.argv.find(value => value.startsWith('--limit='));
const LIMIT = Math.max(1, Math.min(100, Number(limitArgument?.split('=')[1] ?? 100)));

type Row = {
  id: string;
  public_id: number;
  source: string;
  title: string | null;
  raw_text: string;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  parsed_at: string | null;
  verified_at: string | null;
  closing_date: string | null;
  display_title: string | null;
  public_url: string | null;
};

async function main() {
  if (!process.env.NEON_CURRENT_DATABASE_URL || !process.env.NEON_ARCHIVE_DATABASE_URL) {
    throw new Error('This production backfill requires explicit NEON_CURRENT_DATABASE_URL and NEON_ARCHIVE_DATABASE_URL values; refusing to write through the local Turso fallback.');
  }
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.public_id, j.source, j.verified_at,
           r.title, r.raw_text, r.pending_closing_date,
           r.pending_closing_date_status, r.parsed_at,
           d.closing_date,
           COALESCE(NULLIF(TRIM(d.job_title), ''), NULLIF(TRIM(r.title), '')) AS display_title,
           COALESCE(NULLIF(TRIM(r.application_url), ''), NULLIF(TRIM(r.url), ''), NULLIF(TRIM(j.url), '')) AS public_url
    FROM jobs j
    JOIN raw_jobs r ON r.id = j.id
    JOIN job_details d ON d.id = j.id
    WHERE j.is_active = 1
      AND (d.closing_date IS NULL OR TRIM(d.closing_date) = '')
      AND (r.pending_closing_date IS NULL OR TRIM(r.pending_closing_date) = '')
      AND COALESCE(r.pending_closing_date_status, 'not_checked') = 'not_checked'
      AND d.job_title <> 'Skip to Main Content'
      AND COALESCE(NULLIF(TRIM(d.job_title), ''), NULLIF(TRIM(r.title), '')) IS NOT NULL
      AND COALESCE(NULLIF(TRIM(r.application_url), ''), NULLIF(TRIM(r.url), ''), NULLIF(TRIM(j.url), '')) IS NOT NULL
      AND LOWER(COALESCE(NULLIF(TRIM(d.job_title), ''), NULLIF(TRIM(r.title), ''))) NOT LIKE 'skip to%'
    ORDER BY j.public_id
  `);

  const today = new Date().toISOString().slice(0, 10);
  const candidates = (result.rows as unknown as Row[]).flatMap(row => {
    const closing = extractClosingDateStatus(String(row.raw_text ?? ''));
    if (!closing.date || closing.date < today) return [];
    return [{ ...row, closingDate: closing.date }];
  }).slice(0, LIMIT);

  console.log(`[Hidden deadline backfill] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length}/${LIMIT} candidate(s), today=${today}.`);
  for (const row of candidates.slice(0, 20)) {
    console.log(JSON.stringify({ public_id: row.public_id, source: row.source, title: row.display_title, closing_date: row.closingDate }));
  }

  if (!APPLY || candidates.length === 0) {
    if (!APPLY) console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  await db.batch(candidates.flatMap(row => {
    const before = JSON.stringify({
      pending_closing_date: row.pending_closing_date,
      pending_closing_date_status: row.pending_closing_date_status,
      parsed_at: row.parsed_at,
      verified_at: row.verified_at,
      closing_date: row.closing_date,
    });
    const after = JSON.stringify({
      pending_closing_date: row.closingDate,
      pending_closing_date_status: 'known',
      parsed_at: null,
      verified_at: null,
      closing_date: row.closing_date,
    });
    return [
      {
        sql: `INSERT INTO manual_review_changes (job_id, note, before_json, after_json)
              VALUES (?, ?, ?, ?)`,
        args: [row.id, 'Recovered source-backed application deadline and re-queued for pending-details visibility', before, after],
      },
      {
        sql: `UPDATE raw_jobs
              SET pending_closing_date = ?, pending_closing_date_status = 'known', parsed_at = NULL
              WHERE id = ?
                AND (pending_closing_date IS NULL OR TRIM(pending_closing_date) = '')
                AND COALESCE(pending_closing_date_status, 'not_checked') = 'not_checked'`,
        args: [row.closingDate, row.id],
      },
      {
        sql: `UPDATE jobs SET verified_at = NULL WHERE id = ? AND is_active = 1`,
        args: [row.id],
      },
    ];
  }), 'write');

  const ids = candidates.map(row => row.id);
  const verification = await db.execute({
    sql: `SELECT COUNT(*) AS count
          FROM jobs j
          JOIN raw_jobs r ON r.id = j.id
          WHERE j.is_active = 1
            AND j.id IN (${ids.map(() => '?').join(',')})
            AND r.pending_closing_date_status = 'known'
            AND r.pending_closing_date IS NOT NULL
            AND r.parsed_at IS NULL`,
    args: ids,
  });
  const verified = Number(verification.rows[0]?.count ?? 0);
  if (verified !== candidates.length) throw new Error(`Verification failed: ${verified}/${candidates.length} rows are pending with known dates.`);
  console.log(`[Hidden deadline backfill] Applied and verified ${verified}/${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Hidden deadline backfill] Failed:', error);
  process.exitCode = 1;
});
