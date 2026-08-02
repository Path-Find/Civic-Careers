import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { saveRawJob } from '../db';

export type ApplyToEducationJob = {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  postedAt?: string;
  rawText: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function field(body: string, name: string): string {
  const expression = new RegExp(`<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`, 'i');
  const match = body.match(expression);
  return decodeHtml((match?.[1] ?? match?.[2] ?? '').trim());
}

function htmlToText(value: string): string {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractApplyToEducationFeedUrls(html: string): string[] {
  const normalized = html.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
  const urls = [...normalized.matchAll(/https?:\/\/network\.applytoeducation\.com\/Applicant\/attSearchexXML\.aspx\?[^"'\\s<]+/gi)]
    .map(match => match[0].replace(/[\\'",]+$/, ''));
  return [...new Set(urls)];
}

export function extractApplyToEducationJobs(xml: string, idPrefix = 'ate'): ApplyToEducationJob[] {
  const jobs: ApplyToEducationJob[] = [];
  const seen = new Set<string>();
  for (const match of xml.matchAll(/<job\b[^>]*>([\s\S]*?)<\/job>/gi)) {
    const body = match[1] || '';
    const reference = field(body, 'referencenumber');
    const title = field(body, 'title');
    const url = field(body, 'url');
    const description = htmlToText(field(body, 'description'));
    if (!reference || !title || !url || !description || seen.has(reference)) continue;
    seen.add(reference);
    jobs.push({
      id: `${idPrefix}_${reference}`,
      title,
      url,
      applicationUrl: url,
      ...(field(body, 'date') ? { postedAt: field(body, 'date') } : {}),
      rawText: `${title}\n\n${description}`,
    });
  }
  return jobs;
}

export async function scrapeApplyToEducation(
  db: Client,
  _context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  const portalResponse = await fetch(portalUrl);
  if (!portalResponse.ok) throw new Error(`ApplyToEducation portal returned HTTP ${portalResponse.status}`);
  const feedUrls = extractApplyToEducationFeedUrls(await portalResponse.text());
  if (!feedUrls.length) throw new Error('No ApplyToEducation feed URLs found');

  const jobs = (await Promise.all(feedUrls.map(async (feedUrl) => {
    const response = await fetch(feedUrl);
    if (!response.ok) throw new Error(`ApplyToEducation feed returned HTTP ${response.status}`);
    return extractApplyToEducationJobs(await response.text());
  }))).flat();

  const deduplicated = [...new Map(jobs.map(job => [job.id, job])).values()];
  console.log(`\nScraping ${sourceName} (ApplyToEducation) — ${deduplicated.length} jobs`);
  for (const job of deduplicated) {
    await saveRawJob(db, {
      id: job.id,
      url: job.url,
      application_url: job.applicationUrl,
      source: sourceName,
      title: job.title,
      raw_text: job.rawText,
      posted_at: job.postedAt,
    });
  }
}
