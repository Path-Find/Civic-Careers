/**
 * Conservative Availability backfill for current and archived jobs.
 *
 *   npx tsx backfill-availability.ts           # dry-run
 *   npx tsx backfill-availability.ts --apply
 *
 * Raw captures are never changed. Unknown values become empty; only values
 * reduced by the shared schedule normalizer are written as canonical tags.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { isCanonicalAvailability, normalizeAvailability } from './hours-availability';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const QUERY = `
  SELECT j.id, j.source, d.availability
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  WHERE d.availability IS NOT NULL AND TRIM(d.availability) <> ''
`;

type Row = { id: string; source: string; availability: string | null };
type Store = { label: string; execute: (statement: string | { sql: string; args: unknown[] }) => Promise<{ rows?: Array<Record<string, unknown>> }> };

async function main() {
  const db = await initDb();
  const stores: Store[] = [{ label: 'current', execute: db.execute.bind(db) }];
  const archive = db as unknown as { executeArchive?: Store['execute'] };
  if (archive.executeArchive) stores.push({ label: 'archive', execute: archive.executeArchive.bind(db) });

  let scanned = 0;
  let changed = 0;
  let cleared = 0;
  let canonicalized = 0;

  for (const store of stores) {
    const rows = (await store.execute(QUERY)).rows as unknown as Row[];
    let storeChanged = 0;
    let storeCleared = 0;
    for (const row of rows) {
      scanned += 1;
      const from = String(row.availability ?? '').replace(/\s+/g, ' ').trim();
      const to = normalizeAvailability(from);
      const next = isCanonicalAvailability(to) ? to : '';
      if (next === from) continue;
      changed += 1;
      storeChanged += 1;
      if (next) canonicalized += 1;
      else {
        cleared += 1;
        storeCleared += 1;
      }
      if (APPLY) {
        await store.execute({
          sql: 'UPDATE job_details SET availability = ? WHERE id = ?',
          args: [next || null, row.id],
        });
      }
    }
    console.log(`${store.label}: scanned ${rows.length}; would change ${storeChanged}; would clear ${storeCleared}`);
  }

  console.log(`Total: scanned ${scanned}; changed ${changed}; canonicalized ${canonicalized}; cleared ${cleared}${APPLY ? ' (applied)' : ' (dry-run)'}`);
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write; raw captures remain unchanged.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
