import { deactivateExpiredJobs, discardRawJob, markRawJobBlocked, initDb, getUnparsedJobs, saveJob, saveJobDetails, finalizeParsedJob, recordParseFailure, clearParseFailure, countStalledParseFailures, setPublicationStatus } from './db';
import { parseJobWithAI, PARSER_VERSION } from './ai_parser';
import { githubRunUrl, notifyDiscord } from './utils';
import { classifyRawCapture, isBlockedCapture } from './capture-quality';
import { buildParsedCandidate, type ParserRawJob } from './parser-pipeline';

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
      const captureQuality = classifyRawCapture(raw.source, raw.raw_text);
      const tooShort = raw.raw_text.trim().length < 100;
      if (tooShort || !captureQuality.valid) {
        const blocked = tooShort || (!captureQuality.valid && isBlockedCapture(captureQuality.issue));
        if (blocked) {
          await markRawJobBlocked(db, { id: raw.id, url: raw.url, application_url: raw.application_url, source: raw.source, title: raw.title ?? undefined, raw_text: raw.raw_text });
          process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ⏭ (${raw.source}: blocked, needs attention)`);
        } else {
          await discardRawJob(db, raw.id);
          process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ⏭ (${raw.source}: invalid capture discarded)`);
        }
        return;
      }

      const { data: aiResult, error } = await parseJobWithAI(raw.raw_text, raw.title ?? undefined);
      if (!aiResult) {
        failedSources.add(raw.source);
        await recordParseFailure(db, { id: raw.id, url: raw.url, source: raw.source, reason: error });
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source} ${raw.id}: ${error})`);
        return;
      }

      try {
        const candidate = buildParsedCandidate(raw as ParserRawJob, aiResult);
        if (candidate.quality.status === 'hidden') {
          await setPublicationStatus(db, raw.id, 'hidden');
          await recordParseFailure(db, {
            id: raw.id,
            url: raw.url,
            source: raw.source,
            reason: `permanent: quality gate: ${candidate.quality.reasons.join('; ')}`,
          });
          failedSources.add(raw.source);
          process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ⛔ (${raw.source} ${raw.id}: ${candidate.quality.reasons.join('; ')})`);
          return;
        }

        await saveJob(db, { id: raw.id, url: raw.application_url ?? raw.url, source: raw.source, first_seen_at: raw.first_seen_at });
        await saveJobDetails(db, {
          ...candidate,
          parser_version: PARSER_VERSION,
        });
        await finalizeParsedJob(db, raw.id);
        await clearParseFailure(db, raw.id);
        done++;
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ✅`);
      } catch (parseError) {
        const reason = parseError instanceof Error ? parseError.message : String(parseError);
        failedSources.add(raw.source);
        await recordParseFailure(db, { id: raw.id, url: raw.url, source: raw.source, reason });
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source} ${raw.id}: ${reason})`);
      }
    }));
  }

  console.log('[Parser] Done.');

  const failed = rawJobs.length - done;
  const stalled = await countStalledParseFailures(db);
  const expiredAfterParse = await deactivateExpiredJobs(db);
  if (expiredAfterParse > 0) console.log(`[Expiry] Deactivated ${expiredAfterParse} job(s) past their closing date after parsing.`);
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
