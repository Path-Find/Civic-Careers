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

  const result = await db.execute(`
    SELECT r.id, r.title, r.raw_text
    FROM raw_jobs r JOIN jobs j ON j.id = r.id
    WHERE r.parsed_at IS NULL AND j.is_active = 1
  `);
  const updates = result.rows.map(row => ({
    id: String(row.id),
    ...extractPendingMetadata(String(row.title ?? ''), String(row.raw_text ?? '')),
  }));
  const salaryCount = updates.filter(row => row.salaryText).length;
  const studentCount = updates.filter(row => row.isStudent === 1).length;
  console.log(`[Pending metadata] ${APPLY ? 'Applying' : 'Dry run'}: ${salaryCount} salary text(s), ${studentCount} high-confidence student flag(s).`);
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  await db.batch(updates.map(row => ({
    sql: `UPDATE raw_jobs SET pending_salary_text = ?, pending_is_student = ? WHERE id = ? AND parsed_at IS NULL`,
    args: [row.salaryText, row.isStudent, row.id],
  })), 'write');
  console.log(`[Pending metadata] Updated ${updates.length} pending rows; all remain unparsed.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
