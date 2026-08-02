import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage } from '../utils';

type SelkirkClassification = {
  name?: string;
  values?: Array<{ class_val?: string }>;
};

export type SelkirkJob = {
  id: string | number;
  title: string;
  weblink: string;
  publication?: {
    internet?: {
      closing_date?: string;
    };
  };
  classifications?: Record<string, SelkirkClassification>;
};

export function extractSelkirkJobs(payload: unknown): Array<{
  id: string;
  title: string;
  url: string;
  location?: string;
  closingDate?: string;
}> {
  const jobs = (payload as { jobs?: SelkirkJob[] })?.jobs;
  if (!Array.isArray(jobs)) return [];

  const seen = new Set<string>();
  return jobs.flatMap((job) => {
    if (job.id === undefined || !job.title || !job.weblink) return [];
    const id = `selkirk_${job.id}`;
    if (seen.has(id)) return [];
    seen.add(id);

    const result = {
      id,
      title: job.title,
      url: job.weblink,
    } as {
      id: string;
      title: string;
      url: string;
      location?: string;
      closingDate?: string;
    };

    const location = Object.values(job.classifications ?? {})
      .find((classification) => classification.name?.toLowerCase() === 'location')
      ?.values
      ?.map((value) => value.class_val?.trim())
      .filter(Boolean)
      .join(', ');
    if (location) result.location = location;

    const closingDate = job.publication?.internet?.closing_date?.trim();
    if (closingDate) result.closingDate = closingDate;
    return [result];
  });
}

export async function scrapeSelkirk(
  db: Client,
  context: BrowserContext,
  sourceName: string,
) {
  const endpoint = 'https://careers.selkirk.ca/utf8/ic_job_feeds.feed_engine';
  const params = new URLSearchParams({
    p_web_site_id: '100018',
    p_published_to: 'WWW',
    p_language: 'DEFAULT',
    p_direct: 'Y',
    p_format: 'MOBILE',
    p_include_exclude_from_list: 'N',
    p_summary: 'Y',
  });
  const response = await fetch(`${endpoint}?${params}`);
  if (!response.ok) throw new Error(`Selkirk Hireserve feed returned HTTP ${response.status}`);

  const jobs = extractSelkirkJobs(await response.json());
  console.log(`\nScraping ${sourceName} (Hireserve) — ${jobs.length} jobs`);
  for (const job of jobs) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
}
