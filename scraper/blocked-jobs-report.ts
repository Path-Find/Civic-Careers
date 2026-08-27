/**
 * Lists raw_jobs currently marked `blocked` — a bot challenge, an
 * expired-page notice, or a non-rendering portal shell prevented capturing
 * real content. These are excluded from the normal unparsed queue (see
 * getUnparsedJobs in db.ts) and hidden from public listings, so this report
 * is the only way to see them: a manual-review "needs attention" queue.
 *
 *   npx tsx blocked-jobs-report.ts
 */
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

type Row = { id: string; source: string; url: string; title: string | null; scraped_at: string };

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT id, source, url, title, scraped_at
    FROM raw_jobs
    WHERE pending_closing_date_status = 'blocked'
    ORDER BY source, scraped_at DESC
  `);
  const rows = result.rows as unknown as Row[];

  if (rows.length === 0) {
    console.log('[Blocked] Nothing currently blocked.');
    return;
  }

  console.log(`[Blocked] ${rows.length} job(s) need attention (bot challenge, expired page, or non-rendering portal):`);
  const bySource = new Map<string, Row[]>();
  for (const row of rows) {
    const list = bySource.get(row.source) ?? [];
    list.push(row);
    bySource.set(row.source, list);
  }
  for (const [source, sourceRows] of [...bySource.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${source} (${sourceRows.length}):`);
    for (const row of sourceRows) {
      console.log(`  ${row.id} | ${row.title ?? '(no title)'} | ${row.url}`);
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
