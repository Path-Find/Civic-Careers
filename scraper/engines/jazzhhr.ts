import { Client } from '@libsql/client/http';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage } from '../utils';

export async function scrapeJazzHR(
  db: Client,
  context: BrowserContext,
  listingUrl: string,
  sourceName: string,
  idPrefix: string
) {
  const res = await fetch(listingUrl);
  const html = await res.text();

  const matches = [...html.matchAll(/href="(https:\/\/[^"]*\.applytojob\.com\/apply\/([A-Za-z0-9]+)\/[^"]*)"/g)];
  const seen = new Set<string>();
  const jobs = matches
    .filter(([, url, code]) => url && code)
    .map(([, url, code]) => ({ id: `${idPrefix}_${code!}`, url: url! }))
    .filter(j => !seen.has(j.id) && seen.add(j.id));

  console.log(`\nScraping ${sourceName} (Jazz HR) — ${jobs.length} jobs`);
  for (const job of jobs) {
    await scrapeRawAndStage(db, context, job, sourceName);
  }
}
