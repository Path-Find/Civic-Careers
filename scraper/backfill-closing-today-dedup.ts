/**
 * Remove structured-property restatements from the body of jobs closing on a
 * given date or on/after a given date. The default is the current Toronto
 * calendar date.
 *
 *   npx tsx backfill-closing-today-dedup.ts                 # dry-run
 *   npx tsx backfill-closing-today-dedup.ts --apply         # write changes
 *   npx tsx backfill-closing-today-dedup.ts --date=2026-08-05 --apply
 *   npx tsx backfill-closing-today-dedup.ts --from-date=2026-08-19 --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { isRedundantCompensationSection, removePlaceholderSections, stripStructuredBenefitRestatements } from './cleanup_description';
import {
  normalizeEducationRequirements,
  normalizeProfessionalLicenseRequirements,
  stripStructuredQualBullets,
} from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const dateArgument = process.argv.find(argument => argument.startsWith('--date='))?.slice('--date='.length);
const fromDateArgument = process.argv.find(argument => argument.startsWith('--from-date='))?.slice('--from-date='.length);
const TARGET_DATE = dateArgument || fromDateArgument || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const RANGE_FROM_DATE = fromDateArgument && !dateArgument ? fromDateArgument : null;

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function removeRedundantCompensationSections(description: string): string {
  return description
    .split(/(?=^##\s+)/m)
    .map(chunk => {
      const match = chunk.match(/^##\s+(.+?)(?:\n|$)/);
      if (!match || !isRedundantCompensationSection(match[1], chunk.slice(match[0].length))) return chunk;
      return '';
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const result = await db.execute(`
    SELECT d.id, d.job_title, d.description, d.closing_date, j.source,
           d.education_requirements, d.experience_requirements, d.license_requirements,
           d.language_requirements, d.required_skills, d.software_requirements,
           d.is_student, d.vehicle_required, d.security_check_required,
           d.certification_requirements, d.benefits
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE j.is_active = 1
      AND substr(d.closing_date, 1, 10) ${RANGE_FROM_DATE ? '>= ?' : '= ?'}
    ORDER BY j.source, d.job_title
  `, [TARGET_DATE]);

  const changes: Array<{ id: string; source: string; title: string; before: string; after: string }> = [];

  for (const row of result.rows) {
    const before = String(row.description ?? '');
    const benefits = parseList(row.benefits);
    let after = removeRedundantCompensationSections(before);
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const previous = after;
      after = stripStructuredBenefitRestatements(after, benefits);
      after = stripStructuredQualBullets(after, {
        licenses: normalizeProfessionalLicenseRequirements(parseList(row.license_requirements)),
        education: normalizeEducationRequirements(parseList(row.education_requirements)),
        experience: parseList(row.experience_requirements),
        languages: parseList(row.language_requirements),
        requiredSkills: parseList(row.required_skills),
        software: parseList(row.software_requirements),
        certifications: parseList(row.certification_requirements),
        studentRequired: Number(row.is_student) === 1,
        vehicleRequired: Number(row.vehicle_required) === 1,
        securityRequired: Number(row.security_check_required) === 1,
        allSections: true,
      });
      after = removePlaceholderSections(after);
      if (after === previous) break;
    }

    if (after !== before) changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? row.id),
      before,
      after,
    });
  }

  console.log(`${RANGE_FROM_DATE ? 'Closing date on/after' : 'Closing date'} ${TARGET_DATE}: scanned ${result.rows.length}; would update ${changes.length}`);
  for (const change of changes.slice(0, 30)) {
    const delta = change.after.length - change.before.length;
    console.log(`- ${change.source} | ${change.title} [${delta >= 0 ? '+' : ''}${delta}ch]`);
  }
  if (changes.length > 30) console.log(`  …and ${changes.length - 30} more`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  const BATCH = 40;
  for (let index = 0; index < changes.length; index += BATCH) {
    await db.batch(
      changes.slice(index, index + BATCH).map(change => ({
        sql: 'UPDATE job_details SET description = ? WHERE id = ?',
        args: [change.after, change.id],
      })),
      'write',
    );
  }
  console.log(`Updated ${changes.length} rows.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
