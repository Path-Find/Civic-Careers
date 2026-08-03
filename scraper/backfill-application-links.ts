import { initDb } from './db';
import { adpDetailUrl } from './engines/adp';
import { APPLICATION_URL_FIXES } from './source-fixes';
const apply = process.argv.includes('--apply');

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, j.url, raw.url AS raw_url, raw.application_url
    FROM jobs j
    JOIN raw_jobs raw ON raw.id = j.id
  `);
  const candidates = result.rows.map(row => {
    const nextUrl = APPLICATION_URL_FIXES[String(row.id)]
      ?? adpDetailUrl(row.application_url)
      ?? adpDetailUrl(row.raw_url);
    return {
      id: String(row.id),
      source: String(row.source),
      currentUrl: String(row.url ?? ''),
      nextUrl,
    };
  }).filter(row => row.nextUrl && row.currentUrl !== row.nextUrl) as Array<{
    id: string;
    source: string;
    currentUrl: string;
    nextUrl: string;
  }>;

  console.log(`[Application link backfill] ${apply ? 'Applying' : 'Dry run'} ${candidates.length} direct application link(s).`);
  for (const row of candidates.slice(0, 40)) console.log(JSON.stringify(row));
  if (!apply || candidates.length === 0) return;

  await db.batch(candidates.flatMap(row => [
    { sql: 'UPDATE jobs SET url = ? WHERE id = ?', args: [row.nextUrl, row.id] },
    { sql: 'UPDATE raw_jobs SET application_url = ? WHERE id = ?', args: [row.nextUrl, row.id] },
  ]), 'write');
  console.log(`[Application link backfill] Updated ${candidates.length} job(s).`);
}

main().catch(error => {
  console.error('[Application link backfill] Failed:', error);
  process.exitCode = 1;
});
