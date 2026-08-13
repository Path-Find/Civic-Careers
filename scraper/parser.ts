import { deactivateExpiredJobs, discardRawJob, initDb, getUnparsedJobs, saveJob, saveJobDetails, markJobParsed, recordParseFailure, clearParseFailure, countStalledParseFailures } from './db';
import { parseJobWithAI, PARSER_VERSION } from './ai_parser';
import { githubRunUrl, notifyDiscord } from './utils';
import { classifyRawCapture } from './capture-quality';
import { normalizeDuration } from './duration';
import { extractLabeledLocation, normalizeLocation } from './location';
import { normalizeJobTitle } from './title';
import { normalizeEmploymentType, normalizeSalaryPeriod, normalizeUnionFields, normalizeWorkModel } from './validate';
import {
  dedupeSkillsAgainstSoftware,
  extractCertificationRequirements,
  extractListingType,
  extractSecurityRequirementLabel,
  extractSoftwareRequirements,
  extractVehicleRequired,
  extractWorkYearDuration,
  appendExperienceQualificationBullets,
  normalizeLanguageRequirements,
  normalizeListingType,
  normalizeSecurityCheckRequired,
  normalizeVehicleRequired,
  reconcileStructuredRequirements,
  requirementFlagToDb,
  splitLanguageOutOfSkills,
  stripStructuredQualBullets,
} from './requirements';
import { cleanJobDescription, removePlaceholderSections, stripStructuredBenefitRestatements } from './cleanup_description';
import { GOVERNMENT_OF_CANADA_FIXES } from './source-fixes';
import { BENEFIT_OVERRIDES } from './benefit-fixes';
import { extractStartDate } from './start-date';
import { extractAcademicSchedule } from './academic-context';
import { sourceMetadataFixFor } from './source-metadata-fixes';
import { classifyCareerStage } from './career-stage';

const CONCURRENCY = Number(process.env.PARSER_CONCURRENCY ?? 2);
const ENABLE_DEEPSEEK_PARSER = process.env.ENABLE_DEEPSEEK_PARSER === 'true';

const EXCLUDED_SOURCES = (process.env.PARSE_EXCLUDE_SOURCES ?? '')
  .split(',')
  .map(source => source.trim())
  .filter(Boolean);

