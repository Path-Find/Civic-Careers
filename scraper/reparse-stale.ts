import { initDb, countStaleParses, queueStaleParsesForReparse } from './db';
import { PARSER_VERSION } from './ai_parser';

// Finds jobs whose job_details.parser_version predates the current PARSER_VERSION
// (bumped in ai_parser.ts whenever the prompt/model changes) and, with --apply,
// requeues just those for the next `npm run parse` — instead of either leaving
// them stale forever or reparsing (and re-billing) the entire dataset.
//
// Usage:
//   npx tsx reparse-stale.ts          # dry run — prints counts by source only
//   npx tsx reparse-stale.ts --apply  # clears parsed_at so they get reparsed next run

async function main() {
  const apply = process.argv.includes('--apply');
  const db = await initDb();

  const bySource = await countStaleParses(db, PARSER_VERSION);
  const total = bySource.reduce((sum, row) => sum + row.count, 0);

  if (total === 0) {
    console.log(`Nothing stale — every parsed job is already on parser_version ${PARSER_VERSION}.`);
    return;
  }

  console.log(`${total} job(s) parsed under an older prompt version (current: ${PARSER_VERSION}):`);
  for (const row of bySource) {
    console.log(`  ${row.source}: ${row.count}`);
  }

  if (!apply) {
    console.log('\nDry run only — no changes made. Re-run with --apply to requeue these for reparse.');
    return;
  }

  const queued = await queueStaleParsesForReparse(db, PARSER_VERSION);
  console.log(`\nQueued ${queued} job(s) for reparse. Run \`npm run parse\` to process them.`);
}

main().catch(err => { console.error(err); process.exit(1); });
