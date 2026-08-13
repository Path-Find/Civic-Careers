/** Read-only live audit for the data-quality parent issue.
 *
 * This deliberately uses a direct Turso client instead of initDb so an audit
 * cannot run migrations or write production data.
 *
 *   npx tsx audit-live-job-quality.ts
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { extractClosingDateStatus } from './closing-date';
import { extractListingType } from './requirements';

dotenv.config({ quiet: true });

type Row = {
  id: string;
  source: string;
  title: string;
  description: string;
  location: string;
  closingDate: string;
  duration: string;
  listingType: string;
  isInventory: number;
  detailsPending: boolean;
  rawText: string;
};

function countBySource(rows: Row[], predicate: (row: Row) => boolean): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    if (predicate(row)) counts[row.source] = (counts[row.source] ?? 0) + 1;
    return counts;
  }, {});
}

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, j.is_active, jd.id AS details_id,
           COALESCE(jd.job_title, raw.title, '') AS title,
           COALESCE(jd.description, '') AS description,
           COALESCE(jd.location, '') AS location,
           COALESCE(jd.closing_date, '') AS closing_date,
           COALESCE(jd.duration, raw.pending_duration, '') AS duration,
           jd.listing_type,
           COALESCE(jd.is_inventory, 0) AS is_inventory,
           COALESCE(raw.raw_text, '') AS raw_text
    FROM jobs j
    LEFT JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE j.is_active = 1
  `);

  const rows: Row[] = result.rows.map(row => ({
    id: String(row.id),
    source: String(row.source ?? ''),
    title: String(row.title ?? '').trim(),
    description: String(row.description ?? '').trim(),
    location: String(row.location ?? '').trim(),
    closingDate: String(row.closing_date ?? '').trim(),
    duration: String(row.duration ?? '').trim(),
    listingType: String(row.listing_type ?? '').trim(),
    isInventory: Number(row.is_inventory ?? 0),
    detailsPending: row.details_id == null,
    rawText: String(row.raw_text ?? ''),
  }));

  const missingLocation = rows.filter(row => !row.location);
  const missingDescription = rows.filter(row => !row.description);
  const termWithoutDuration = rows.filter(row => /\bterm\b/i.test(row.title) && !row.duration);
  const explicitInventoryMismatch = rows.filter(row => {
    if (row.detailsPending) return false;
    const derived = extractListingType(`${row.rawText}\n${row.description}`, row.title, row.isInventory === 1);
    return derived !== 'regular' && row.listingType !== derived && row.isInventory !== 1;
  });
  const pendingListingTypeFallback = rows.filter(row => {
    if (!row.detailsPending) return false;
    const derived = extractListingType(`${row.rawText}\n${row.description}`, row.title, row.isInventory === 1);
    return derived !== 'regular';
  });
  const missingClosingDate = rows.filter(row => !row.closingDate);
  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
    if (!row.closingDate) {
      const status = extractClosingDateStatus(row.rawText).status;
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, {});
  const statusBySource = countBySource(rows, row => !row.closingDate && extractClosingDateStatus(row.rawText).status !== 'not_checked');

  console.log(JSON.stringify({
    readOnly: true,
    activeJobs: rows.length,
    missingLocation: missingLocation.length,
    missingDescription: missingDescription.length,
    termWithoutDuration: termWithoutDuration.length,
    explicitInventoryMismatch: explicitInventoryMismatch.length,
    pendingListingTypeFallback: pendingListingTypeFallback.length,
    missingClosingDate: missingClosingDate.length,
    missingClosingDateStatus: statusCounts,
    sourceWithExplicitNoDateStatus: statusBySource,
    samples: {
      missingLocation: missingLocation.slice(0, 10).map(row => ({ id: row.id, source: row.source, title: row.title })),
      termWithoutDuration: termWithoutDuration.slice(0, 10).map(row => ({ id: row.id, source: row.source, title: row.title })),
      explicitInventoryMismatch: explicitInventoryMismatch.slice(0, 10).map(row => ({ id: row.id, source: row.source, title: row.title })),
      pendingListingTypeFallback: pendingListingTypeFallback.slice(0, 10).map(row => ({ id: row.id, source: row.source, title: row.title })),
    },
  }, null, 2));
}

main().catch(error => {
  console.error('[Live job-quality audit] Failed:', error);
  process.exitCode = 1;
});
