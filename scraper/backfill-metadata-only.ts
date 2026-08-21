/**
 * Promote genuine scraped postings without calling the AI parser.
 *
 * This is intentionally conservative: it fills only trusted listing metadata
 * and keeps the complete source text as the description. Invalid shells and
 * expired notices are discarded locally.
 *
 *   npx tsx backfill-metadata-only.ts           # dry-run
 *   npx tsx backfill-metadata-only.ts --apply
 */
import dotenv from 'dotenv';
import {
  discardRawJob,
  initDb,
  markJobParsed,
  saveJob,
  saveJobDetails,
} from './db';
import { extractRecentRelativePostedDate, extractPostedDate, normalizePostedDate } from './posted-date';
import { extractAndStripAcademicMetadata, extractRawJobTitle, isUsableJobTitle, normalizeJobTitle } from './title';
import {
  dedupeSkillsAgainstSoftware,
  extractCertificationRequirements,
  extractListingType,
  extractSecurityRequirementLabel,
  extractSoftwareRequirements,
  extractVehicleRequired,
  extractWorkYearDuration,
  normalizeLanguageRequirements,
  reconcileStructuredRequirements,
  requirementFlagToDb,
  splitLanguageOutOfSkills,
} from './requirements';
import { normalizeDuration } from './duration';
import { normalizeLocation } from './location';
import { classifyRawCapture } from './capture-quality';
import { formatCapturedDescription } from './fallback-description';
import { extractBoardSpecificMetadata } from './board-parsers';
import { getPublishBlockReason } from './publish-gate';
import { formatSalaryDisplay } from './salary-format';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
// Safe by default: do not rewrite any row that already has parsed details.
// --include-soft-parsed is an explicit maintenance escape hatch for a reviewed
// re-run of deterministic metadata, never the normal queue path.
const INCLUDE_SOFT_PARSED = process.argv.includes('--include-soft-parsed');
const UNPARSED_ONLY = !INCLUDE_SOFT_PARSED;
const EXCLUDED_SOURCES = new Set(
  (process.env.EXCLUDE_SOURCES ?? '')
    .split(',')
    .map(source => source.trim())
    .filter(Boolean),
);
const DETERMINISTIC_PARSER_VERSION = 0;
const CONCURRENCY = 10;

// When a section has no bullet markers, descriptionLines() can't split it and
// the whole paragraph is treated as one "line" — extractors built for real
// bullets then emit the entire run-on blob as a single requirement. The
// telltale sign is a missing space where a sentence boundary should be
// (e.g. "disciplineDemonstrated"), plus implausible length for one bullet.
function isPlausibleRequirementValue(value: string): boolean {
  if (value.length > 220) return false;
  const squishedSentenceJoins = value.match(/[a-z][A-Z]/g)?.length ?? 0;
  return squishedSentenceJoins < 2;
}

function filterPlausible(values: string[]): string[] {
  return values.filter(isPlausibleRequirementValue);
}

type RawRow = {
  id: string;
  url: string;
  application_url: string | null;
  source: string;
  raw_text: string;
  title: string | null;
  first_seen_at: string;
  posted_at: string | null;
};

const DATE_VALUE = '(?:[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})';
const CLOSING_DATE = new RegExp(`(?:posting\\s+end\\s+date|closing\\s+date|application\\s+deadline|apply\\s+by|deadline|applications?\\s+must\\s+be\\s+received[^:]{0,80})\\s*[:\\-]?\\s*(${DATE_VALUE})`, 'i');

function invalidRaw(source: string, rawText: string): boolean {
  const text = rawText.trim();
  return text.length < 100 || !classifyRawCapture(source, text).valid;
}

function extractLocation(rawText: string): string {
  const workday = /apply\s*locations?(.+?)(?:time\s*type|posted\s*on|job\s*requisition)/i.exec(rawText)?.[1];
  const labelled = /(?:^|\b)locations?\s*[:\-]?\s*(.+?)(?:\btime\s*type|\bposted\s+on|\bjob\s+requisition|\bdepartment\s*[:\-]|$)/i.exec(rawText)?.[1];
  return normalizeLocation((workday ?? labelled ?? '').replace(/\s+/g, ' ').trim());
}

function extractClosingDate(rawText: string): string {
  const value = CLOSING_DATE.exec(rawText)?.[1];
  return value ? normalizePostedDate(value) ?? '' : '';
}

function extractPostedAt(row: RawRow): string | null {
  return normalizePostedDate(row.posted_at)
    || extractPostedDate(row.raw_text)
    || extractRecentRelativePostedDate(row.raw_text);
}

