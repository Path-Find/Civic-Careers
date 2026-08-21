/**
 * Apply closing-date status to active rows. Existing confirmed values are
 * never overwritten; active rows without a usable date receive the required
 * Until filled fallback.
 *
 *   npx tsx backfill-pending-closing-status.ts       # read-only dry run
 *   npx tsx backfill-pending-closing-status.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { normalizeActiveClosingDateStatus } from './closing-date';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const limitArgument = process.argv.find(value => value.startsWith('--limit='));
const LIMIT = Math.max(1, Number(limitArgument?.split('=')[1] ?? 10000));

type Row = {
  id: string;
  source: string;
  title: string;
  raw_text: string;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
};

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `
      SELECT r.id, r.source, r.title, r.raw_text,
             r.pending_closing_date, r.pending_closing_date_status
      FROM raw_jobs r
      JOIN jobs j ON j.id = r.id
      WHERE j.is_active = 1
        AND (r.pending_closing_date IS NULL OR TRIM(r.pending_closing_date) = '')
        AND COALESCE(r.pending_closing_date_status, 'not_checked') IN ('not_checked', 'not_listed', 'invalid')
      ORDER BY r.source, r.id
      LIMIT ?
    `,
    args: [LIMIT],
  });

  const candidates = (result.rows as unknown as Row[]).flatMap(row => {
    const status = normalizeActiveClosingDateStatus(String(row.raw_text ?? ''));
    return [{
      ...row,
      closingDate: status.date,
      closingDateStatus: status.status,
    }];
  });

  const counts = candidates.reduce<Record<string, number>>((summary, row) => {
    summary[row.closingDateStatus] = (summary[row.closingDateStatus] ?? 0) + 1;
    return summary;
  }, {});
  console.log(`[Pending closing status] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length} active row(s) needing closing metadata; ${JSON.stringify(counts)}.`);
  for (const row of candidates.slice(0, 20)) {
    console.log(JSON.stringify({ id: row.id, source: row.source, title: row.title, status: row.closingDateStatus, date: row.closingDate }));
  }
  if (!APPLY || candidates.length === 0) return;

  await db.batch(candidates.map(row => ({
    sql: `UPDATE raw_jobs
          SET pending_closing_date = ?, pending_closing_date_status = ?
          WHERE id = ?
            AND (pending_closing_date IS NULL OR TRIM(pending_closing_date) = '')
            AND COALESCE(pending_closing_date_status, 'not_checked') IN ('not_checked', 'not_listed', 'invalid')`,
    args: [row.closingDate, row.closingDateStatus, row.id],
  })), 'write');
  console.log(`[Pending closing status] Updated ${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Pending closing status] Failed:', error);
  process.exitCode = 1;
});
