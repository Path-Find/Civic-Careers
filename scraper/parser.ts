import { deactivateExpiredJobs, discardRawJob, initDb, getUnparsedJobs, saveJob, saveJobDetails, markJobParsed, recordParseFailure, clearParseFailure, countStalledParseFailures } from './db';
import { parseJobWithAI, PARSER_VERSION } from './ai_parser';
import { githubRunUrl, looksUnrendered, notifyDiscord } from './utils';
import { normalizeDuration } from './duration';
import { normalizeLocation } from './location';
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

const CONCURRENCY = 5;

async function main() {
  const db = await initDb();
  const expiredBeforeParse = await deactivateExpiredJobs(db);
  if (expiredBeforeParse > 0) console.log(`[Expiry] Deactivated ${expiredBeforeParse} job(s) past their closing date.`);
  const rawJobs = await getUnparsedJobs(db);

  if (rawJobs.length === 0) {
    console.log('[Parser] Nothing to parse.');
    return;
  }

  console.log(`[Parser] Parsing ${rawJobs.length} jobs (${CONCURRENCY} concurrent)...`);
  let done = 0;
  const failedSources = new Set<string>();

  for (let i = 0; i < rawJobs.length; i += CONCURRENCY) {
    const batch = rawJobs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (raw) => {
      // Guards against raw_text that's just an unrendered SPA shell (see utils.ts) —
      // reject it locally, for free, instead of paying the AI to fail on it.
      // Also covers rows that were saved with this bug before the scraper fix went in;
      // they'll self-heal once the next scrape overwrites raw_text with real content.
      if (looksUnrendered(raw.raw_text) || /already expired|no longer available|position has been filled/i.test(raw.raw_text)) {
        await discardRawJob(db, raw.id);
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ⏭ (${raw.source}: invalid or expired page discarded)`);
        return;
      }
      const { data: aiResult, error } = await parseJobWithAI(raw.raw_text, raw.title ?? undefined);
      if (aiResult) {
        const sourceFix = GOVERNMENT_OF_CANADA_FIXES[raw.id];
        let description = sourceFix?.description ?? cleanJobDescription(aiResult.clean_description, aiResult.job_title, raw.source);
        const structuredRequirements = reconcileStructuredRequirements(description, {
          experience_requirements: aiResult.experience_requirements,
          education_requirements: aiResult.education_requirements,
          license_requirements: aiResult.license_requirements,
          benefits: aiResult.benefits,
          required_skills: aiResult.required_skills,
        }, raw.raw_text);
        const finalBenefits = BENEFIT_OVERRIDES[raw.id] ?? structuredRequirements.benefits;
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
        const listingType = normalizeListingType(
          extractListingType(`${raw.raw_text}\n${description}`, raw.title ?? aiResult.job_title, aiResult.is_inventory),
          aiResult.is_inventory,
        );
        const isInventory = listingType === 'inventory';
        await saveJob(db, { id: raw.id, url: raw.application_url ?? raw.url, source: raw.source, first_seen_at: raw.first_seen_at as string });
        await saveJobDetails(db, {
          id: raw.id,
          job_title: normalizeJobTitle(aiResult.job_title),
          department: aiResult.department,
          location: normalizeLocation(aiResult.location),
          salary_range: (aiResult.salary_min || aiResult.salary_max)
            ? `${aiResult.salary_min ?? ''} - ${aiResult.salary_max ?? ''} (${aiResult.salary_period})`
            : '',
          description,
          closing_date: aiResult.closing_date || '',
          is_inventory: isInventory ? 1 : 0,
          listing_type: listingType,
          is_student: isStudent,
          salary_min: aiResult.salary_min,
          salary_max: aiResult.salary_max,
          salary_period: normalizeSalaryPeriod(aiResult.salary_period),
          work_model: normalizeWorkModel(aiResult.work_model, aiResult.job_title),
          employment_type: normalizeEmploymentType(aiResult.employment_type),
          duration: normalizeDuration(aiResult.duration || extractWorkYearDuration(description) || ''),
          experience_requirements: JSON.stringify(structuredRequirements.experience_requirements),
          ...(() => {
            const u = normalizeUnionFields(aiResult.union_name, aiResult.is_unionized);
            return { is_unionized: u.is_unionized ? 1 : 0, union_name: u.union_name };
          })(),
          benefits: JSON.stringify(finalBenefits),
          required_skills: JSON.stringify(finalSkills),
          education_requirements: JSON.stringify(sourceFix?.educationRequirements ?? structuredRequirements.education_requirements),
          license_requirements: JSON.stringify(structuredRequirements.license_requirements),
          vehicle_required: requirementFlagToDb(vehicleRequired),
          language_requirements: JSON.stringify(finalLanguages),
          security_check_required: requirementFlagToDb(securityCheckRequired),
          certification_requirements: JSON.stringify(certificationRequirements.length ? certificationRequirements : aiResult.certification_requirements),
          software_requirements: JSON.stringify(finalSoftwareRequirements),
          medical_requirements: JSON.stringify(sourceFix?.medicalRequirements ?? aiResult.medical_requirements),
          responsibility_tags: JSON.stringify(aiResult.responsibility_tags),
          qualification_tags: JSON.stringify(aiResult.qualification_tags),
          posted_at: raw.posted_at,
          start_date: extractStartDate(`${raw.raw_text}\n${description}`),
          parser_version: PARSER_VERSION,
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
