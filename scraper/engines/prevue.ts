import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client/http';
import { scrapeRawAndStage } from '../utils';

export type PrevueJob = {
  id: string | number;
  title: string;
  jobUrl: string;
  applicationUrl?: string;
  jobLocation?: string;
  endDateRef?: string;
  untilFilled?: number;
  employmentType?: string;
};

export function extractPrevueJobs(payload: unknown): Array<{
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  location?: string;
  closingDate?: string;
}> {
  const jobs = (payload as { data?: { jobs?: PrevueJob[] } })?.data?.jobs;
  if (!Array.isArray(jobs)) return [];

  const seen = new Set<string>();
  return jobs.flatMap((job) => {
    if (job.id === undefined || !job.title || !job.jobUrl) return [];
    const id = `prevue_${job.id}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const result = {
      id,
      title: job.title,
      url: job.jobUrl,
      applicationUrl: job.applicationUrl || job.jobUrl,
    } as {
      id: string;
      title: string;
      url: string;
      applicationUrl: string;
      location?: string;
      closingDate?: string;
    };
    if (job.jobLocation) result.location = job.jobLocation;
    if (!job.untilFilled && job.endDateRef) result.closingDate = job.endDateRef;
    return [result];
  });
}

export async function scrapePrevue(
  db: Client,
  context: BrowserContext,
  subdomain: string,
  siteId: number,
  sourceName: string,
) {
  const params = {
    isInternal: 0,
    showPayFrequency: 1,
    showLocation: 1,
    showEmploymentType: 1,
    showDate: 1,
  };
  const endpoint = `https://${subdomain}.prevueaps.ca/core/jobs/${siteId}?${new URLSearchParams({
    getParams: JSON.stringify(params),
  })}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`PrevueAPS API returned HTTP ${response.status}`);

  const jobs = extractPrevueJobs(await response.json());
  console.log(`\nScraping ${sourceName} (PrevueAPS) — ${jobs.length} jobs`);
  for (const job of jobs) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
}