function buildDetails(row: RawRow) {
  const suppliedTitle = isUsableJobTitle(row.title) ? row.title : '';
  const rawTitle = normalizeJobTitle(suppliedTitle || extractRawJobTitle(row.source, row.raw_text) || row.raw_text.match(/^[^\n]{3,160}/)?.[0] || row.id);
  const academicMeta = extractAndStripAcademicMetadata(rawTitle, row.source);
  const title = academicMeta.title;
  const listingType = extractListingType(row.raw_text, title, false);
  const postedAt = extractPostedAt(row);
  // Title only, not the whole raw posting: "student"/"co-op" anywhere in the
  // body matches department names ("Student Systems"), software module names
  // ("Student Financials"), and roles that supervise students rather than
  // being for one. Live-data check found 615 of 700 jobs flagged this way
  // had no "student"/"co-op" word in the title at all -- including "Nurse
  // Practitioner", "Business Systems Analyst", "Research Scientist".
  const isStudent = /\b(?:student|co-?op)\b/i.test(title) ? 1 : 0;
  // [^.!] as a sentence-end boundary also excludes a period inside a dollar
  // amount ("$33.83"), truncating it to "$33" -- (?:[^.!]|\.(?=\d)) allows a
  // period through only when it's followed by a digit (a decimal point, not
  // a sentence end). Same fix applied to `hours` for the same reason.
  const salary = row.raw_text.match(/(?:salary\s*(?:range)?|pay\s*rate?s?|hourly\s*rate|compensation)\s*[:\-]?\s*((?:[^.!]|\.(?=\d)){3,100}(?:\$|per\s+(?:hour|annum|year)|annual|hourly)(?:[^.!]|\.(?=\d)){0,40})/i)?.[1]?.trim() || '';
  const employmentType = row.raw_text.match(/\b(permanent\s+(?:full[- ]time|part[- ]time)|temporary\s+(?:full[- ]time|part[- ]time)|full[- ]time|part[- ]time|casual|contract)\b/i)?.[1] || '';
  const hours = row.raw_text.match(/(?:hours?\s+of\s+work|hours?\s+per\s+week|weekly\s+hours?\s+of\s+work|fte)\s*[:\-]?\s*((?:[^.;]|\.(?=\d)){3,100})/i)?.[1]?.trim() || '';

  const base = {
    title,
    listingType,
    postedAt,
    isStudent,
    location: extractLocation(row.raw_text),
    closingDate: extractClosingDate(row.raw_text),
    salary,
    employmentType,
    hours,
    department: '',
    workModel: null as 'Hybrid' | 'Remote' | 'On-site' | null,
    duration: null as string | null,
    isUnionized: null as number | null,
    unionName: null as string | null,
    salaryMin: null as number | null,
    salaryMax: null as number | null,
    salaryPeriod: null as string | null,
    academicTerm: academicMeta.academicTerm,
    academicCourse: academicMeta.academicCourse,
  };

  const custom = extractBoardSpecificMetadata(row.source, row.raw_text);

  const merged = {
    ...base,
    ...custom,
    location: custom.location !== undefined ? custom.location : base.location,
    closingDate: custom.closingDate !== undefined ? custom.closingDate : base.closingDate,
    salary: custom.salary !== undefined ? custom.salary : base.salary,
    employmentType: custom.employmentType !== undefined ? custom.employmentType : base.employmentType,
    hours: custom.hours !== undefined ? custom.hours : base.hours,
    // A board-parser that positively determined union status (even "not unionized")
    // wins; only fall back to a title-prefix guess when the parser never looked.
    unionName: custom.unionName !== undefined ? custom.unionName : (academicMeta.unionName || base.unionName),
    isUnionized: custom.isUnionized !== undefined ? custom.isUnionized : (academicMeta.unionName ? 1 : base.isUnionized),
  };

  const cleanSalary = formatSalaryDisplay(merged.salaryMin ?? null, merged.salaryMax ?? null, merged.salaryPeriod ?? null);
  return {
    ...merged,
    salary: cleanSalary || merged.salary,
  };
}

