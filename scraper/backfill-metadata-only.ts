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
  finalizeParsedJob,
  initDb,
  saveJob,
  saveJobDetails,
} from './db';
import { extractRecentRelativePostedDate, extractPostedDate, normalizePostedDate } from './posted-date';
import { extractAndStripAcademicMetadata, extractRawJobTitle, extractSourceAcademicCourse, extractSourceAcademicCourseFromRaw, extractSourceAcademicTerm, extractSourceAcademicTermFromRaw, isUsableJobTitle, normalizeJobTitle, normalizeSourceJobTitle } from './title';
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
  classifyStudentRequirement,
} from './requirements';
import { normalizeDuration } from './duration';
import { normalizeLocation } from './location';
import { classifyRawCapture } from './capture-quality';
import { formatCapturedDescription } from './fallback-description';
import { cleanSourceDescriptionBoilerplate } from './source-description-cleanup';
import { extractBoardSpecificMetadata } from './board-parsers';
import { evaluateJobQuality } from './quality-pipeline';
import { formatSalaryDisplay, parseSalaryText } from './salary-format';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
// Safe by default: do not rewrite any row that already has parsed details.
// --include-soft-parsed is an explicit maintenance escape hatch for a reviewed
// re-run of deterministic metadata, never the normal queue path.
const INCLUDE_SOFT_PARSED = process.argv.includes('--include-soft-parsed');
const SOFT_ONLY = process.argv.includes('--soft-only');
const INCLUDE_ARCHIVE = process.argv.includes('--include-archive');
const ACADEMIC_ONLY = process.argv.includes('--academic-only');
const SOURCE_ONLY = process.argv.find(arg => arg.startsWith('--source='))?.slice('--source='.length) ?? '';
const REQUESTED_IDS = new Set(
  (process.env.PARSE_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
);
const UNPARSED_ONLY = !INCLUDE_SOFT_PARSED;
const EXCLUDED_SOURCES = new Set(
  (process.env.EXCLUDE_SOURCES ?? '')
    .split(',')
    .map(source => source.trim())
    .filter(Boolean),
);
const DETERMINISTIC_PARSER_VERSION = 0;
// Each job still uses guarded writes and finalization; this only limits how
// many independent jobs are in flight so Neon latency does not make a large
// stored-capture replay unnecessarily slow.
const CONCURRENCY = 25;

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
  store: 'current' | 'archive';
};

const DATE_VALUE = '(?:[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})';
const CLOSING_DATE = new RegExp(`(?:posting\\s+end\\s+date|closing\\s+date|application\\s+deadline|apply\\s+by|deadline|applications?\\s+must\\s+be\\s+received[^:]{0,80})\\s*[:\\-]?\\s*(${DATE_VALUE})`, 'i');

function invalidRaw(source: string, rawText: string): boolean {
  const text = rawText.trim();
  return text.length < 100 || !classifyRawCapture(source, text).valid;
}

