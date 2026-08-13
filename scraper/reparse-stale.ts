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
  const requestedIds = new Set(
    (process.argv.find(argument => argument.startsWith('--ids='))?.slice('--ids='.length) ?? '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean),
  );

  if (requestedIds.size > 0) {
    const placeholders = [...requestedIds].map(() => '?').join(',');
    const result = await db.execute({
      sql: `SELECT r.id, r.parsed_at, j.is_active
            FROM raw_jobs r
            LEFT JOIN jobs j ON j.id = r.id
            WHERE r.id IN (${placeholders})
            ORDER BY r.id`,
      args: [...requestedIds],
    });
    console.log(`[Reparse] Selected ${[...requestedIds].join(', ')}; found ${result.rows.length} row(s).`);
    for (const row of result.rows) console.log(`  ${row.id}: parsed_at=${row.parsed_at ?? 'NULL'}, active=${row.is_active ?? 'pending'}`);
    if (!apply) {
      console.log('Dry run only — no changes made. Re-run with --ids=... --apply to queue exactly these rows.');
      return;
    }
    const queued = await db.execute({
      sql: `UPDATE raw_jobs SET parsed_at = NULL WHERE id IN (${placeholders})`,
      args: [...requestedIds],
    });
    await db.execute({
      sql: `DELETE FROM parse_failures WHERE id IN (${placeholders})`,
      args: [...requestedIds],
    });
    console.log(`[Reparse] Queued ${queued.rowsAffected ?? 0} row(s). Run PARSE_IDS=${[...requestedIds].join(',')} npm run parse.`);
    return;
  }

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
