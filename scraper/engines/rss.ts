import { Client } from '@libsql/client/http';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage } from '../utils';

export function extractRSSJobs(xml: string, idPrefix: string): Array<{ id: string; url: string }> {
  const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)];
  return items.flatMap(([, body]) => {
    if (!body) return [];
    const linkMatch = body.match(/<link>(.*?)<\/link>/);
    if (!linkMatch?.[1]) return [];
    const url = linkMatch[1].trim();
    const idMatch = url.match(/[?&](?:JOBID|jobid|id)=([^&]+)/i);
    if (!idMatch?.[1]) return [];
    return [{ id: `${idPrefix}_${idMatch[1].toLowerCase()}`, url }];
  });
}

export async function scrapeRSS(
  db: Client,
  context: BrowserContext,
  feedUrl: string,
  sourceName: string,
  idPrefix: string,
  warmupUrl?: string
) {
  const res = await fetch(feedUrl);
  const xml = await res.text();

  const jobs = extractRSSJobs(xml, idPrefix);
  console.log(`\nScraping ${sourceName} (RSS) — ${jobs.length} jobs`);

  // Njoyn-backed feeds (confirmed on City of Kingston) reject deep links to
  // individual job detail pages with "Invalid request XWPGN01" unless the
  // browser session first visited the site's own job-listing page — the RSS
  // feed's <link> URLs work fine once a real session/referrer exists, but
  // fail 100% of the time hit cold. One warmup navigation fixes every
  // subsequent job in the same browser context.
  if (warmupUrl) {
    const page = await context.newPage();
    await page.goto(warmupUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.close();
  }

  for (const job of jobs) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
}
