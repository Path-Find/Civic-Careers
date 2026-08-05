/**
 * Strip body bullets/sections that restate structured fields (QUALITY.md #1):
 * education, experience, licence, and salary-only Compensation blocks.
 *
 *   npx tsx backfill-strip-structured-restatements.ts           # dry-run
 *   npx tsx backfill-strip-structured-restatements.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { cleanJobDescription } from './cleanup_description';
import {
  normalizeEducationRequirements,
  normalizeProfessionalLicenseRequirements,
  stripStructuredQualBullets,
} from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT d.id, d.job_title, d.description, j.source,
           d.education_requirements, d.experience_requirements, d.license_requirements,
           d.language_requirements
    FROM job_details d
    JOIN jobs j ON j.id = d.id
    WHERE d.description IS NOT NULL AND d.description != ''
  `);

  type Change = { id: string; source: string; title: string; before: string; after: string; removedHint: string };
  const changes: Change[] = [];

  for (const row of result.rows) {
    const before = String(row.description ?? '');
    const education = normalizeEducationRequirements(parseList(row.education_requirements));
    const experience = parseList(row.experience_requirements);
    const licenses = normalizeProfessionalLicenseRequirements(parseList(row.license_requirements));
    const languages = parseList(row.language_requirements);

    let after = cleanJobDescription(before, String(row.job_title ?? ''), String(row.source ?? ''));
    after = stripStructuredQualBullets(after, { licenses, education, experience, languages });

    if (after === before) continue;

    const beforeBullets = (before.match(/^\s*[-•*]\s+.+$/gm) || []).length;
    const afterBullets = (after.match(/^\s*[-•*]\s+.+$/gm) || []).length;
    const droppedComp = /##\s*Compensation/i.test(before) && !/##\s*Compensation/i.test(after);
    const removedHint = [
      droppedComp ? 'comp' : '',
      beforeBullets > afterBullets ? `bullets ${beforeBullets - afterBullets}` : '',
      before.length - after.length > 0 ? `-${before.length - after.length}ch` : '',
    ].filter(Boolean).join(', ');

    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      before,
      after,
      removedHint,
    });
  }

  console.log(`Scanned ${result.rows.length}; would update ${changes.length}`);
  for (const c of changes.slice(0, 25)) {
    console.log(`- ${c.source} | ${c.title || c.id} [${c.removedHint}]`);
  }
  if (changes.length > 25) console.log(`  …and ${changes.length - 25} more`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  const BATCH = 40;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await db.batch(
      batch.map(c => ({
        sql: 'UPDATE job_details SET description = ? WHERE id = ?',
        args: [c.after, c.id],
      })),
      'write',
    );
    updated += batch.length;
  }
  console.log(`Updated ${updated} rows.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
