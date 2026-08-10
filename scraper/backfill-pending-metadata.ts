/**
 * Add only obvious at-a-glance metadata to pending listings.
 * Rows remain unparsed and their body text remains hidden.
 *
 *   npx tsx backfill-pending-metadata.ts           # dry-run
 *   npx tsx backfill-pending-metadata.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { extractPendingMetadata } from './pending-metadata';
import { extractClosingDateStatus } from './closing-date';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  await db.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_salary_text TEXT`).catch(error => {
    if (!/duplicate column/i.test(String(error?.message ?? error))) throw error;
  });
  await db.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_is_student INTEGER`).catch(error => {
    if (!/duplicate column/i.test(String(error?.message ?? error))) throw error;
  });
  await db.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_closing_date_status TEXT DEFAULT 'not_checked'`).catch(error => {
    if (!/duplicate column/i.test(String(error?.message ?? error))) throw error;
  });

  const result = await db.execute(`
    SELECT r.id, r.title, r.raw_text, r.pending_closing_date
    FROM raw_jobs r JOIN jobs j ON j.id = r.id
    WHERE r.parsed_at IS NULL AND j.is_active = 1
  `);
  const updates = result.rows.map(row => {
    const closing = extractClosingDateStatus(String(row.raw_text ?? ''));
    const existingClosingDate = String(row.pending_closing_date ?? '').trim();
    return {
      id: String(row.id),
      ...extractPendingMetadata(String(row.title ?? ''), String(row.raw_text ?? '')),
      closingDate: existingClosingDate || closing.date,
      closingDateStatus: existingClosingDate || closing.date ? 'known' : closing.status,
    };
  });
  const salaryCount = updates.filter(row => row.salaryText).length;
  const studentCount = updates.filter(row => row.isStudent === 1).length;
  const closingCounts = updates.reduce<Record<string, number>>((counts, row) => {
    counts[row.closingDateStatus] = (counts[row.closingDateStatus] ?? 0) + 1;
    return counts;
  }, {});
  console.log(`[Pending metadata] ${APPLY ? 'Applying' : 'Dry run'}: ${salaryCount} salary text(s), ${studentCount} high-confidence student flag(s), closing status ${Object.entries(closingCounts).map(([status, count]) => `${status}=${count}`).join(', ')}.`);
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  await db.batch(updates.map(row => ({
    sql: `UPDATE raw_jobs
          SET pending_salary_text = ?, pending_is_student = ?, pending_closing_date = COALESCE(NULLIF(TRIM(pending_closing_date), ''), ?), pending_closing_date_status = ?
          WHERE id = ? AND parsed_at IS NULL`,
    args: [row.salaryText, row.isStudent, row.closingDate, row.closingDateStatus, row.id],
  })), 'write');
  console.log(`[Pending metadata] Updated ${updates.length} pending rows; all remain unparsed.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
