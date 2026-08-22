/**
 * Read-only whole-corpus audit for job_details.availability.
 *
 *   npx tsx audit-availability.ts
 *   npx tsx audit-availability.ts --json
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { isCanonicalAvailability, normalizeAvailability } from './hours-availability';

dotenv.config({ quiet: true });

type Row = { id: string; source: string; is_active: number | null; availability: string | null };
type Store = { label: string; execute: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }> };

const QUERY = `
  SELECT j.id, j.source, j.is_active, d.availability
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  WHERE d.availability IS NOT NULL AND TRIM(d.availability) <> ''
`;

function increment(map: Map<string, number>, value: string): void {
  map.set(value, (map.get(value) ?? 0) + 1);
}

function top(map: Map<string, number>, limit = 20): Array<[string, number]> {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

async function auditStore(store: Store) {
  const rows = (await store.execute(QUERY)).rows as unknown as Row[];
  const unsafeValues = new Map<string, number>();
  const unsafeSources = new Map<string, number>();
  const normalizedValues = new Map<string, number>();
  let canonical = 0;
  let normalizable = 0;
  let unsafe = 0;
  let activeUnsafe = 0;

  for (const row of rows) {
    const raw = String(row.availability ?? '').replace(/\s+/g, ' ').trim();
    if (isCanonicalAvailability(raw)) {
      canonical += 1;
      continue;
    }

    const normalized = normalizeAvailability(raw);
    if (isCanonicalAvailability(normalized)) {
      normalizable += 1;
      increment(normalizedValues, `${raw} => ${normalized}`);
    } else {
      unsafe += 1;
      if (Number(row.is_active) === 1) activeUnsafe += 1;
      increment(unsafeValues, raw);
      increment(unsafeSources, String(row.source));
    }
  }

  return {
    label: store.label,
    total: rows.length,
    canonical,
    normalizable,
    unsafe,
    activeUnsafe,
    topUnsafeValues: top(unsafeValues),
    topUnsafeSources: top(unsafeSources),
    topNormalizedValues: top(normalizedValues),
  };
}

async function main() {
  const db = await initDb();
  const stores: Store[] = [{ label: 'current', execute: db.execute.bind(db) }];
  const archive = db as unknown as { executeArchive?: Store['execute'] };
  if (archive.executeArchive) stores.push({ label: 'archive', execute: archive.executeArchive.bind(db) });

  const results = [];
  for (const store of stores) results.push(await auditStore(store));

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  for (const result of results) {
    console.log(`${result.label}: ${result.total} populated; ${result.canonical} canonical; ${result.normalizable} normalizable; ${result.unsafe} unsafe (${result.activeUnsafe} active)`);
    console.log(`  top unsafe sources: ${result.topUnsafeSources.map(([value, count]) => `${value} (${count})`).join(', ') || 'none'}`);
    console.log(`  top unsafe values: ${result.topUnsafeValues.map(([value, count]) => `${JSON.stringify(value)} (${count})`).join(', ') || 'none'}`);
  }
  console.log('Read-only audit complete; no database values were changed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
