import { initDb, getUnparsedJobs, saveJob, saveJobDetails, markJobParsed, cleanupExpiredJobs, recordParseFailure, clearParseFailure, countStalledParseFailures } from './db';
import { parseJobWithAI, PARSER_VERSION } from './ai_parser';
import { githubRunUrl, looksUnrendered, notifyDiscord } from './utils';
import { extractCertificationRequirements, extractListingType, extractSoftwareRequirements, reconcileStructuredRequirements } from './requirements';
import { cleanJobDescription } from './cleanup_description';
import { GOVERNMENT_OF_CANADA_FIXES } from './source-fixes';

const CONCURRENCY = 5;

async function main() {
  const db = await initDb();
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
      if (looksUnrendered(raw.raw_text)) {
        failedSources.add(raw.source);
        await recordParseFailure(db, { id: raw.id, url: raw.url, source: raw.source, reason: 'permanent: unrendered page (SPA shell, skipped before AI call)' });
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source}: unrendered page, skipped before AI call)`);
        return;
      }
      const { data: aiResult, error } = await parseJobWithAI(raw.raw_text, raw.title ?? undefined);
      if (aiResult) {
        const sourceFix = GOVERNMENT_OF_CANADA_FIXES[raw.id];
        const description = sourceFix?.description ?? cleanJobDescription(aiResult.clean_description, aiResult.job_title, raw.source);
        const structuredRequirements = reconcileStructuredRequirements(description, {
          experience_requirements: aiResult.experience_requirements,
          education_requirements: aiResult.education_requirements,
          license_requirements: aiResult.license_requirements,
          benefits: aiResult.benefits,
          required_skills: aiResult.required_skills,
        });
        const certificationRequirements = extractCertificationRequirements(description);
        const softwareRequirements = extractSoftwareRequirements(description).values;
        const listingType = extractListingType(`${raw.raw_text}\n${description}`, raw.title ?? aiResult.job_title, aiResult.is_inventory);
        const isInventory = listingType === 'inventory' || aiResult.is_inventory;
        await saveJob(db, { id: raw.id, url: raw.application_url ?? raw.url, source: raw.source, first_seen_at: raw.first_seen_at as string });
        await saveJobDetails(db, {
          id: raw.id,
          job_title: aiResult.job_title,
          department: aiResult.department,
          location: aiResult.location,
          salary_range: (aiResult.salary_min || aiResult.salary_max)
            ? `${aiResult.salary_min ?? ''} - ${aiResult.salary_max ?? ''} (${aiResult.salary_period})`
            : '',
          description,
          closing_date: aiResult.closing_date || '',
          is_inventory: isInventory ? 1 : 0,
          listing_type: listingType,
          is_student: sourceFix?.isStudent ?? (aiResult.is_student ? 1 : 0),
          salary_min: aiResult.salary_min,
          salary_max: aiResult.salary_max,
          salary_period: aiResult.salary_period,
          work_model: aiResult.work_model,
          employment_type: aiResult.employment_type,
          duration: aiResult.duration,
          experience_requirements: JSON.stringify(structuredRequirements.experience_requirements),
          is_unionized: aiResult.is_unionized ? 1 : 0,
          union_name: aiResult.union_name,
          benefits: JSON.stringify(structuredRequirements.benefits),
          required_skills: JSON.stringify(structuredRequirements.required_skills),
          education_requirements: JSON.stringify(sourceFix?.educationRequirements ?? structuredRequirements.education_requirements),
          license_requirements: JSON.stringify(structuredRequirements.license_requirements),
          vehicle_required: aiResult.vehicle_required === null ? null : (aiResult.vehicle_required ? 1 : 0),
          language_requirements: JSON.stringify(aiResult.language_requirements),
          security_check_required: sourceFix?.securityCheckRequired ?? (aiResult.security_check_required === null ? null : (aiResult.security_check_required ? 1 : 0)),
          certification_requirements: JSON.stringify(certificationRequirements.length ? certificationRequirements : aiResult.certification_requirements),
          software_requirements: JSON.stringify(softwareRequirements.length ? softwareRequirements : aiResult.software_requirements),
          medical_requirements: JSON.stringify(sourceFix?.medicalRequirements ?? aiResult.medical_requirements),
          responsibility_tags: JSON.stringify(aiResult.responsibility_tags),
          qualification_tags: JSON.stringify(aiResult.qualification_tags),
          posted_at: raw.posted_at,
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

  const runMetaResult = await db.execute(
    `SELECT MIN(scraped_at) as started_at FROM raw_jobs WHERE scraped_at > datetime('now', '-12 hours')`
  );
  const startedAt = runMetaResult.rows[0]?.started_at as string | null;
  if (startedAt) {
    await cleanupExpiredJobs(db, startedAt);
    console.log('\n[Parser] Expired stale jobs.');
  }

  console.log('[Parser] Done.');

  const failed = rawJobs.length - done;
  const stalled = await countStalledParseFailures(db);
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
