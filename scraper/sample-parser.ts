import { initDb } from './db';
import { parseJobWithAI } from './ai_parser';

// Runs the current prompt (ai_parser.ts) against a random sample of real,
// already-scraped job text — read-only, no DB writes — so a prompt change can
// be eyeballed on real postings before bumping PARSER_VERSION and reparsing
// (and re-billing) anything for real.
//
// Usage: npx tsx sample-parser.ts [N]   (default N=10)

async function main() {
  const n = Number(process.argv[2]) || 10;
  const db = await initDb();

  const result = await db.execute({
    sql: `SELECT id, url, source, raw_text, title FROM raw_jobs ORDER BY RANDOM() LIMIT ?`,
    args: [n],
  });

  if (result.rows.length === 0) {
    console.log('No raw_jobs rows to sample.');
    return;
  }

  console.log(`Sampling ${result.rows.length} job(s) — no DB writes will be made.\n`);

  for (const row of result.rows) {
    const source = row.source as string;
    const url = row.url as string;
    const title = row.title as string | null;
    console.log(`--- ${source} — ${title ?? '(no listing title)'} ---`);
    console.log(url);

    const { data, error } = await parseJobWithAI(row.raw_text as string, title ?? undefined);
    if (error) {
      console.log(`FAILED: ${error}`);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
    console.log('');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
