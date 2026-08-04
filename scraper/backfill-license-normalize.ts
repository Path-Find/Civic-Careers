/**
 * Compact wordy professional-registration licence strings
 * (e.g. "registration as Registered Nurse (RN) with the College of Nurses of Ontario" → "RN (CNO)").
 *
 *   npx tsx backfill-license-normalize.ts           # dry-run
 *   npx tsx backfill-license-normalize.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeLicenseRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function sameList(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT id, license_requirements
    FROM job_details
    WHERE license_requirements IS NOT NULL
      AND license_requirements != ''
      AND license_requirements != '[]'
    ORDER BY id
  `);

  type Change = { id: string; from: string[]; to: string[] };
  const changes: Change[] = [];
  const renameCounts = new Map<string, number>();

  for (const row of result.rows) {
    const from = parseList(row.license_requirements as string | null);
    const to = normalizeLicenseRequirements(from);
    if (sameList(from, to)) continue;
    changes.push({ id: String(row.id), from, to });
    for (let i = 0; i < Math.max(from.length, to.length); i++) {
      const a = from[i] ?? '∅';
      const b = to[i] ?? '∅';
      if (a === b) continue;
      // Match by content better: report each from item that isn't in to, and each new to
    }
    // Pairwise: for each from item, show normalized form
    for (const item of from) {
      const norm = normalizeLicenseRequirements([item]);
      const next = norm[0] ?? '∅';
      if (item === next) continue;
      const key = `${item} → ${next}`;
      renameCounts.set(key, (renameCounts.get(key) || 0) + 1);
    }
    for (const item of to) {
      if (!from.includes(item) && !from.some(f => normalizeLicenseRequirements([f])[0] === item)) {
        // newly introduced only via merge — skip
      }
    }
  }

  console.log(`Rows scanned: ${result.rows.length}`);
  console.log(`Would update: ${changes.length}`);
  console.log('\nTop renames:');
  [...renameCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .forEach(([label, n]) => console.log(`  ${String(n).padStart(4)}  ${label}`));

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await db.batch(
      batch.map(c => ({
        sql: 'UPDATE job_details SET license_requirements = ? WHERE id = ?',
        args: [JSON.stringify(c.to), c.id],
      })),
      'write',
    );
    updated += batch.length;
  }
  console.log(`Done. Updated ${updated} rows.`);

  const outPath = path.resolve(__dirname, '../docs/license-normalize-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Licence registration wording compact — 2026-08-04',
    '',
    `Updated: ${updated} rows.`,
    '',
    'Wordy registration prose (e.g. "registration as Registered Nurse (RN) with the College of Nurses of Ontario")',
    'collapsed to short labels (e.g. "RN (CNO)").',
    '',
    '## Top renames',
    '',
    ...[...renameCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([label, n]) => `- (${n}) ${label}`),
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(c => c.id),
    '```',
    '',
  ].join('\n'));
  console.log(`Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
