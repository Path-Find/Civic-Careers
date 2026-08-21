/** Repair portal placeholder titles in both Neon stores from preserved data.
 *
 *   npx tsx repair-placeholder-titles.ts       # dry run
 *   npx tsx repair-placeholder-titles.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle, normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  source: string;
  raw_title: string | null;
  detail_title: string | null;
  raw_text: string | null;
  raw_url: string | null;
  application_url: string | null;
};

type Repair = Row & {
  title: string;
  updateRaw: boolean;
  updateDetails: boolean;
};

const QUERY = `
  SELECT r.id, r.source, r.title AS raw_title, d.job_title AS detail_title,
         r.raw_text, r.url AS raw_url, r.application_url
  FROM raw_jobs r
  LEFT JOIN job_details d ON d.id = r.id
`;

function repairFor(row: Row): Repair | null {
  const rawUsable = isUsableJobTitle(row.raw_title);
  const detailUsable = isUsableJobTitle(row.detail_title);
  const rawPlaceholder = Boolean(row.raw_title?.trim()) && !rawUsable;
  const detailPlaceholder = Boolean(row.detail_title?.trim()) && !detailUsable;
  if (!rawPlaceholder && !detailPlaceholder) return null;
  const sourceTitle = extractRawJobTitle(row.source, row.raw_text)
    || extractUrlJobTitle(row.application_url || row.raw_url, row.raw_text);
  const title = normalizeSourceJobTitle(
    row.source,
    detailUsable ? row.detail_title : rawUsable ? row.raw_title : sourceTitle,
  );
  if (!isUsableJobTitle(title)) return null;

  const updateRaw = rawPlaceholder;
  const updateDetails = detailPlaceholder;
  if (!updateRaw && !updateDetails) return null;
  return { ...row, title, updateRaw, updateDetails };
}

async function main() {
  const db = await initDb();
  const stores: Array<{
    label: string;
    read: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }>;
    write: (repair: Repair) => Promise<void>;
  }> = [{
    label: 'current',
    read: statement => db.execute(statement),
    write: async repair => {
      const statements = [
        ...(repair.updateRaw ? [{ sql: 'UPDATE raw_jobs SET title = ? WHERE id = ?', args: [repair.title, repair.id] }] : []),
        ...(repair.updateDetails ? [{ sql: 'UPDATE job_details SET job_title = ? WHERE id = ?', args: [repair.title, repair.id] }] : []),
      ];
      await db.batch(statements, 'write');
    },
  }];

  const archiveExecute = (db as unknown as { executeArchive?: (statement: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }> }).executeArchive;
  if (archiveExecute) {
    const executeArchiveBound = (statement: string | { sql: string; args?: unknown[] }) => archiveExecute.call(db, statement);
    stores.push({
      label: 'archive',
      read: statement => executeArchiveBound(statement),
      write: async repair => {
        if (repair.updateRaw) await executeArchiveBound({ sql: 'UPDATE raw_jobs SET title = ? WHERE id = ?', args: [repair.title, repair.id] });
        if (repair.updateDetails) await executeArchiveBound({ sql: 'UPDATE job_details SET job_title = ? WHERE id = ?', args: [repair.title, repair.id] });
      },
    });
  }

  for (const store of stores) {
    const result = await store.read(QUERY);
    const repairs = (result.rows as unknown as Row[]).map(repairFor).filter(Boolean) as Repair[];
    const rawOnly = repairs.filter(repair => repair.updateRaw && !repair.updateDetails).length;
    const detailsOnly = repairs.filter(repair => !repair.updateRaw && repair.updateDetails).length;
    const both = repairs.filter(repair => repair.updateRaw && repair.updateDetails).length;
    console.log(`[Placeholder titles:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${repairs.length} repair(s) (${rawOnly} raw only, ${detailsOnly} details only, ${both} both).`);
    for (const repair of repairs.slice(0, 25)) {
      console.log(JSON.stringify({ id: repair.id, source: repair.source, from: repair.raw_title, detail: repair.detail_title, to: repair.title }));
    }
    if (APPLY) {
      for (const repair of repairs) await store.write(repair);
    }
  }
}

main().catch(error => {
  console.error('[Placeholder titles] Failed:', error);
  process.exitCode = 1;
});
