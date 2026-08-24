/**
 * Apply only explicitly selected source-scoped title rules.
 *
 * Dry run:
 *   npx tsx backfill-scoped-title-rules.ts --source="Queen's University"
 * Apply current rows after reviewing the dry run:
 *   npx tsx backfill-scoped-title-rules.ts --source="Queen's University" --source="City of Oshawa" --apply
 *
 * Archive rows require an explicit --include-archive because they never affect
 * the public catalogue and should be repaired after current rows are checked.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { applyParserTitleRules, parserContext } from './parser-rules';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const INCLUDE_ARCHIVE = process.argv.includes('--include-archive');
const SOURCES = process.argv
  .filter(argument => argument.startsWith('--source='))
  .map(argument => argument.slice('--source='.length))
  .filter(Boolean);

type Row = {
  id: string;
  source: string;
  raw_title: string | null;
  detail_title: string | null;
  raw_text: string | null;
};

type Change = {
  id: string;
  source: string;
  field: 'raw' | 'details';
  from: string;
  to: string;
  ruleIds: string[];
};

const QUERY = `
  SELECT j.id, j.source, raw.title AS raw_title, raw.raw_text,
    d.job_title AS detail_title
  FROM jobs j
  LEFT JOIN raw_jobs raw ON raw.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
  WHERE j.source IN (${SOURCES.map(source => `'${source.replace(/'/g, "''")}'`).join(', ')})
  ORDER BY j.source, j.id
`;

function changesFor(row: Row): Change[] {
  const context = parserContext(row.source);
  return (['raw', 'details'] as const).flatMap(field => {
    const from = String(field === 'raw' ? row.raw_title ?? '' : row.detail_title ?? '');
    if (!from.trim()) return [];
    const proposal = applyParserTitleRules(context, from, row.raw_text);
    if (!proposal.ruleIds.includes('source.title.normalize-source-metadata') || proposal.title === from) return [];
    return [{ id: row.id, source: row.source, field, from, to: proposal.title, ruleIds: proposal.ruleIds }];
  });
}

async function main() {
  if (SOURCES.length === 0) throw new Error('Refusing to run without at least one explicit --source=... filter.');
  if (APPLY && SOURCES.includes('University of Ottawa')) {
    throw new Error('University of Ottawa title changes require a separate reviewed backfill; this guard prevents a broad inferred-title write.');
  }

  const db = await initDb();
  const stores: Array<{
    label: string;
    read: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
    write: (changes: Change[]) => Promise<void>;
  }> = [{
    label: 'current',
    read: statement => db.execute(statement),
    write: async changes => {
      for (const change of changes) {
        await db.execute({
          sql: change.field === 'raw'
            ? 'UPDATE raw_jobs SET title = ? WHERE id = ?'
            : 'UPDATE job_details SET job_title = ? WHERE id = ?',
          args: [change.to, change.id],
        });
      }
    },
  }];

  const archiveExecute = (db as unknown as { executeArchive?: (statement: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }> }).executeArchive;
  if (archiveExecute && INCLUDE_ARCHIVE) {
    stores.push({
      label: 'archive',
      read: statement => archiveExecute.call(db, statement),
      write: async changes => {
        for (const change of changes) await archiveExecute.call(db, {
          sql: change.field === 'raw'
            ? 'UPDATE raw_jobs SET title = ? WHERE id = ?'
            : 'UPDATE job_details SET job_title = ? WHERE id = ?',
          args: [change.to, change.id],
        });
      },
    });
  }

  for (const store of stores) {
    const rows = (await store.read(QUERY)).rows as unknown as Row[];
    const changes = rows.flatMap(changesFor);
    console.log(`[Scoped title backfill:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${changes.length} field change(s) across ${new Set(changes.map(change => change.id)).size} row(s).`);
    for (const change of changes.slice(0, 100)) console.log(JSON.stringify(change));
    if (APPLY) await store.write(changes);
  }
}

main().catch(error => {
  console.error('[Scoped title backfill] Failed:', error);
  process.exitCode = 1;
});