function extractLocation(rawText: string): string {
  const ottawa = rawText.match(/\b(Ottawa,\s*ON)(?=(?:Main|Lees)\s+Campus|Other|\btime\s+type|\bposted\s+on)/i)?.[1];
  if (ottawa) return normalizeLocation(ottawa);
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
  const sourceTitle = suppliedTitle || extractRawJobTitle(row.source, row.raw_text) || row.raw_text.match(/^[^\n]{3,160}/)?.[0] || row.id;
  const academicHeading = normalizeJobTitle(sourceTitle).replace(/-{2,}/g, ' - ').replace(/_/g, ' ');
  const academicMeta = extractAndStripAcademicMetadata(academicHeading, row.source);
  const title = normalizeSourceJobTitle(row.source, academicMeta.title || sourceTitle);
  const listingType = extractListingType(row.raw_text, title, false);
  const postedAt = extractPostedAt(row);
  // Title only, not the whole raw posting: "student"/"co-op" anywhere in the
  // body matches department names ("Student Systems"), software module names
  // ("Student Financials"), and roles that supervise students rather than
  // being for one. Live-data check found 615 of 700 jobs flagged this way
  // had no "student"/"co-op" word in the title at all -- including "Nurse
  // Practitioner", "Business Systems Analyst", "Research Scientist".
  const isStudent = classifyStudentRequirement(title, row.raw_text) ? 1 : 0;
  // [^.!] as a sentence-end boundary also excludes a period inside a dollar
  // amount ("$33.83"), truncating it to "$33" -- (?:[^.!]|\.(?=\d)) allows a
  // period through only when it's followed by a digit (a decimal point, not
  // a sentence end). Same fix applied to `hours` for the same reason.
  const salaryCapture = row.raw_text.match(/(?:salary\s*(?:range)?|pay\s*rate?s?|hourly\s*rate|compensation)\s*[:\-]?\s*([^\n]{3,180})/i)?.[1] || '';
  const parsedSalary = parseSalaryText(salaryCapture);
  const salary = parsedSalary?.display || '';
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
    salaryMin: parsedSalary?.min ?? null,
    salaryMax: parsedSalary?.max ?? null,
    salaryPeriod: parsedSalary?.period ?? null,
    academicTerm: academicMeta.academicTerm,
    academicCourse: extractSourceAcademicCourseFromRaw(row.source, row.raw_text)
      || extractSourceAcademicCourse(row.source, sourceTitle)
      || academicMeta.academicCourse,
    academicTerm: extractSourceAcademicTermFromRaw(row.source, row.raw_text)
      || extractSourceAcademicTerm(row.source, sourceTitle)
      || academicMeta.academicTerm,
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

function sanitizeDeterministicMetadata(details: ReturnType<typeof buildDetails>, row: RawRow) {
  const sanitized = { ...details };
  const clearableFields = new Set(['department', 'hours', 'salary', 'location', 'unionName']);
  const evaluate = () => evaluateJobQuality({
    source: row.source,
    title: sanitized.title,
    rawText: row.raw_text,
    url: row.url,
    applicationUrl: row.application_url,
    closingDate: sanitized.closingDate,
    closingDateStatus: sanitized.closingDate ? 'known' : 'open_until_filled',
    department: sanitized.department,
    hours: sanitized.hours,
    salary: sanitized.salary,
    location: sanitized.location,
    unionName: sanitized.unionName,
  });
  let quality = evaluate();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const field = quality.reasons[0]?.match(/^corrupted field: (\w+)$/)?.[1] ?? '';
    if (!clearableFields.has(field)) break;
    (sanitized as Record<string, unknown>)[field] = '';
    if (field === 'salary') {
      sanitized.salaryMin = null;
      sanitized.salaryMax = null;
      sanitized.salaryPeriod = null;
    }
    quality = evaluate();
  }
  return { details: sanitized, quality };
}

