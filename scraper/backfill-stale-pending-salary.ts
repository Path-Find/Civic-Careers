/**
 * Remove stale pending salary text once a full parsed salary exists.
 * The public UI uses structured salary fields for these rows, so invalid
 * pending text is only dead fallback data and must not remain available to a
 * future API path.
 *
 *   npx tsx backfill-stale-pending-salary.ts          # dry run
 *   npx tsx backfill-stale-pending-salary.ts --apply  # current + archive
 */
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const QUERY = `
  SELECT r.id, r.source, r.pending_salary_text
  FROM raw_jobs r
  JOIN job_details d ON d.id = r.id
  WHERE r.pending_salary_text IS NOT NULL
    AND TRIM(r.pending_salary_text) <> ''
    AND r.pending_salary_text !~* '(hour|hr|day|daily|week|wk|month|mo|biweekly|year|yr|flat)'
`;

type Row = { id: string; source: string; pending_salary_text: string };

async function main() {
  const db = await initDb();
  const archiveExecute = (db as unknown as { executeArchive?: (statement: string) => Promise<{ rows: Row[] }> }).executeArchive;
  const stores: Array<{ label: string; read: (sql: string) => Promise<{ rows: Row[] }>; write: (ids: string[]) => Promise<void> }> = [{
    label: 'current',
    read: sql => db.execute(sql) as Promise<{ rows: Row[] }>,
    write: async ids => {
      if (!ids.length) return;
      await db.batch([{
        sql: `UPDATE raw_jobs SET pending_salary_text = NULL WHERE id IN (${ids.map(() => '?').join(',')})`,
        args: ids,
      }], 'write');
    },
  }];
  if (archiveExecute) {
    const archiveBatch = (db as unknown as { batchArchive: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> }).batchArchive;
    stores.push({
      label: 'archive',
      read: sql => archiveExecute.call(db, sql),
      write: async ids => {
        if (!ids.length) return;
        await archiveBatch.call(db, [{
          sql: `UPDATE raw_jobs SET pending_salary_text = NULL WHERE id IN (${ids.map(() => '?').join(',')})`,
          args: ids,
        }]);
      },
    });
  }

  for (const store of stores) {
    const rows = (await store.read(QUERY)).rows;
    console.log(`[stale-pending-salary:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${rows.length} invalid pending salary value(s).`);
    for (const row of rows.slice(0, 40)) console.log(`  ${row.source} ${row.id}: ${JSON.stringify(row.pending_salary_text)}`);
    if (APPLY) await store.write(rows.map(row => String(row.id)));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
