import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage } from '../utils';

export type HiringPlatformJob = {
  id: string;
  title: string;
  url: string;
  applicationUrl?: string;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/gi, "'");
}

export function extractHiringPlatformJobs(html: string, portalUrl: string): HiringPlatformJob[] {
  const jobs: HiringPlatformJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']*\/processes\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>([\s\S]*?)<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply\s*<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const processHref = match[1];
    const titleHtml = match[2];
    const applicationHref = match[4];
    if (!processHref || !titleHtml) continue;

    const url = new URL(processHref, portalUrl).href;
    const processId = new URL(url).pathname.match(/\/processes\/([^/]+)/i)?.[1];
    const title = decodeHtmlEntities(titleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!processId || !title || seen.has(processId)) continue;

    seen.add(processId);
    jobs.push({
      id: `hiringplatform_${processId}`,
      title,
      url,
      ...(applicationHref ? { applicationUrl: new URL(applicationHref, portalUrl).href } : {}),
    });
  }
  return jobs;
}

export async function scrapeHiringPlatform(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  const page = await context.newPage();
  try {
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const jobs = extractHiringPlatformJobs(await page.content(), portalUrl);
    console.log(`\nScraping ${sourceName} (HiringPlatform) — ${jobs.length} jobs`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, sourceName);
    }
  } finally {
    await page.close();
  }
}
