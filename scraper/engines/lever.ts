import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client/http';
import { scrapeRawAndStage } from '../utils';

export type LeverPosting = {
  id: string;
  text: string;
  hostedUrl?: string;
  applyUrl?: string;
  categories?: {
    department?: string;
    location?: string;
    allLocations?: string[];
  };
};

export type LeverJob = {
  id: string;
  title: string;
  url: string;
  applicationUrl: string;
  department?: string;
  location?: string;
};

export function extractLeverJobs(payload: unknown, account: string): LeverJob[] {
  if (!Array.isArray(payload)) return [];

  const seen = new Set<string>();
  return payload.flatMap((entry): LeverJob[] => {
    const posting = entry as Partial<LeverPosting>;
    if (!posting.id || !posting.text || seen.has(posting.id)) return [];

    const url = posting.hostedUrl || `https://jobs.lever.co/${account}/${posting.id}`;
    seen.add(posting.id);
    const job: LeverJob = {
      id: `lever_${posting.id}`,
      title: posting.text,
      url,
      applicationUrl: posting.applyUrl || `${url.replace(/\/$/, '')}/apply`,
    };
    const department = posting.categories?.department;
    const location = posting.categories?.location || posting.categories?.allLocations?.join(', ');
    if (department) job.department = department;
    if (location) job.location = location;
    return [job];
  });
}

export async function scrapeLever(
  db: Client,
  context: BrowserContext,
  account: string,
  sourceName: string,
) {
  const endpoint = `https://api.lever.co/v0/postings/${encodeURIComponent(account)}?mode=json`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Lever API returned HTTP ${response.status}`);

  const jobs = extractLeverJobs(await response.json(), account);
  console.log(`\nScraping ${sourceName} (Lever) — ${jobs.length} jobs`);
  for (const job of jobs) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
}
