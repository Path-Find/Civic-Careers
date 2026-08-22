/** Restore valid latest captures that were incorrectly moved to Neon archive.
 *
 * This is deliberately source-scoped and never requests a source page. It
 * uses only preserved raw captures, requires a valid capture/title, and treats
 * a missing closing date as Until filled per the current publication policy.
 *
 *   npx tsx restore-current-captures.ts       # dry run
 *   npx tsx restore-current-captures.ts --apply
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeActiveClosingDateStatus } from './closing-date';
import { classifyRawCapture } from './capture-quality';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle, normalizeSourceJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const WINDOW_MS = 2 * 60 * 60 * 1000;

// The 50 organizations Ryan identified as showing no current jobs. Algoma's
// already-restored rows are intentionally excluded from this repair.
const SOURCES = [
  'Bruce County', 'City of Abbotsford', 'City of Kingston', 'City of Nanaimo',
  'City of Orillia', 'City of Peterborough', 'City of Pickering', 'City of Quinte West',
  'City of Waterloo', 'City of Woodstock', 'Collège Boréal', 'County of Brant',
  'County of Renfrew', 'CreateTO', 'Durham Region', 'Essex County', 'Fleming College',
  'Georgian College', 'Grey County', 'Hydro One', 'ICBC', 'IESO', 'Lambton College',
  'Langara College', 'LCBO', 'Loyalist College', 'Municipality of Clarington',
  'Niagara Region', 'Norfolk County', 'Northumberland County', 'Ontario Clean Water Agency',
  'Ontario Energy Board', 'Ontario Health atHome', 'Pickering Public Library',
  'Public Health Ontario', 'Richmond Public Library', 'St. Clair College',
  'St. Lawrence College', 'Toronto Catholic District School Board', 'Toronto Hydro',
  'Town of Collingwood', 'Town of Midland',
  'Université de Saint-Boniface', 'University of New Brunswick',
  'University of Northern British Columbia', 'University of the Fraser Valley',
  'Vaughan Public Library', 'VIA TGF Inc.', 'Waterfront Toronto', 'WSIB', 'TTC',
];

type Row = {
  id: string;
  source: string;
  scraped_at: string;
  raw_title: string | null;
  detail_title: string | null;
  raw_text: string | null;
  raw_url: string | null;
  application_url: string | null;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  closing_date: string | null;
};

type Candidate = Row & {
  title: string;
  closingDate: string | null;
  closingStatus: 'known' | 'open_until_filled';
  reason: 'future deadline' | 'until filled';
};

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

function asDate(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function candidateFor(row: Row, latest: number, today: string): Candidate | null {
  if (asDate(row.scraped_at) < latest - WINDOW_MS) return null;
  const capture = classifyRawCapture(row.source, String(row.raw_text ?? ''));
  if (!capture.valid) return null;

  const rawTitle = isUsableJobTitle(row.raw_title)
    ? row.raw_title
    : extractRawJobTitle(row.source, row.raw_text)
      || extractUrlJobTitle(row.application_url || row.raw_url, row.raw_text);
  const title = normalizeSourceJobTitle(row.source, isUsableJobTitle(row.detail_title) ? row.detail_title : rawTitle);
  if (!isUsableJobTitle(title)) return null;

  const storedDate = row.closing_date?.trim() || row.pending_closing_date?.trim() || '';
  const rawClosing = normalizeActiveClosingDateStatus(String(row.raw_text ?? ''));
  const closingDate = storedDate || rawClosing.date;
  if (closingDate && closingDate < today) return null;
  const closingStatus = closingDate ? 'known' : 'open_until_filled';
  return {
    ...row,
    title,
    closingDate: closingDate || null,
    closingStatus,
    reason: closingDate ? 'future deadline' : 'until filled',
  };
}

async function main() {
  const db = await initDb();
  const executeArchive = (db as unknown as { executeArchive?: (statement: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }> }).executeArchive;
  const neon = db as unknown as { restoreIfArchived?: (id: string) => Promise<void>; close?: () => Promise<void> };
  if (!executeArchive || !neon.restoreIfArchived) {
    throw new Error('This repair requires the Neon current/archive databases.');
  }
  const executeArchiveBound = (statement: string | { sql: string; args?: unknown[] }) => executeArchive.call(db, statement);

  const args = SOURCES;
  const sourceFilter = placeholders(SOURCES.length);
  const sourceQuery = `SELECT source, MAX(scraped_at) AS latest FROM raw_jobs WHERE source IN (${sourceFilter}) GROUP BY source`;
  const currentLatest = await db.execute({ sql: sourceQuery, args });
  const archiveLatest = await executeArchiveBound({ sql: sourceQuery, args });
  const latest = new Map<string, number>();
  for (const row of [...currentLatest.rows, ...archiveLatest.rows]) {
    const source = String(row.source);
    latest.set(source, Math.max(latest.get(source) ?? 0, asDate(String(row.latest ?? ''))));
  }

  const rowsResult = await executeArchiveBound({
    sql: `SELECT j.id, j.source, r.scraped_at, r.title AS raw_title, d.job_title AS detail_title,
                 r.raw_text, r.url AS raw_url, r.application_url,
                 r.pending_closing_date, r.pending_closing_date_status, d.closing_date
          FROM jobs j
          JOIN raw_jobs r ON r.id = j.id
          LEFT JOIN job_details d ON d.id = j.id
          WHERE j.source IN (${sourceFilter})`,
    args,
  });
  const today = new Date().toISOString().slice(0, 10);
  const candidates = (rowsResult.rows as unknown as Row[])
    .map(row => candidateFor(row, latest.get(row.source) ?? 0, today))
    .filter(Boolean) as Candidate[];

  const bySource = candidates.reduce<Record<string, number>>((counts, row) => {
    counts[row.source] = (counts[row.source] ?? 0) + 1;
    return counts;
  }, {});
  console.log(`[Restore latest captures] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length} candidate(s), today=${today}.`);
  console.log(JSON.stringify(bySource, null, 2));
  for (const row of candidates) {
    console.log(JSON.stringify({ id: row.id, source: row.source, title: row.title, scraped_at: row.scraped_at, closing_date: row.closingDate, closing_status: row.closingStatus }));
  }

  if (!APPLY) return;
  for (const row of candidates) {
    await executeArchiveBound({
      sql: `UPDATE raw_jobs
            SET title = ?, pending_closing_date = ?, pending_closing_date_status = ?
            WHERE id = ?`,
      args: [row.title, row.closingDate, row.closingStatus, row.id],
    });
    if (!isUsableJobTitle(row.detail_title)) {
      await executeArchiveBound({ sql: 'UPDATE job_details SET job_title = ? WHERE id = ?', args: [row.title, row.id] });
    }
    await neon.restoreIfArchived(row.id);
  }
  console.log(`[Restore latest captures] Restored ${candidates.length} row(s).`);
  await neon.close?.();
}

main().catch(error => {
  console.error('[Restore latest captures] Failed:', error);
  process.exitCode = 1;
});
