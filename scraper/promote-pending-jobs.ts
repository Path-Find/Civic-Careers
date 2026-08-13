/**
 * Publish unparsed raw postings as shell listings.
 *
 *   npx tsx promote-pending-jobs.ts           # dry-run
 *   npx tsx promote-pending-jobs.ts --apply
 */
import dotenv from 'dotenv';
import { initDb, promotePendingJobs } from './db';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = await initDb();

  const pending = await db.execute(`
    SELECT COUNT(*) AS count
    FROM raw_jobs r
    LEFT JOIN jobs j ON j.id = r.id
    WHERE r.parsed_at IS NULL AND j.id IS NULL
  `);
  const count = Number(pending.rows[0]?.count ?? 0);
  console.log(`[Pending listings] ${APPLY ? 'Applying' : 'Dry run'}: ${count} shell listing(s).`);

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  const promoted = await promotePendingJobs(db);
  console.log(`[Pending listings] Promoted ${promoted} shell listing(s); raw jobs remain unparsed.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
