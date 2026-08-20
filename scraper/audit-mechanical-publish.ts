/**
 * Retroactively re-check every published job — mechanical (parser_version =
 * 0) and AI-parsed alike — against the current publish-gate rules, and
 * remove any that fail. The same field-gluing bug that hit tonight's
 * mechanical backfill turned out to already be live in older AI-parsed rows
 * too (parser_version 3, 8, and null), so this checks the whole table, not
 * just tonight's batch.
 *
 *   npx tsx audit-mechanical-publish.ts           # dry-run
 *   npx tsx audit-mechanical-publish.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { getPublishBlockReason } from './publish-gate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  job_title: string;
  department: string | null;
  hours: string | null;
  salary_range: string | null;
  location: string | null;
  parser_version: number | null;
};

async function main() {
  const db = await initDb();

  const result = await db.execute(`
    SELECT id, job_title, department, hours, salary_range, location, parser_version
    FROM job_details
  `);
  const rows = result.rows as unknown as Row[];

  const bad: { id: string; reason: string; parser_version: number | null }[] = [];
  for (const row of rows) {
    const reason = getPublishBlockReason({
      title: row.job_title,
      department: row.department,
      hours: row.hours,
      salary: row.salary_range,
      location: row.location,
    });
    if (reason) bad.push({ id: row.id, reason, parser_version: row.parser_version });
  }

  const byReason = new Map<string, number>();
  const byVersion = new Map<string, number>();
  for (const { reason, parser_version } of bad) {
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    const v = String(parser_version);
    byVersion.set(v, (byVersion.get(v) ?? 0) + 1);
  }

  console.log(`[Audit] Checked ${rows.length} row(s) total. ${bad.length} fail the current gate.`);
  console.log('[Audit] By reason:', JSON.stringify(Object.fromEntries(byReason), null, 2));
  console.log('[Audit] By parser_version:', JSON.stringify(Object.fromEntries(byVersion), null, 2));

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to remove them.');
    return;
  }

  const ids = bad.map(b => b.id);
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500);
    await db.execute({
      sql: `DELETE FROM job_details WHERE id IN (${batch.map(() => '?').join(',')})`,
      args: batch,
    });
    await db.execute({
      sql: `DELETE FROM jobs WHERE id IN (${batch.map(() => '?').join(',')})`,
      args: batch,
    });
  }
  console.log(`[Audit] Removed ${ids.length} job(s) from jobs + job_details.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
