/**
 * Re-extract licence requirements from descriptions, merge into
 * license_requirements, set vehicle_required when a driver's licence is
 * required, and strip restated licence bullets from Qualifications.
 *
 *   npx tsx backfill-license-cleanup.ts           # dry-run
 *   npx tsx backfill-license-cleanup.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  extractLicenseRequirements,
  extractVehicleRequired,
  licensesImplyVehicle,
  normalizeProfessionalLicenseRequirements,
  stripLicenseBulletsFromDescription,
} from './requirements';

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
  const norm = (values: string[]) => [...new Set(values.map(v => v.trim().toLowerCase()))].sort();
  return JSON.stringify(norm(left)) === JSON.stringify(norm(right));
}

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.description,
           d.license_requirements, d.vehicle_required
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    ORDER BY j.source, j.id
  `);

  type Change = {
    id: string;
    source: string;
    title: string;
    licensesFrom: string;
    licensesTo: string;
    descriptionFrom: string;
    descriptionTo: string;
    vehicleFrom: number | null;
    vehicleTo: number | null;
  };

  const changes: Change[] = [];

  for (const row of query.rows) {
    const description = String(row.description ?? '');
    const existing = parseList(row.license_requirements as string | null);
    const extracted = extractLicenseRequirements(description);
    const merged = normalizeProfessionalLicenseRequirements([...existing, ...extracted]);
    const vehicleDetected = extractVehicleRequired(description);
    const cleanedDescription = stripLicenseBulletsFromDescription(description, merged, vehicleDetected);
    const vehicleFrom = row.vehicle_required === null || row.vehicle_required === undefined
      ? null
      : Number(row.vehicle_required);
    const vehicleTo = vehicleDetected === true || licensesImplyVehicle(extracted) ? 1 : vehicleFrom;

    const licensesFrom = JSON.stringify(existing);
    const licensesTo = JSON.stringify(merged);
    if (
      sameList(existing, merged)
      && cleanedDescription === description
      && vehicleFrom === vehicleTo
    ) {
      continue;
    }

    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      licensesFrom,
      licensesTo,
      descriptionFrom: description,
      descriptionTo: cleanedDescription,
      vehicleFrom,
      vehicleTo,
    });
  }

  const licenseFills = changes.filter(c => c.licensesFrom === '[]' && c.licensesTo !== '[]').length;
  const licenseUpdates = changes.filter(c => c.licensesFrom !== c.licensesTo).length;
  const descStrips = changes.filter(c => c.descriptionFrom !== c.descriptionTo).length;
  const vehicleSets = changes.filter(c => c.vehicleFrom !== c.vehicleTo).length;

  console.log(`[license-cleanup] Scanned ${query.rows.length} jobs.`);
  console.log(`[license-cleanup] Would change: ${changes.length} (license field ${licenseUpdates}, newly filled ${licenseFills}, description strip ${descStrips}, vehicle ${vehicleSets}).`);
  for (const c of changes.slice(0, 20)) {
    console.log(`- ${c.source} | ${c.title || c.id}`);
    if (c.licensesFrom !== c.licensesTo) console.log(`    licenses: ${c.licensesFrom} → ${c.licensesTo}`);
    if (c.descriptionFrom !== c.descriptionTo) {
      const beforeBullets = c.descriptionFrom.split('\n').filter(l => /licen/i.test(l)).slice(0, 3);
      const afterBullets = c.descriptionTo.split('\n').filter(l => /licen/i.test(l)).slice(0, 3);
      console.log(`    desc licen lines before: ${beforeBullets.join(' | ')}`);
      console.log(`    desc licen lines after:  ${afterBullets.join(' | ') || '(none)'}`);
    }
  }
  if (changes.length > 20) console.log(`  …and ${changes.length - 20} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await db.execute({
      sql: `UPDATE job_details
            SET license_requirements = ?, description = ?, vehicle_required = ?
            WHERE id = ?`,
      args: [c.licensesTo, c.descriptionTo, c.vehicleTo, c.id],
    });
  }
  console.log(`[license-cleanup] Updated ${changes.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/license-cleanup-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Licence field fill + qualification strip — 2026-08-04',
    '',
    `Updated: ${changes.length} rows.`,
    `- License field changed: ${licenseUpdates} (newly filled from empty: ${licenseFills})`,
    `- Description bullets stripped: ${descStrips}`,
    `- vehicle_required set from driver licence: ${vehicleSets}`,
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(c => c.id),
    '```',
    '',
  ].join('\n'));
  console.log(`[license-cleanup] Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
