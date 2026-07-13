import { initDb, getUnparsedJobs, saveJob, saveJobDetails, markJobParsed, cleanupExpiredJobs } from './db';
import { parseJobWithAI } from './ai_parser';
import { looksUnrendered } from './utils';

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

  for (let i = 0; i < rawJobs.length; i += CONCURRENCY) {
    const batch = rawJobs.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (raw) => {
      // Guards against raw_text that's just an unrendered SPA shell (see utils.ts) —
      // reject it locally, for free, instead of paying the AI to fail on it.
      // Also covers rows that were saved with this bug before the scraper fix went in;
      // they'll self-heal once the next scrape overwrites raw_text with real content.
      if (looksUnrendered(raw.raw_text)) {
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source}: unrendered page, skipped before AI call)`);
        return;
      }
      const aiResult = await parseJobWithAI(raw.raw_text);
      if (aiResult) {
        await saveJob(db, { id: raw.id, url: raw.url, source: raw.source });
        await saveJobDetails(db, {
          id: raw.id,
          job_title: aiResult.job_title,
          department: aiResult.department,
          location: aiResult.location,
          salary_range: (aiResult.salary_min || aiResult.salary_max)
            ? `${aiResult.salary_min ?? ''} - ${aiResult.salary_max ?? ''} (${aiResult.salary_period})`
            : '',
          description: aiResult.clean_description,
          closing_date: aiResult.closing_date || '',
          is_inventory: aiResult.is_inventory ? 1 : 0,
          is_student: aiResult.is_student ? 1 : 0,
          salary_min: aiResult.salary_min,
          salary_max: aiResult.salary_max,
          salary_period: aiResult.salary_period,
          work_model: aiResult.work_model,
          employment_type: aiResult.employment_type,
          duration: aiResult.duration,
          is_unionized: aiResult.is_unionized ? 1 : 0,
          union_name: aiResult.union_name,
          benefits: JSON.stringify(aiResult.benefits),
          required_skills: JSON.stringify(aiResult.required_skills),
        });
        await markJobParsed(db, raw.id);
        done++;
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ✅`);
      } else {
        process.stdout.write(`\r[Parser] ${done}/${rawJobs.length} ❌ (${raw.source}: ${raw.url.slice(-40)})`);
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

  if (process.env.DISCORD_WEBHOOK_URL) {
    const postingWord = rawJobs.length === 1 ? 'posting' : 'postings';
    const failed = rawJobs.length - done;
    const failedNote = failed > 0 ? ` (${failed} failed)` : '';
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'GovJobs',
        content: `Parse done — processed ${done} of ${rawJobs.length} job ${postingWord}${failedNote}.`,
      }),
    });
  }
}

main().catch(console.error);
