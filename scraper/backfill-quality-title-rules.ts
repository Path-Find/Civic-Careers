/** Repair only stored titles that match the quality gate's metadata signals. */
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });
const APPLY = process.argv.includes('--apply');
type Statement = string | { sql: string; args: unknown[] };
type Execute = (statement: Statement) => Promise<{ rows: Array<Record<string, unknown>> }>;
type Change = { id: string; source: string; field: 'raw' | 'details'; from: string; to: string };

const FLAGGED_TITLE = /\b(?:revised|repost(?:ed|ing)?|vacanc(?:y|ies)|(?:several|multiple|\d+)\s+positions?|positions?\s+available|full[- ]?time|part[- ]?time|temporary|casual|permanent|contract|regular\s+part[- ]?time|r[ée]affichage)\b/i;
const QUERY = `SELECT j.id, j.source, r.title AS raw_title, d.job_title AS detail_title
               FROM jobs j LEFT JOIN raw_jobs r ON r.id=j.id LEFT JOIN job_details d ON d.id=j.id`;

function changes(rows: Record<string, unknown>[]): Change[] {
  return rows.flatMap(row => (['raw', 'details'] as const).flatMap(field => {
    const from = String(field === 'raw' ? row.raw_title ?? '' : row.detail_title ?? '').trim();
    if (!from || !FLAGGED_TITLE.test(from)) return [];
    const to = normalizeSourceJobTitle(String(row.source ?? ''), from);
    return to && to !== from ? [{ id: String(row.id), source: String(row.source), field, from, to }] : [];
  }));
}

async function main() {
  const db = await initDb();
  const archive = db as unknown as { executeArchive?: Execute; batchArchive?: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> };
  const stores: Array<{ label: string; read: Execute; write: (rows: Change[]) => Promise<unknown> }> = [{
    label: 'current', read: statement => db.execute(statement),
    write: rows => db.batch(rows.map(row => ({ sql: row.field === 'raw' ? 'UPDATE raw_jobs SET title=? WHERE id=?' : 'UPDATE job_details SET job_title=? WHERE id=?', args: [row.to, row.id] })), 'write'),
  }];
  if (archive.executeArchive && archive.batchArchive) stores.push({
    label: 'archive', read: statement => archive.executeArchive!(statement),
    write: rows => archive.batchArchive!(rows.map(row => ({ sql: row.field === 'raw' ? 'UPDATE raw_jobs SET title=? WHERE id=?' : 'UPDATE job_details SET job_title=? WHERE id=?', args: [row.to, row.id] }))),
  });
  for (const store of stores) {
    const found = changes((await store.read(QUERY)).rows);
    console.log(`[Quality title rules:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${found.length} field change(s) across ${new Set(found.map(row => row.id)).size} row(s).`);
    for (const row of found.slice(0, 40)) console.log(JSON.stringify(row));
    if (APPLY && found.length) await store.write(found);
  }
}
main().catch(error => { console.error('[Quality title rules] Failed:', error); process.exitCode = 1; });
