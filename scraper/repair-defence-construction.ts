/** Repair GC-syndicated Defence Construction Canada rows without re-scraping. */
import dotenv from 'dotenv';
import { initDb } from './db';
import { canonicalSourceForRaw, defenceConstructionApplicationUrl, isDefenceConstructionCanadaPosting } from './source-fixes';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const QUERY = `SELECT r.id, r.url, r.application_url, r.source, r.raw_text FROM raw_jobs r WHERE r.raw_text IS NOT NULL AND TRIM(r.raw_text) <> ''`;

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: unknown) => Promise<{ rows: any[] }> };
  const stores = [
    { name: 'current', rows: (await db.execute(QUERY)).rows },
    ...(archive.executeArchive ? [{ name: 'archive', rows: (await archive.executeArchive(QUERY)).rows }] : []),
  ];
  const repairs = stores.flatMap(store => store.rows
    .filter((row: any) => row.source === 'Government of Canada' && isDefenceConstructionCanadaPosting(String(row.raw_text ?? '')))
    .map((row: any) => ({ ...row, store: store.name, source: canonicalSourceForRaw(row.source, row.raw_text), applicationUrl: defenceConstructionApplicationUrl(row.raw_text) ?? row.application_url })));
  console.log(JSON.stringify({ apply: APPLY, repairs: repairs.length, examples: repairs.slice(0, 20) }, null, 2));
  if (!APPLY) return;
  for (const row of repairs) {
    const statements = [
      { sql: 'UPDATE raw_jobs SET source = ?, application_url = COALESCE(?, application_url) WHERE id = ?', args: [row.source, row.applicationUrl, row.id] },
      { sql: 'UPDATE jobs SET source = ?, url = COALESCE(?, url) WHERE id = ?', args: [row.source, row.applicationUrl, row.id] },
    ];
    for (const statement of statements) {
      if (row.store === 'archive' && archive.executeArchive) await archive.executeArchive(statement);
      else await db.execute(statement);
    }
  }
  console.log(`Repaired ${repairs.length} Defence Construction Canada row(s).`);
}

main().catch(error => { console.error('[DCC repair] Failed:', error); process.exitCode = 1; });
