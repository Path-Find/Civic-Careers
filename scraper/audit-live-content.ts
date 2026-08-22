/**
 * Read-only content-level check for representative live posting URLs.
 * This opens existing stored URLs only; it does not scrape listings or write data.
 *
 *   npx tsx audit-live-content.ts --limit=10
 */
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import { initDb } from './db';
import { BASE_CONFIG, safeGoto } from './utils';

dotenv.config({ quiet: true });

const limit = Math.max(1, Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] ?? 10));

type Row = { source: string; id: string; title: string; url: string; application_url: string };

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length >= 4)
    .slice(0, 5);
}

async function main() {
  const db = await initDb() as any;
  const result = await db.execute({
    sql: `
      SELECT j.source, CAST(j.id AS text) AS id, d.job_title AS title,
             COALESCE(NULLIF(j.url, ''), NULLIF(raw.application_url, ''), raw.url) AS url,
             COALESCE(raw.application_url, '') AS application_url
      FROM jobs j
      JOIN job_details d ON d.id = j.id
      LEFT JOIN raw_jobs raw ON raw.id = j.id
      WHERE j.is_active = 1
        AND COALESCE(NULLIF(j.url, ''), NULLIF(raw.application_url, ''), raw.url) IS NOT NULL
        AND COALESCE(NULLIF(j.url, ''), NULLIF(raw.application_url, ''), raw.url) <> ''
      ORDER BY md5(j.id)
      LIMIT ?
    `,
    args: [limit],
  });
  const rows = result.rows as Row[];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(BASE_CONFIG);
  const checks: Array<Record<string, unknown>> = [];

  try {
    for (const row of rows) {
      const page = await context.newPage();
      try {
        await safeGoto(page, row.url, 30000);
        const body = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
        const normalizedBody = body.replace(/\s+/g, ' ').trim();
        const tokens = titleTokens(row.title);
        const matchedTokens = tokens.filter(token => normalizedBody.toLowerCase().includes(token));
        const blocked = /captcha|access denied|robot check|verify you are human|temporarily unavailable/i.test(normalizedBody);
        checks.push({
          source: row.source,
          id: row.id,
          title: row.title,
          requestedUrl: row.url,
          finalUrl: page.url(),
          pageTitle: await page.title().catch(() => ''),
          httpContent: normalizedBody.length > 200 && !blocked,
          bodyCharacters: normalizedBody.length,
          titleTokenMatches: matchedTokens.length,
          titleTokensChecked: tokens.length,
          titleContentMatch: tokens.length > 0 && matchedTokens.length >= Math.min(2, tokens.length),
          blockedOrChallenge: blocked,
        });
      } catch (error) {
        checks.push({
          source: row.source,
          id: row.id,
          title: row.title,
          requestedUrl: row.url,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const contentFailures = checks.filter(check => check.httpContent !== true || check.titleContentMatch !== true);
  console.log(JSON.stringify({
    readOnly: true,
    reScraped: false,
    rowsChecked: checks.length,
    contentFailures: contentFailures.length,
    checks,
  }, null, 2));
}

main().catch(error => {
  console.error('[Live content audit] Failed:', error);
  process.exitCode = 1;
});