const REQUESTED_IDS = new Set(
  (process.env.PARSE_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
);

async function main() {
  if (!ENABLE_DEEPSEEK_PARSER) {
    console.log('[Parser] Automated DeepSeek parsing is paused. Parse jobs manually in Codex; set ENABLE_DEEPSEEK_PARSER=true only for an intentional provider run.');
    return;
  }

  const db = await initDb();
  const expiredBeforeParse = await deactivateExpiredJobs(db);
  if (expiredBeforeParse > 0) console.log(`[Expiry] Deactivated ${expiredBeforeParse} job(s) past their closing date.`);
  const queuedRawJobs = await getUnparsedJobs(db, EXCLUDED_SOURCES);
  const rawJobs = REQUESTED_IDS.size > 0
    ? queuedRawJobs.filter(raw => REQUESTED_IDS.has(raw.id))
    : queuedRawJobs;

  if (rawJobs.length === 0) {
    console.log('[Parser] Nothing to parse.');
    return;
  }

  console.log(`[Parser] Parsing ${rawJobs.length} jobs (${CONCURRENCY} concurrent)${EXCLUDED_SOURCES.length ? `; excluding ${EXCLUDED_SOURCES.join(', ')}` : ''}${REQUESTED_IDS.size ? `; selected IDs ${[...REQUESTED_IDS].join(', ')}` : ''}...`);
  let done = 0;
  const failedSources = new Set<string>();

  for (let i = 0; i < rawJobs.length; i += CONCURRENCY) {
    const batch = rawJobs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (raw) => {
      // Guards against raw_text that's just an unrendered SPA shell (see utils.ts) —
      // reject it locally, for free, instead of paying the AI to fail on it.
      // Also covers rows that were saved with this bug before the scraper fix went in;
      // they'll self-heal once the next scrape overwrites raw_text with real content.
      const captureQuality = classifyRawCapture(raw.source, raw.raw_text);
      if (raw.raw_text.trim().length < 100 || !captureQuality.valid) {
        await discardRawJob(db, raw.id);
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ⏭ (${raw.source}: invalid capture discarded)`);
        return;
      }
      const { data: aiResult, error } = await parseJobWithAI(raw.raw_text, raw.title ?? undefined);
      if (aiResult) {
        const sourceFix = GOVERNMENT_OF_CANADA_FIXES[raw.id];
        const sourceMetadataFix = sourceMetadataFixFor(raw.id, raw.raw_text);
        let description = sourceMetadataFix?.description || sourceFix?.description || cleanJobDescription(aiResult.clean_description, aiResult.job_title, raw.source);
        const structuredRequirements = reconcileStructuredRequirements(description, {
          experience_requirements: aiResult.experience_requirements,
          education_requirements: aiResult.education_requirements,
          license_requirements: aiResult.license_requirements,
          benefits: aiResult.benefits,
          required_skills: aiResult.required_skills,
        }, raw.raw_text);
        const finalBenefits = sourceMetadataFix?.benefits ?? BENEFIT_OVERRIDES[raw.id] ?? structuredRequirements.benefits;
        description = stripStructuredBenefitRestatements(description, finalBenefits);
        description = appendExperienceQualificationBullets(description, aiResult.experience_requirements ?? []);
        const certificationRequirements = (() => {
          const fromBody = extractCertificationRequirements(description);
          if (fromBody.length) return fromBody;
          return aiResult.certification_requirements ?? [];
        })();
        const softwareRequirements = extractSoftwareRequirements(description).values;
        const finalSoftwareRequirements = softwareRequirements.length ? softwareRequirements : aiResult.software_requirements;
        const skillsWithoutSoftware = dedupeSkillsAgainstSoftware(structuredRequirements.required_skills, finalSoftwareRequirements ?? []);
        const { skills: finalSkills, languages: languagesFromSkills } = splitLanguageOutOfSkills(skillsWithoutSoftware);
        const finalLanguages = normalizeLanguageRequirements([
          ...(aiResult.language_requirements ?? []),
          ...languagesFromSkills,
        ]);
        const vehicleFromDescription = extractVehicleRequired(description);
        const vehicleFromAI = normalizeVehicleRequired(aiResult.vehicle_required);
        const vehicleRequired = vehicleFromDescription === true
          ? true
          : (vehicleFromAI ?? vehicleFromDescription);
        const isStudent = sourceFix?.isStudent ?? (aiResult.is_student ? 1 : 0);
        const careerStage = classifyCareerStage({ title: aiResult.job_title, rawText: raw.raw_text, isStudent });
        description = stripStructuredQualBullets(description, {
          licenses: structuredRequirements.license_requirements,
          education: structuredRequirements.education_requirements,
          experience: structuredRequirements.experience_requirements,
          languages: finalLanguages,
          requiredSkills: finalSkills,
          software: finalSoftwareRequirements,
          certifications: certificationRequirements,
          studentRequired: isStudent === 1,
          vehicleRequired,
          allSections: true,
        });
        description = removePlaceholderSections(description);
        const securityFromLabel = extractSecurityRequirementLabel(description);
        const securityCheckRequired = sourceFix?.securityCheckRequired
          ?? normalizeSecurityCheckRequired(aiResult.security_check_required)
          ?? securityFromLabel;
        const parsedLocation = normalizeLocation(aiResult.location);
        const location = sourceMetadataFix?.location || parsedLocation || extractLabeledLocation(raw.raw_text);
        const listingType = normalizeListingType(
          extractListingType(`${raw.raw_text}\n${description}`, raw.title ?? aiResult.job_title, aiResult.is_inventory),
          aiResult.is_inventory,
        );
        const isInventory = listingType === 'inventory';
        await saveJob(db, { id: raw.id, url: raw.application_url ?? raw.url, source: raw.source, first_seen_at: raw.first_seen_at as string });
        await saveJobDetails(db, {
          id: raw.id,
          job_title: normalizeJobTitle(aiResult.job_title),
          department: sourceMetadataFix?.department ?? aiResult.department,
          location,
          workplace_address: aiResult.workplace_address,
          salary_range: sourceMetadataFix?.salaryRange ?? ((aiResult.salary_min || aiResult.salary_max)
            ? `${aiResult.salary_min ?? ''} - ${aiResult.salary_max ?? ''} (${aiResult.salary_period})`
            : ''),
          description,
          closing_date: aiResult.closing_date || '',
          is_inventory: isInventory ? 1 : 0,
          listing_type: listingType,
          is_student: isStudent,
          salary_min: sourceMetadataFix?.salaryMin ?? aiResult.salary_min,
          salary_max: sourceMetadataFix?.salaryMax ?? aiResult.salary_max,
          salary_period: sourceMetadataFix?.salaryPeriod ?? normalizeSalaryPeriod(aiResult.salary_period),
          work_model: normalizeWorkModel(aiResult.work_model, aiResult.job_title),
          employment_type: sourceMetadataFix?.employmentType ?? normalizeEmploymentType(aiResult.employment_type),
          duration: sourceMetadataFix?.duration ?? normalizeDuration(aiResult.duration || extractWorkYearDuration(description) || ''),
          hours: sourceMetadataFix?.hours ?? aiResult.hours,
          availability: aiResult.availability,
          academic_role_type: aiResult.academic_role_type,
          academic_course: aiResult.academic_course,
          academic_workload: aiResult.academic_workload,
          academic_office_hours: aiResult.academic_office_hours,
          academic_supervisor: aiResult.academic_supervisor,
          academic_appointment_type: aiResult.academic_appointment_type,
          academic_schedule: extractAcademicSchedule(raw.raw_text) || aiResult.academic_schedule,
          experience_requirements: JSON.stringify(sourceMetadataFix?.experienceRequirements ?? structuredRequirements.experience_requirements),
          ...(() => {
            const u = normalizeUnionFields(aiResult.union_name, aiResult.is_unionized);
            return { is_unionized: u.is_unionized ? 1 : 0, union_name: u.union_name };
          })(),
          benefits: JSON.stringify(finalBenefits),
          required_skills: JSON.stringify(finalSkills),
          education_requirements: JSON.stringify(sourceMetadataFix?.educationRequirements ?? sourceFix?.educationRequirements ?? structuredRequirements.education_requirements),
          license_requirements: JSON.stringify(sourceMetadataFix?.licenseRequirements ?? structuredRequirements.license_requirements),
          vehicle_required: requirementFlagToDb(vehicleRequired),
          language_requirements: JSON.stringify(sourceMetadataFix?.languageRequirements ?? finalLanguages),
          security_check_required: sourceMetadataFix?.securityCheckRequired ?? requirementFlagToDb(securityCheckRequired),
          certification_requirements: JSON.stringify(sourceMetadataFix?.certificationRequirements ?? (certificationRequirements.length ? certificationRequirements : aiResult.certification_requirements)),
          software_requirements: JSON.stringify(finalSoftwareRequirements),
          medical_requirements: JSON.stringify(sourceFix?.medicalRequirements ?? aiResult.medical_requirements),
          responsibility_tags: JSON.stringify(aiResult.responsibility_tags),
          qualification_tags: JSON.stringify(aiResult.qualification_tags),
          posted_at: raw.posted_at,
          start_date: extractStartDate(`${raw.raw_text}\n${description}`),
          parser_version: PARSER_VERSION,
          career_stage: careerStage,
        });
        await markJobParsed(db, raw.id);
        await clearParseFailure(db, raw.id);
        done++;
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ✅`);
      } else {
        failedSources.add(raw.source);
        await recordParseFailure(db, { id: raw.id, url: raw.url, source: raw.source, reason: error });
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source} ${raw.id}: ${error})`);
      }
    }));
  }

  console.log('[Parser] Done.');

  const failed = rawJobs.length - done;
  const stalled = await countStalledParseFailures(db);
  const expiredAfterParse = await deactivateExpiredJobs(db);
  if (expiredAfterParse > 0) console.log(`[Expiry] Deactivated ${expiredAfterParse} job(s) past their closing date after parsing.`);
  // Most per-run misses are transient (a page didn't render, one AI call came back
  // empty) — the job stays unparsed and just gets retried next run. Only jobs that
  // keep failing past MAX_PARSE_ATTEMPTS are a real, persistent problem worth a red run.
  if (stalled > 0) process.exitCode = 1;

  if (process.env.DISCORD_WEBHOOK_URL) {
    const postingWord = rawJobs.length === 1 ? 'posting' : 'postings';
    const runLink = githubRunUrl();
    const content = stalled > 0
      ? `🚨 GovJobs parser needs attention\n${stalled} ${postingWord} reached the retry limit${failedSources.size > 0 ? ` (sources: ${[...failedSources].join(', ')})` : ''}.\nStart a conversation with Codex to investigate and fix the parser.${runLink ? `\nRun: ${runLink}` : ''}`
      : failed > 0
        ? `⚠️ GovJobs parser: ${failed} ${postingWord} failed to parse this run (will retry automatically)${failedSources.size > 0 ? ` — sources: ${[...failedSources].join(', ')}` : ''}.${runLink ? `\nRun: ${runLink}` : ''}`
        : `✅ GovJobs parser complete — processed ${done} ${postingWord}.${runLink ? `\nRun: ${runLink}` : ''}`;
    await notifyDiscord(content);
  }
}

main().catch(async err => {
  console.error(err);
  await notifyDiscord(`🚨 GovJobs parser stopped before completion.\nStart a conversation with Codex to investigate and fix the parser.${githubRunUrl() ? `\nRun: ${githubRunUrl()}` : ''}`);
  process.exit(1);
});
