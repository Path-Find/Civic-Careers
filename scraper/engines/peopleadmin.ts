import { Client } from '@libsql/client';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage } from '../utils';

export interface PeopleAdminJob {
  id: string;
  title: string;
  url: string;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function peopleAdminJobId(url: string): string {
  const parsed = new URL(url);
  const postingId = parsed.pathname.match(/\/postings\/(\d+)(?:\/|$)/i)?.[1];
  const tenant = parsed.hostname.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase();
  return `peopleadmin_${tenant}_${postingId ?? 'unknown'}`;
}

function cleanHtmlText(value: string): string {
  return decodeXml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function extractPeopleAdminJobs(html: string, portalUrl: string): PeopleAdminJob[] {
  const portal = new URL(portalUrl);
  const jobs: PeopleAdminJob[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(/<a\b[^>]*href=["'](\/postings\/\d+\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, path, rawTitle] = match;
    if (!path || !rawTitle) continue;
    const url = new URL(path, portal.origin).toString();
    const title = cleanHtmlText(rawTitle);
    if (!title) continue;
    if (!new URL(url).pathname.match(/^\/postings\/\d+\/?$/i)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    jobs.push({ id: peopleAdminJobId(url), title, url });
  }

  return jobs;
}

export async function scrapePeopleAdmin(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  const portal = new URL(portalUrl);
  const jobs: PeopleAdminJob[] = [];
  const seen = new Set<string>();
  let pageNumber = 1;

  while (pageNumber <= 100) {
    const pageUrl = new URL('/postings/search', portal.origin);
    if (pageNumber > 1) pageUrl.searchParams.set('page', String(pageNumber));
    const response = await fetch(pageUrl);
    if (!response.ok) throw new Error(`${sourceName}: PeopleAdmin search returned HTTP ${response.status}`);

    const html = await response.text();
    const pageJobs = extractPeopleAdminJobs(html, portalUrl);
    const newJobs = pageJobs.filter((job) => !seen.has(job.url));
    for (const job of newJobs) {
      seen.add(job.url);
      jobs.push(job);
    }
    if (!newJobs.length || !html.includes(`postings/search?page=${pageNumber + 1}`)) break;
    pageNumber++;
  }

  console.log(`\nScraping ${sourceName} (PeopleAdmin) — ${jobs.length} jobs`);

  for (const job of jobs) {
    process.stdout.write(`\r[${sourceName}] ${job.title.slice(0, 70)}`);
    await scrapeRawAndStage(db, context, job, sourceName);
  }
  console.log(`\n[${sourceName}] Done — ${jobs.length} jobs discovered.`);
}
