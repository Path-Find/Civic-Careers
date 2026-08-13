/**
 * Fill missing metadata titles for unparsed raw postings without marking them
 * parsed or exposing their body text.
 *
 *   npx tsx backfill-pending-titles.ts           # dry-run
 *   npx tsx backfill-pending-titles.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { extractRawJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = await initDb();

  const result = await db.execute(`
    SELECT id, source, raw_text
    FROM raw_jobs
    WHERE parsed_at IS NULL AND length(trim(COALESCE(title, ''))) = 0
  `);

  const updates = result.rows.flatMap(row => {
    const title = extractRawJobTitle(String(row.source ?? ''), String(row.raw_text ?? ''));
    return title ? [{ id: String(row.id), source: String(row.source), title }] : [];
  });

  console.log(`[Pending titles] ${APPLY ? 'Applying' : 'Dry run'}: ${updates.length} title(s) recoverable.`);
  const bySource = new Map<string, number>();
  for (const update of updates) bySource.set(update.source, (bySource.get(update.source) ?? 0) + 1);
  console.log('[Pending titles] By source:', JSON.stringify(Object.fromEntries(bySource), null, 2));

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  await db.batch(updates.map(update => ({
    sql: `UPDATE raw_jobs SET title = ? WHERE id = ? AND parsed_at IS NULL AND length(trim(COALESCE(title, ''))) = 0`,
    args: [update.title, update.id],
  })), 'write');
  console.log(`[Pending titles] Updated ${updates.length} raw title(s); rows remain unparsed.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
