/**
 * Fill missing closing metadata only when the preserved capture is a real
 * posting with a usable title. Invalid/expired captures remain untouched.
 *
 *   npx tsx backfill-closing-status-safe.ts       # dry run
 *   npx tsx backfill-closing-status-safe.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeActiveClosingDateStatus } from './closing-date';
import { classifyRawCapture } from './capture-quality';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
type Execute = (statement: string | { sql: string; args: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }>;

type Row = {
  id: string;
  source: string;
  raw_title: string | null;
  detail_title: string | null;
  raw_text: string | null;
  raw_url: string | null;
  application_url: string | null;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  closing_date: string | null;
};

function candidate(row: Row, today: string) {
  if (row.pending_closing_date?.trim() || row.closing_date?.trim()) return null;
  if (!['not_checked', 'not_listed', 'invalid', ''].includes(row.pending_closing_date_status?.trim() ?? '')) return null;
  const rawText = String(row.raw_text ?? '');
  if (!classifyRawCapture(row.source, rawText).valid) return null;
  const title = row.detail_title || row.raw_title || extractRawJobTitle(row.source, rawText)
    || extractUrlJobTitle(row.application_url || row.raw_url, rawText);
  if (!isUsableJobTitle(title)) return null;
  const closing = normalizeActiveClosingDateStatus(rawText);
  if (closing.date && closing.date < today) return null;
  return { ...row, closingDate: closing.date, closingStatus: closing.status };
}

async function main() {
  const db = await initDb();
  const archive = db as unknown as { executeArchive?: Execute; batchArchive?: (statements: Array<{ sql: string; args: unknown[] }>) => Promise<unknown> };
  const stores: Array<{ label: string; read: Execute; write: (rows: ReturnType<typeof candidate>[]) => Promise<void> }> = [
    {
      label: 'current',
      read: statement => db.execute(statement),
      write: rows => db.batch(rows.map(row => ({
        sql: 'UPDATE raw_jobs SET pending_closing_date = ?, pending_closing_date_status = ? WHERE id = ?',
        args: [row!.closingDate, row!.closingStatus, row!.id],
      })), 'write'),
    },
  ];
  if (archive.executeArchive && archive.batchArchive) {
    stores.push({
      label: 'archive',
      read: statement => archive.executeArchive!(statement),
      write: rows => archive.batchArchive!(rows.map(row => ({
        sql: 'UPDATE raw_jobs SET pending_closing_date = ?, pending_closing_date_status = ? WHERE id = ?',
        args: [row!.closingDate, row!.closingStatus, row!.id],
      }))),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const query = `SELECT r.id, r.source, r.title AS raw_title, r.raw_text, r.url AS raw_url,
                        r.application_url, r.pending_closing_date, r.pending_closing_date_status,
                        d.job_title AS detail_title, d.closing_date
                 FROM raw_jobs r JOIN jobs j ON j.id = r.id
                 LEFT JOIN job_details d ON d.id = r.id
                 WHERE (r.pending_closing_date IS NULL OR TRIM(r.pending_closing_date) = '')
                   AND (d.closing_date IS NULL OR TRIM(d.closing_date) = '')`;
  for (const store of stores) {
    const rows = (await store.read(query)).rows as unknown as Row[];
    const candidates = rows.map(row => candidate(row, today)).filter(Boolean) as ReturnType<typeof candidate>[];
    const counts = candidates.reduce<Record<string, number>>((out, row) => {
      out[row!.closingStatus] = (out[row!.closingStatus] ?? 0) + 1;
      return out;
    }, {});
    console.log(`[Safe closing status:${store.label}] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length} row(s), ${JSON.stringify(counts)}.`);
    for (const row of candidates.slice(0, 20)) console.log(JSON.stringify({ id: row!.id, source: row!.source, status: row!.closingStatus }));
    if (APPLY && candidates.length) await store.write(candidates);
  }
}

main().catch(error => { console.error('[Safe closing status] Failed:', error); process.exitCode = 1; });
