/**
 * Deactivate active jobs whose stored closing date has passed.
 *
 *   npx tsx backfill-expired-jobs.ts          # dry-run
 *   npx tsx backfill-expired-jobs.ts --apply  # write
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { deactivateExpiredJobs } from './db';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `SELECT j.id, j.source, d.job_title, d.closing_date
          FROM jobs j
          JOIN job_details d ON d.id = j.id
          WHERE j.is_active = 1
            AND d.closing_date IS NOT NULL
            AND TRIM(d.closing_date) <> ''
            AND SUBSTR(d.closing_date, 1, 10) < ?
          ORDER BY d.closing_date, j.source, d.job_title`,
    args: [TODAY],
  });

  console.log(`[Expired jobs] Today: ${TODAY}. Found ${result.rows.length} active job(s) past their closing date.`);
  for (const row of result.rows) {
    console.log(`- ${row.source} | ${row.job_title} | closed ${row.closing_date} | ${row.id}`);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to deactivate these jobs.');
    return;
  }

  const updated = await deactivateExpiredJobs(db, TODAY);
  console.log(`[Expired jobs] Deactivated ${updated} job(s).`);
}

main().catch(error => {
  console.error('[Expired jobs] Failed:', error);
  process.exitCode = 1;
});