async function main() {
  const db = await initDb();

  const sourceExclusion = EXCLUDED_SOURCES.size > 0
    ? ` AND r.source NOT IN (${[...EXCLUDED_SOURCES].map(() => '?').join(',')})`
    : '';
  const academicSourceFilter = ACADEMIC_ONLY
    ? "AND (r.source ILIKE '%university%' OR r.source ILIKE '%college%' OR r.source ILIKE '%polytechnic%' OR r.source ILIKE '%institute%')"
    : '';
  const sourceOnlyFilter = SOURCE_ONLY ? 'AND r.source = ?' : '';
  const softOnlyFilter = SOFT_ONLY ? "AND j.publication_status = 'soft_parsed'" : '';
  const idFilter = REQUESTED_IDS.size
    ? `AND r.id IN (${[...REQUESTED_IDS].map(() => '?').join(',')})`
    : '';
  const parseScope = UNPARSED_ONLY
    ? 'r.parsed_at IS NULL'
    : '(r.parsed_at IS NULL OR d.id IS NULL OR d.parser_version = 0)';
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
      ${academicSourceFilter}
      ${sourceOnlyFilter}
      ${softOnlyFilter}
      ${idFilter}
    ORDER BY r.scraped_at ASC
  `,
    args: [...EXCLUDED_SOURCES, ...(SOURCE_ONLY ? [SOURCE_ONLY] : []), ...REQUESTED_IDS],
  });

  const currentRows = result.rows.map((row: any) => ({ ...row, store: 'current' as const }));
  const archiveExecute = (db as any).executeArchive;
  const archiveRows = INCLUDE_ARCHIVE && archiveExecute
    ? (await archiveExecute.call(db, {
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
        ${academicSourceFilter}
        ${sourceOnlyFilter}
        ${softOnlyFilter}
        ${idFilter}
      ORDER BY r.scraped_at ASC
    `,
      args: [...EXCLUDED_SOURCES, ...(SOURCE_ONLY ? [SOURCE_ONLY] : []), ...REQUESTED_IDS],
    })).rows.map((row: any) => ({ ...row, store: 'archive' as const }))
    : [];
  const rows = [...currentRows, ...archiveRows] as RawRow[];
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

  // Invalid captures remain in raw_jobs for later recovery. Publication
  // status repair keeps them hidden; deleting the source evidence would make
  // a future recapture or manual review impossible.

  let promoted = 0;
  let leftPending = 0;
  const pendingReasons = new Map<string, number>();
  const notePending = (reason: string) => {
    leftPending += 1;
    pendingReasons.set(reason, (pendingReasons.get(reason) ?? 0) + 1);
  };
  async function processRow(row: RawRow, writer: any) {
    const details = buildDetails(row);
    const sanitized = sanitizeDeterministicMetadata(details, row);
    const safeDetails = sanitized.details;
    const quality = sanitized.quality;
    if (quality.status === 'hidden') {
      // A corrupted field, an unusable/CTA title, or a status/flagged word in
      // the title. Never publish a job shell built from a field we know is
      // bad — leave it pending instead of guessing or partially fixing it.
      notePending(quality.reasons.join('; ') || 'quality gate');
      return;
    }
    const capturedDescription = formatCapturedDescription(row.raw_text, safeDetails.title);
    if (!capturedDescription) {
      // Non-Workday captures remain safe pending shells. Never hide a valid
      // source capture merely because this deterministic fallback does not
      // know how to turn it into a full description.
      notePending('could not format captured description');
      return;
    }
    const description = cleanSourceDescriptionBoilerplate(row.source, capturedDescription);
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

    await saveJob(writer, {
      id: row.id,
      url: row.application_url ?? row.url,
      source: row.source,
      first_seen_at: row.first_seen_at,
    });
    await saveJobDetails(writer, {
      id: row.id,
      job_title: quality.title,
      department: safeDetails.department || '',
      location: safeDetails.location,
      salary_range: safeDetails.salary,
      description,
      closing_date: safeDetails.closingDate,
      employment_type: safeDetails.employmentType,
      hours: safeDetails.hours,
      is_inventory: safeDetails.listingType === 'inventory' ? 1 : 0,
      listing_type: safeDetails.listingType,
      is_student: safeDetails.isStudent,
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
      posted_at: safeDetails.postedAt,
      parser_version: DETERMINISTIC_PARSER_VERSION,
      work_model: safeDetails.workModel || null,
      duration: normalizeDuration(safeDetails.duration || extractWorkYearDuration(description) || ''),
      is_unionized: safeDetails.isUnionized !== null && safeDetails.isUnionized !== undefined ? safeDetails.isUnionized : null,
      union_name: safeDetails.unionName || null,
      salary_min: safeDetails.salaryMin !== null && safeDetails.salaryMin !== undefined ? safeDetails.salaryMin : null,
      salary_max: safeDetails.salaryMax !== null && safeDetails.salaryMax !== undefined ? safeDetails.salaryMax : null,
      salary_period: safeDetails.salaryPeriod || null,
      academic_term: safeDetails.academicTerm || null,
      academic_course: safeDetails.academicCourse || null,
      vehicle_required: requirementFlagToDb(vehicleRequired),
      security_check_required: requirementFlagToDb(securityCheckRequired),
    });
    // A details write alone intentionally remains soft-parsed. Promote only
    // after the deterministic replay has produced a valid description and
    // passed the shared quality gate above.
    await finalizeParsedJob(writer, row.id, safeDetails.closingDate || null);
    if (safeDetails.postedAt) {
      await writer.execute({
        sql: `UPDATE raw_jobs SET posted_at = COALESCE(posted_at, ?) WHERE id = ?`,
        args: [safeDetails.postedAt, row.id],
      });
    }
    promoted += 1;
  }

  async function processWithSafeTransaction(row: RawRow) {
    const transaction = row.store === 'archive'
      ? (db as any).archiveTransaction
      : (db as any).currentTransaction;
    if (typeof transaction === 'function') {
      await transaction.call(db, (writer: any) => processRow(row, writer));
    } else {
      await processRow(row, db);
    }
  }

  for (let i = 0; i < genuine.length; i += CONCURRENCY) {
    await Promise.all(genuine.slice(i, i + CONCURRENCY).map(processWithSafeTransaction));
    console.log(`[Metadata backfill] Progress: ${Math.min(i + CONCURRENCY, genuine.length)}/${genuine.length}`);
  }

  console.log(`[Metadata backfill] Promoted ${promoted}; left pending ${leftPending}; discarded ${invalid.length}.`);
  if (pendingReasons.size > 0) console.log('[Metadata backfill] Pending reasons:', JSON.stringify(Object.fromEntries(pendingReasons), null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
