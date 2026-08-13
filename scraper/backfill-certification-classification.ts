/**
 * Remove clearly misclassified values from Certifications and move named
 * security/medical requirements into their existing structured fields.
 *
 *   npx tsx backfill-certification-classification.ts --active-only       # dry-run
 *   npx tsx backfill-certification-classification.ts --active-only --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeCertificationRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

function parseList(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim()) : [];
  } catch {
    return [];
  }
}

function sameList(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function medicalFrom(value: string): string | null {
  if (/anti-rabies vaccination|rabies titer/i.test(value)) return 'Anti-rabies vaccination or recent rabies titer check';
  if (/proof of immunity for hepatitis b/i.test(value)) return 'Proof of immunity for Hepatitis B';
  return null;
}

function isSecurityCheck(value: string): boolean {
  return /criminal records?|vulnerable sector|police check|security clearance|background check/i.test(value);
}

type Change = {
  id: string;
  source: string;
  title: string;
  certificationsFrom: string[];
  certificationsTo: string[];
  medicalFrom: string[];
  medicalTo: string[];
  securityFrom: number | null;
  securityTo: number | null;
};

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, d.job_title, d.certification_requirements,
           d.medical_requirements, d.security_check_required
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.certification_requirements IS NOT NULL
      AND d.certification_requirements NOT IN ('', '[]')
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
    ORDER BY j.source, j.id
  `);

  const changes: Change[] = [];
  for (const row of result.rows) {
    const certificationsFrom = parseList(row.certification_requirements);
    const medicalFromValues = parseList(row.medical_requirements);
    const medicalTo = [...medicalFromValues];
    let securityTo = row.security_check_required == null ? null : Number(row.security_check_required);

    for (const value of certificationsFrom) {
      const medical = medicalFrom(value);
      if (medical && !medicalTo.some(existing => existing.toLowerCase() === medical.toLowerCase())) medicalTo.push(medical);
      if (isSecurityCheck(value)) securityTo = 1;
    }

    const certificationsTo = normalizeCertificationRequirements(certificationsFrom);
    if (sameList(certificationsFrom, certificationsTo)
      && sameList(medicalFromValues, medicalTo)
      && securityTo === (row.security_check_required == null ? null : Number(row.security_check_required))) continue;

    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      certificationsFrom,
      certificationsTo,
      medicalFrom: medicalFromValues,
      medicalTo,
      securityFrom: row.security_check_required == null ? null : Number(row.security_check_required),
      securityTo,
    });
  }

  console.log(`Scanned ${result.rows.length} jobs.`);
  console.log(`Would update ${changes.length} job records.`);
  for (const change of changes.slice(0, 30)) {
    console.log(`- ${change.source} | ${change.title || change.id}`);
    if (!sameList(change.certificationsFrom, change.certificationsTo)) console.log(`  certifications: ${JSON.stringify(change.certificationsFrom)} → ${JSON.stringify(change.certificationsTo)}`);
    if (!sameList(change.medicalFrom, change.medicalTo)) console.log(`  medical: ${JSON.stringify(change.medicalFrom)} → ${JSON.stringify(change.medicalTo)}`);
    if (change.securityFrom !== change.securityTo) console.log(`  security: ${change.securityFrom} → ${change.securityTo}`);
  }
  if (changes.length > 30) console.log(`  …and ${changes.length - 30} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  await db.batch(changes.map(change => ({
    sql: `UPDATE job_details
          SET certification_requirements = ?, medical_requirements = ?, security_check_required = ?
          WHERE id = ?`,
    args: [JSON.stringify(change.certificationsTo), JSON.stringify(change.medicalTo), change.securityTo, change.id],
  })), 'write');

  const outPath = path.resolve(__dirname, '../docs/certification-classification-2026-08-05.md');
  fs.writeFileSync(outPath, [
    '# Certification classification cleanup — 2026-08-05',
    '',
    `Updated: ${changes.length} ${ACTIVE_ONLY ? 'active ' : ''}job records.`,
    'Security checks moved to security_check_required; named medical requirements moved to medical_requirements.',
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(change => change.id),
    '```',
    '',
  ].join('\n'));
  console.log(`Wrote ${outPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
