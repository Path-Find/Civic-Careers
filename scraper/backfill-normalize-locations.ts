/**
 * Normalize job_details.location to "City, XX" / multi "City, XX; City, XX".
 *
 * Usage:
 *   npx tsx backfill-normalize-locations.ts           # dry-run
 *   npx tsx backfill-normalize-locations.ts --apply   # write
 *   npx tsx backfill-normalize-locations.ts --active-only
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractLabeledLocation, normalizeLocation, normalizeSourceLocation, normalizeSourceLocationFromTitle } from './location';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');
const SOURCE_ONLY = process.argv.find(arg => arg.startsWith('--source='))?.slice('--source='.length) ?? '';

type Change = {
  id: string;
  store: 'current' | 'archive';
  source: string;
  title: string;
  is_active: number;
  from: string;
  to: string;
};

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: unknown) => Promise<{ rows: any[] }> };
  const queryText = `
    SELECT j.id, j.source, j.is_active, d.job_title, d.location, r.raw_text
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    LEFT JOIN raw_jobs r ON r.id = j.id
    WHERE 1 = 1
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
      ${SOURCE_ONLY ? 'AND j.source = ?' : ''}
    ORDER BY j.source, j.id
  `;
  const currentRows = (await db.execute({ sql: queryText, args: SOURCE_ONLY ? [SOURCE_ONLY] : [] })).rows
    .map((row: any) => ({ ...row, store: 'current' as const }));
  const archiveRows = archive.executeArchive
    ? (await archive.executeArchive({ sql: queryText, args: SOURCE_ONLY ? [SOURCE_ONLY] : [] })).rows
      .map((row: any) => ({ ...row, store: 'archive' as const }))
    : [];

  const changes: Change[] = [];
  const unmapped: { id: string; source: string; from: string }[] = [];
  const resultDist = new Map<string, number>();
  let alreadyCanonical = 0;
  let emptied = 0;

  const allRows = [...currentRows, ...archiveRows];
  for (const row of allRows) {
    const from = String(row.location ?? '').trim();
    const normalized = normalizeSourceLocation(String(row.source ?? ''), String(row.raw_text ?? ''))
      || normalizeSourceLocationFromTitle(String(row.source ?? ''), String(row.job_title ?? ''))
      || normalizeLocation(from);
    const recovered = !normalized ? extractLabeledLocation(String(row.raw_text ?? '')) : '';
    // Never erase a populated location during this repair pass. If neither
    // the stored value nor the preserved source can be normalized, retain the
    // original for a later source-specific review.
    const to = normalized || recovered || from;
    if (to) {
      resultDist.set(to, (resultDist.get(to) ?? 0) + 1);
    }
    if (from === to) {
      alreadyCanonical++;
      continue;
    }
    if (to === from && from && !normalized && !recovered) {
      unmapped.push({ id: String(row.id), source: String(row.source), from });
    }
    changes.push({
      id: String(row.id),
      store: row.store,
      source: String(row.source),
      title: String(row.job_title ?? ''),
      is_active: Number(row.is_active ?? 0),
      from,
      to,
    });
  }

  console.log(`Rows with location: ${allRows.length}`);
  console.log(`Already canonical: ${alreadyCanonical}`);
  console.log(`Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}`);
  console.log(`Of which emptied: ${emptied}`);
  console.log(`Unmapped/junk samples (up to 40):`);
  for (const u of unmapped.slice(0, 40)) {
    console.log(`  ${u.source} ${u.id}: ${JSON.stringify(u.from)}`);
  }

  const sample = changes.slice(0, 30);
  console.log('\nSample changes:');
  for (const c of sample) {
    console.log(`  ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
  }

  if (APPLY && changes.length) {
    const client = db as any;
    const BATCH = 50;
    let applied = 0;
    for (const store of ['current', 'archive'] as const) {
      const storeChanges = changes.filter(change => change.store === store);
      for (let i = 0; i < storeChanges.length; i += BATCH) {
      const slice = storeChanges.slice(i, i + BATCH);
      const statements = slice.map((c) => ({
        sql: `UPDATE job_details SET location = ? WHERE id = ? AND location = ?`,
        args: [c.to || null, c.id, c.from],
      }));
      const executeBatch = store === 'archive' ? client.batchArchive?.bind(client) : client.batch.bind(client);
      await executeBatch(
        statements,
      );
      applied += slice.length;
      process.stdout.write(`\rApplied ${applied}/${changes.length}`);
      }
    }
    console.log('\nDone.');
  }

  const topTo = [...resultDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  const outPath = path.resolve(__dirname, '../docs/location-normalize-2026-08-04.md');
  const md = [
    '# Location normalize 2026-08-04',
    '',
    `- Rows scanned: ${allRows.length}`,
    `- Already canonical: ${alreadyCanonical}`,
    `- Changed: ${changes.length}${APPLY ? ' (applied)' : ' (dry-run only)'}`,
    `- Emptied (junk or unmapped): ${emptied}`,
    '',
    '## Top canonical values (post-normalize count among scanned)',
    '',
    ...topTo.map(([loc, n]) => `- ${n} \`${loc}\``),
    '',
    '## Sample rewrites',
    '',
    ...sample.map((c) => `- \`${c.from}\` → \`${c.to || '(empty)'}\``),
    '',
  ].join('\n');
  fs.writeFileSync(outPath, md);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
