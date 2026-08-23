/**
 * Normalize source and parsed titles in both current and archive stores.
 *
 * Usage:
 *   npx tsx backfill-normalize-titles.ts           # dry-run
 *   npx tsx backfill-normalize-titles.ts --apply   # write
 *   npx tsx backfill-normalize-titles.ts --active-only
 *   npx tsx backfill-normalize-titles.ts --source="University of Northern British Columbia"
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');
const CURRENT_ONLY = process.argv.includes('--current-only');
const SOURCE_FILTER = process.argv.find(argument => argument.startsWith('--source='))?.slice('--source='.length) ?? '';

type QueryRow = Record<string, unknown>;
type Statement = string | { sql: string; args?: unknown[] };
type Execute = (statement: Statement) => Promise<{ rows: QueryRow[] }>;
type Change = {
  id: string;
  source: string;
  is_active: number;
  field: 'raw' | 'details';
  from: string;
  to: string;
};

const QUERY = `
  SELECT j.id, j.source, j.is_active, r.title AS raw_title, d.job_title AS detail_title
  FROM jobs j
  LEFT JOIN raw_jobs r ON r.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
  WHERE ((r.title IS NOT NULL AND trim(r.title) != '')
     OR (d.job_title IS NOT NULL AND trim(d.job_title) != ''))
     ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
     ${SOURCE_FILTER ? `AND j.source = '${SOURCE_FILTER.replace(/'/g, "''")}'` : ''}
  ORDER BY j.source, j.id
`;

function findChanges(rows: QueryRow[]): Change[] {
  return rows.flatMap(row => {
    const source = String(row.source ?? '');
    const changes: Change[] = [];
    for (const [field, value] of [['raw', row.raw_title], ['details', row.detail_title]] as const) {
      const from = String(value ?? '');
      if (!from.trim()) continue;
      const to = normalizeSourceJobTitle(source, from);
      if (from !== to) changes.push({
        id: String(row.id),
        source,
        is_active: Number(row.is_active ?? 0),
        field,
        from,
        to,
      });
    }
    return changes;
  });
}

function statementFor(change: Change): { sql: string; args: unknown[] } {
  return {
    sql: change.field === 'raw'
      ? 'UPDATE raw_jobs SET title = ? WHERE id = ?'
      : 'UPDATE job_details SET job_title = ? WHERE id = ?',
    args: [change.to, change.id],
  };
}

async function main() {
  const db = await initDb();
  const stores: Array<{
    label: string;
    read: Execute;
    write: (changes: Change[]) => Promise<void>;
  }> = [{
    label: 'current',
    read: statement => db.execute(statement),
    write: async changes => {
      for (let i = 0; i < changes.length; i += 500) {
        await db.batch(changes.slice(i, i + 500).map(statementFor), 'write');
      }
    },
  }];

  const archiveExecute = (db as unknown as { executeArchive?: Execute }).executeArchive;
  if (archiveExecute && !CURRENT_ONLY) {
    stores.push({
      label: 'archive',
      read: statement => archiveExecute.call(db, statement),
      write: async changes => {
        for (const change of changes) await archiveExecute.call(db, statementFor(change));
      },
    });
  }

  for (const store of stores) {
    const result = await store.read(QUERY);
    const changes = findChanges(result.rows);
    console.log(`[Title normalization:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} field change(s) across ${result.rows.length} row(s).`);
    console.log(`[Title normalization:${store.label}] Active among changes: ${changes.filter(change => change.is_active === 1).length}`);
    for (const change of changes.slice(0, 40)) {
      console.log(`  [${change.field}] ${change.source}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`);
    }
    if (APPLY && changes.length) await store.write(changes);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