async function main() {
  const db = await initDb();

  const sourceExclusion = EXCLUDED_SOURCES.size > 0
    ? ` AND r.source NOT IN (${[...EXCLUDED_SOURCES].map(() => '?').join(',')})`
    : '';
  const parseScope = UNPARSED_ONLY
    ? 'r.parsed_at IS NULL'
    : '(r.parsed_at IS NULL OR d.parser_version = 0)';
  const safeRowGuard = UNPARSED_ONLY
    ? 'AND d.id IS NULL AND j.verified_at IS NULL'
    : 'AND j.verified_at IS NULL';
  const result = await db.execute({
    sql: `
    SELECT r.id, r.url, r.application_url, r.source, r.raw_text, r.title, r.first_seen_at, r.posted_at,
           d.parser_version
    FROM raw_jobs r
    LEFT JOIN job_details d ON d.id = r.id
    LEFT JOIN jobs j ON j.id = r.id
    WHERE ${parseScope}
      AND (r.raw_text IS NOT NULL AND r.raw_text != '')
      ${safeRowGuard}
      ${sourceExclusion}
    ORDER BY r.scraped_at ASC
  `,
    args: [...EXCLUDED_SOURCES],
  });

  const rows = result.rows as unknown as RawRow[];
  const invalid = rows.filter(row => invalidRaw(row.source, row.raw_text));
  const genuine = rows.filter(row => !invalidRaw(row.source, row.raw_text));
  console.log(`[Metadata backfill] ${APPLY ? 'Applying' : 'Dry run'}${UNPARSED_ONLY ? ' (safe unparsed-only)' : ' (including existing soft parses)'}: ${genuine.length} genuine row(s), ${invalid.length} invalid row(s).`);

  const bySource = new Map<string, number>();
  for (const row of genuine) bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);
  console.log('[Metadata backfill] Genuine by source:', JSON.stringify(Object.fromEntries(bySource), null, 2));

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write.');
    return;
  }

  for (const row of invalid) await discardRawJob(db, row.id);

  let promoted = 0;
  let leftPending = 0;
  async function processRow(row: RawRow) {
    const details = buildDetails(row);
    if (getPublishBlockReason(details)) {
      // A corrupted field, an unusable/CTA title, or a status/flagged word in
      // the title. Never publish a job shell built from a field we know is
      // bad — leave it pending instead of guessing or partially fixing it.
      leftPending += 1;
      return;
    }
    const description = formatCapturedDescription(row.raw_text, details.title);
    if (!description) {
      // Non-Workday captures remain safe pending shells. Never hide a valid
      // source capture merely because this deterministic fallback does not
      // know how to turn it into a full description.
      leftPending += 1;
      return;
    }
    // Body-side deterministic extraction — same functions the AI parser uses
    // to cross-check its own output, run here with no AI result to reconcile
    // against. Pure regex/keyword matching against the formatted description.
    const structuredRequirements = reconcileStructuredRequirements(description, {}, row.raw_text);
    const certificationRequirements = extractCertificationRequirements(description);
    const softwareRequirements = extractSoftwareRequirements(description).values;
    const skillsWithoutSoftware = dedupeSkillsAgainstSoftware(structuredRequirements.required_skills, softwareRequirements);
    const { skills: finalSkills, languages: languagesFromSkills } = splitLanguageOutOfSkills(skillsWithoutSoftware);
    const finalLanguages = normalizeLanguageRequirements(languagesFromSkills);
    const vehicleRequired = extractVehicleRequired(description);
    const securityCheckRequired = extractSecurityRequirementLabel(description);

    await saveJob(db, {
      id: row.id,
      url: row.application_url ?? row.url,
      source: row.source,
      first_seen_at: row.first_seen_at,
    });
    await saveJobDetails(db, {
      id: row.id,
      job_title: details.title,
      department: details.department || '',
      location: details.location,
      salary_range: details.salary,
      description,
      closing_date: details.closingDate,
      employment_type: details.employmentType,
      hours: details.hours,
      is_inventory: details.listingType === 'inventory' ? 1 : 0,
      listing_type: details.listingType,
      is_student: details.isStudent,
      benefits: JSON.stringify(filterPlausible(structuredRequirements.benefits)),
      required_skills: JSON.stringify(filterPlausible(finalSkills)),
      experience_requirements: JSON.stringify(filterPlausible(structuredRequirements.experience_requirements)),
      education_requirements: JSON.stringify(filterPlausible(structuredRequirements.education_requirements)),
      license_requirements: JSON.stringify(filterPlausible(structuredRequirements.license_requirements)),
      language_requirements: JSON.stringify(filterPlausible(finalLanguages)),
      certification_requirements: JSON.stringify(filterPlausible(certificationRequirements)),
      software_requirements: JSON.stringify(filterPlausible(softwareRequirements)),
      medical_requirements: JSON.stringify([]),
      responsibility_tags: JSON.stringify([]),
      qualification_tags: JSON.stringify([]),
      posted_at: details.postedAt,
      parser_version: DETERMINISTIC_PARSER_VERSION,
      work_model: details.workModel || null,
      duration: normalizeDuration(details.duration || extractWorkYearDuration(description) || ''),
      is_unionized: details.isUnionized !== null && details.isUnionized !== undefined ? details.isUnionized : null,
      union_name: details.unionName || null,
      salary_min: details.salaryMin !== null && details.salaryMin !== undefined ? details.salaryMin : null,
      salary_max: details.salaryMax !== null && details.salaryMax !== undefined ? details.salaryMax : null,
      salary_period: details.salaryPeriod || null,
      academic_term: details.academicTerm || null,
      academic_course: details.academicCourse || null,
      vehicle_required: requirementFlagToDb(vehicleRequired),
      security_check_required: requirementFlagToDb(securityCheckRequired),
    });
    if (details.postedAt) {
      await db.execute({
        sql: `UPDATE raw_jobs SET posted_at = COALESCE(posted_at, ?) WHERE id = ?`,
        args: [details.postedAt, row.id],
      });
    }
    promoted += 1;
  }

  for (let i = 0; i < genuine.length; i += CONCURRENCY) {
    await Promise.all(genuine.slice(i, i + CONCURRENCY).map(processRow));
    console.log(`[Metadata backfill] Progress: ${Math.min(i + CONCURRENCY, genuine.length)}/${genuine.length}`);
  }

  console.log(`[Metadata backfill] Promoted ${promoted}; left pending ${leftPending}; discarded ${invalid.length}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
