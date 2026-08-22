/** Normalize unambiguous employment-type values in current and archive. */
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeEmploymentType } from './validate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const KNOWN = /full[-\s]?time|part[-\s]?time|permanent|contract|temporary|casual|seasonal|on[-\s]?call|supply|substitute|continuing|indeterminate|fixed[-\s]?term/i;

type Row = { id: string; source: string; employment_type: string; store: 'current' | 'archive' };

const QUERY = `
  SELECT j.id, j.source, d.employment_type
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  WHERE d.employment_type IS NOT NULL AND TRIM(d.employment_type) <> ''
`;

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: unknown) => Promise<{ rows: any[] }> };
  const current = (await db.execute(QUERY)).rows.map((row: any) => ({ ...row, store: 'current' as const }));
  const archived = archive.executeArchive
    ? (await archive.executeArchive(QUERY)).rows.map((row: any) => ({ ...row, store: 'archive' as const }))
    : [];
  const changes = ([...current, ...archived] as Row[]).flatMap(row => {
    const from = String(row.employment_type ?? '').trim();
    if (!KNOWN.test(from)) return [];
    const to = normalizeEmploymentType(from);
    return to === from ? [] : [{ ...row, from, to }];
  });
  console.log(JSON.stringify({ apply: APPLY, readOnly: !APPLY, scanned: current.length + archived.length, changes: changes.length, examples: changes.slice(0, 100) }, null, 2));
  if (!APPLY) return;
  for (const change of changes) {
    const statement = { sql: 'UPDATE job_details SET employment_type = ? WHERE id = ?', args: [change.to, change.id] };
    if (change.store === 'archive' && archive.executeArchive) await archive.executeArchive(statement);
    else await db.execute(statement);
  }
  console.log(`Normalized ${changes.length} employment type value(s).`);
}

main().catch(error => { console.error('[Employment type normalize] Failed:', error); process.exitCode = 1; });
