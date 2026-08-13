/**
 * Review and apply only deterministic listing-type corrections for parsed,
 * unverified jobs. This intentionally does not rewrite descriptions, links,
 * or any other structured field.
 *
 *   npx tsx backfill-reviewed-listing-types.ts       # read-only dry run
 *   npx tsx backfill-reviewed-listing-types.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { extractListingType, type ListingType } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const INCLUDE_VERIFIED = process.argv.includes('--include-verified');
const limitArgument = process.argv.find(value => value.startsWith('--limit='));
const LIMIT = Math.max(1, Number(limitArgument?.split('=')[1] ?? 10000));

type Row = {
  id: string;
  source: string;
  title: string;
  description: string;
  raw_text: string;
  listing_type: string | null;
  is_inventory: number | null;
};

type Candidate = Row & {
  listingType: ListingType;
  isInventory: number;
};

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `
      SELECT j.id, j.source, jd.job_title AS title, jd.description, raw.raw_text,
             jd.listing_type, jd.is_inventory
      FROM jobs j
      JOIN job_details jd ON jd.id = j.id
      LEFT JOIN raw_jobs raw ON raw.id = j.id
      WHERE j.is_active = 1
        ${INCLUDE_VERIFIED ? '' : 'AND j.verified_at IS NULL'}
      ORDER BY j.source, j.id
      LIMIT ?
    `,
    args: [LIMIT],
  });

  const candidates = (result.rows as unknown as Row[]).flatMap(row => {
    const listingType = extractListingType(`${row.raw_text ?? ''}\n${row.description ?? ''}`, row.title ?? '', Number(row.is_inventory ?? 0) === 1);
    const isInventory = listingType === 'inventory' ? 1 : 0;
    if (row.listing_type === listingType && Number(row.is_inventory ?? 0) === isInventory) return [];
    return [{ ...row, listingType, isInventory }];
  });

  const counts = candidates.reduce<Record<string, number>>((summary, row) => {
    summary[row.listingType] = (summary[row.listingType] ?? 0) + 1;
    return summary;
  }, {});
  console.log(`[Listing type] ${APPLY ? 'Applying' : 'Dry run'}${INCLUDE_VERIFIED ? ' (including verified rows)' : ''}: ${candidates.length} deterministic correction(s); ${JSON.stringify(counts)}.`);
  for (const row of candidates) {
    console.log(JSON.stringify({ id: row.id, source: row.source, title: row.title, from: row.listing_type, to: row.listingType, isInventory: row.isInventory }));
  }
  if (!APPLY || candidates.length === 0) return;

  await db.batch(candidates.map(row => ({
    sql: `UPDATE job_details
          SET listing_type = ?, is_inventory = ?
          WHERE id = ?
            ${INCLUDE_VERIFIED ? '' : 'AND EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_details.id AND jobs.verified_at IS NULL)'}`,
    args: [row.listingType, row.isInventory, row.id],
  })), 'write');
  console.log(`[Listing type] Updated ${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Listing type] Failed:', error);
  process.exitCode = 1;
});
