import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { saveRawJob } from '../db';

type WorkableSummary = {
  id: string | number;
  shortcode: string;
  title: string;
  published?: string;
  department?: string[];
  location?: { city?: string; region?: string; country?: string };
};

type WorkableDetail = WorkableSummary & {
  description?: string;
  requirements?: string;
  benefits?: string;
  locations?: Array<{ city?: string; region?: string; country?: string }>;
};

export type WorkableJob = {
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

function htmlToText(value: string | undefined): string {
  return decodeHtml(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function locationText(job: WorkableDetail): string {
  const locations = job.locations?.length ? job.locations : job.location ? [job.location] : [];
  return locations
    .map(location => [location.city, location.region, location.country].filter(Boolean).join(', '))
    .filter(Boolean)
    .join('; ');
}

export function extractWorkableJobs(payload: unknown, account: string): WorkableJob[] {
  const results = (payload as { results?: WorkableSummary[] })?.results;
  if (!Array.isArray(results)) return [];
  const seen = new Set<string>();
  return results.flatMap((job) => {
    if (!job.shortcode || !job.title || seen.has(job.shortcode)) return [];
    seen.add(job.shortcode);
    const url = `https://apply.workable.com/${account}/j/${job.shortcode}/`;
    return [{
      id: `workable_${job.shortcode}`,
      title: job.title,
      url,
      applicationUrl: url,
      ...(job.published ? { postedAt: job.published } : {}),
      rawText: job.title,
    }];
  });
}

export function enrichWorkableJob(summary: WorkableJob, detail: WorkableDetail): WorkableJob {
  const sections = [
    detail.description ? htmlToText(detail.description) : '',
    detail.requirements ? `Requirements:\n${htmlToText(detail.requirements)}` : '',
    detail.benefits ? `Benefits:\n${htmlToText(detail.benefits)}` : '',
  ].filter(Boolean);
  const metadata = [
    detail.department?.length ? `Department: ${detail.department.join(', ')}` : '',
    locationText(detail) ? `Location: ${locationText(detail)}` : '',
  ].filter(Boolean);
  return {
    ...summary,
    title: detail.title || summary.title,
    postedAt: detail.published || summary.postedAt,
    rawText: [detail.title || summary.title, ...metadata, ...sections].join('\n\n'),
  };
}

export async function scrapeWorkable(
  db: Client,
  _context: BrowserContext,
  account: string,
  sourceName: string,
) {
  const listEndpoint = `https://apply.workable.com/api/v3/accounts/${encodeURIComponent(account)}/jobs`;
  const listResponse = await fetch(listEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!listResponse.ok) throw new Error(`Workable jobs API returned HTTP ${listResponse.status}`);

  const summaries = extractWorkableJobs(await listResponse.json(), account);
  console.log(`\nScraping ${sourceName} (Workable) — ${summaries.length} jobs`);
  for (const summary of summaries) {
    const shortcode = summary.id.replace(/^workable_/, '');
    const detailResponse = await fetch(`https://apply.workable.com/api/v2/accounts/${encodeURIComponent(account)}/jobs/${encodeURIComponent(shortcode)}`);
    if (!detailResponse.ok) throw new Error(`Workable detail API returned HTTP ${detailResponse.status} for ${shortcode}`);
    const job = enrichWorkableJob(summary, await detailResponse.json() as WorkableDetail);
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
