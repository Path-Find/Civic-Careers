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
import { normalizeLocation } from './location';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

type Change = {
  id: string;
  source: string;
  title: string;
  is_active: number;
  from: string;
  to: string;
};

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.location
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.location IS NOT NULL
      AND trim(d.location) != ''
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
    ORDER BY j.source, j.id
  `);

  const changes: Change[] = [];
  const unmapped: { id: string; source: string; from: string }[] = [];
  const resultDist = new Map<string, number>();
  let alreadyCanonical = 0;
  let emptied = 0;

  for (const row of query.rows) {
    const from = String(row.location ?? '').trim();
    const to = normalizeLocation(from);
    if (to) {
      resultDist.set(to, (resultDist.get(to) ?? 0) + 1);
    }
    if (from === to) {
      alreadyCanonical++;
      continue;
    }
    if (!to && from) {
      // Became empty — either junk strip or unmapped bare city
      const probe = normalizeLocation(from);
      if (!probe) unmapped.push({ id: String(row.id), source: String(row.source), from });
      emptied++;
    }
    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      is_active: Number(row.is_active ?? 0),
      from,
      to,
    });
  }

  console.log(`Rows with location: ${query.rows.length}`);
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
    const BATCH = 50;
    for (let i = 0; i < changes.length; i += BATCH) {
      const slice = changes.slice(i, i + BATCH);
      await db.batch(
        slice.map((c) => ({
          sql: `UPDATE job_details SET location = ? WHERE id = ?`,
          args: [c.to || null, c.id],
        })),
        'write',
      );
      process.stdout.write(`\rApplied ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
    }
    console.log('\nDone.');
  }

  const topTo = [...resultDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  const outPath = path.resolve(__dirname, '../docs/location-normalize-2026-08-04.md');
  const md = [
    '# Location normalize 2026-08-04',
    '',
    `- Rows scanned: ${query.rows.length}`,
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
