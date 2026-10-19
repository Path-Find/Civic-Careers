import { chromium, BrowserContext } from 'playwright';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@libsql/client';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeVipCloud } from './engines/vipcloud';
import { isExternalSourceBlock } from './utils';

const REQUIRED_SUCCESSFUL_RUNS = 3;
type SourceRunner = (db: Client, context: BrowserContext) => Promise<void>;

const SOURCES = {
  'City of Greater Sudbury': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'City of Greater Sudbury'),
  'Town of Whitchurch-Stouffville': (db: Client, context: BrowserContext) =>
    scrapeVipCloud(db, context, 'https://townofws-careers.vipcloud.ca/default', 'Town of Whitchurch-Stouffville'),
  'Town of Georgina': (db: Client, context: BrowserContext) =>
    scrapeVipCloud(db, context, 'https://georgina-careers.vipcloud.ca/default', 'Town of Georgina'),
} satisfies Record<string, SourceRunner>;

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext(BASE_CONFIG);

  const configuredTrialDbUrl = process.env.TRIAL_DB_URL?.trim();
  const trialDbUrl = configuredTrialDbUrl || `file:${join(await mkdtemp(join(tmpdir(), 'civic-careers-trial-')), 'trial.sqlite')}`;
  if (/^https?:/i.test(trialDbUrl) && process.env.ALLOW_LIVE_TRIAL_DB !== '1') {
    await browser.close();
    throw new Error('Refusing to run trial sources against a remote database. Set ALLOW_LIVE_TRIAL_DB=1 only for an intentional live trial.');
  }
  process.env.TURSO_URL = trialDbUrl;
  if (/^file:/i.test(trialDbUrl)) delete process.env.TURSO_AUTH_TOKEN;
  console.log(`[Trial] Using isolated database: ${trialDbUrl}`);

  const db = await initDb();
  let failed = false;

  async function runTrialSource(source: string, run: () => Promise<void>) {
    console.log(`\n=== ${source} ===`);
    try {
      await run();
      const count = await db.execute({
        sql: 'SELECT COUNT(*) AS count FROM raw_jobs WHERE source = ?',
        args: [source],
      });
      const jobCount = Number(count.rows[0]?.count ?? 0);
      if (jobCount === 0) {
        await db.execute({
          sql: `INSERT INTO trial_source_results
                  (source, consecutive_successes, last_status, last_job_count, last_run_at)
                VALUES (?, 0, 'empty', 0, CURRENT_TIMESTAMP)
                ON CONFLICT(source) DO UPDATE SET
                  consecutive_successes = 0,
                  last_status = 'empty',
                  last_job_count = 0,
                  last_run_at = CURRENT_TIMESTAMP`,
          args: [source],
        });
        console.warn(`[${source}] Trial returned no jobs; it cannot count toward promotion.`);
        return;
      }
      await db.execute({
        sql: `INSERT INTO trial_source_results
                (source, consecutive_successes, last_status, last_job_count, last_run_at)
              VALUES (?, 1, 'success', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(source) DO UPDATE SET
                consecutive_successes = trial_source_results.consecutive_successes + 1,
                last_status = 'success',
                last_job_count = excluded.last_job_count,
                last_run_at = CURRENT_TIMESTAMP`,
        args: [source, jobCount],
      });
      console.log(`[${source}] Trial success (${jobCount} stored jobs).`);
    } catch (err: any) {
      if (isExternalSourceBlock(err)) {
        await db.execute({
          sql: `INSERT INTO trial_source_results
                  (source, consecutive_successes, last_status, last_job_count, last_run_at)
                VALUES (?, 0, 'blocked', 0, CURRENT_TIMESTAMP)
                ON CONFLICT(source) DO UPDATE SET
                  last_status = 'blocked',
                  last_run_at = CURRENT_TIMESTAMP`,
          args: [source],
        });
        console.warn(`[${source}] Trial blocked by external source access: ${err.message}`);
        return;
      }
      failed = true;
      await db.execute({
        sql: `INSERT INTO trial_source_results
                (source, consecutive_successes, last_status, last_job_count, last_run_at)
              VALUES (?, 0, 'failed', 0, CURRENT_TIMESTAMP)
              ON CONFLICT(source) DO UPDATE SET
                consecutive_successes = 0,
                last_status = 'failed',
                last_job_count = 0,
                last_run_at = CURRENT_TIMESTAMP`,
        args: [source],
      });
      console.error(`[${source}] Trial failed: ${err.message}`);
    }
  }

  const requestedSources = new Set(
    (process.env.TRIAL_SOURCES ?? '')
      .split(',')
      .map(source => source.trim())
      .filter(Boolean),
  );
  const sourceEntries = Object.entries(SOURCES)
    .filter(([source]) => requestedSources.size === 0 || requestedSources.has(source));
  if (sourceEntries.length === 0) {
    throw new Error(`No trial sources matched TRIAL_SOURCES=${[...requestedSources].join(',')}`);
  }
  if (requestedSources.size > 0) {
    console.log(`[Trial] Running selected sources: ${sourceEntries.map(([source]) => source).join(', ')}`);
  }
  for (const [source, run] of sourceEntries) {
    await runTrialSource(source, () => run(db, context));
  }

  console.log('\n=== Trial pass counts ===');
  const results = await db.execute({
    sql: `SELECT source, consecutive_successes, last_status, last_job_count
          FROM trial_source_results
          WHERE source IN (${sourceEntries.map(() => '?').join(',')})
          ORDER BY source`,
    args: sourceEntries.map(([source]) => source),
  });
  for (const row of results.rows) {
    const status = row.last_status === 'success' && Number(row.consecutive_successes) >= REQUIRED_SUCCESSFUL_RUNS
      ? 'READY FOR PROMOTION'
      : row.last_status === 'blocked'
      ? 'WAITING FOR SOURCE ACCESS'
      : 'KEEP IN TRIAL';
    console.log(`${row.source}: ${row.last_status}, ${row.consecutive_successes}/${REQUIRED_SUCCESSFUL_RUNS} consecutive passes, ${row.last_job_count} stored jobs — ${status}`);
  }

  await browser.close();
  if (failed) process.exitCode = 1;
}

main().catch(err => { console.error(err); process.exit(1); });
