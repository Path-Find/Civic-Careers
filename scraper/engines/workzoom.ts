import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage, safeGoto, urlId } from '../utils';

export type WorkzoomJob = {
  title: string;
  requisition: string;
  url: string;
  location?: string;
};

export function extractWorkzoomJobs(rows: Array<{
  title?: string;
  requisition?: string;
  url?: string;
  location?: string;
}>, portalUrl: string) {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const title = row.title?.trim() || '';
    const requisition = row.requisition?.trim() || '';
    if (!title || !requisition || !row.url || seen.has(requisition)) return [];
    seen.add(requisition);
    const url = new URL(row.url, portalUrl).toString();
    return [{
      id: urlId(url),
      title,
      url,
      location: row.location?.trim() || undefined,
    }];
  });
}

export async function scrapeWorkzoom(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  console.log(`Scraping ${sourceName} (Workzoom/CUROS)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, portalUrl, 60000);
    const rows = await page.locator('li.jobOpeningItem').evaluateAll((items) => items.map((item) => ({
      title: item.querySelector('.itemTitle')?.textContent || '',
      requisition: item.getAttribute('requisition_number') || '',
      url: item.getAttribute('data-url') || item.querySelector('a[href*="view=detail"]')?.getAttribute('href') || '',
      location: item.querySelector('.itemAddress')?.textContent || '',
    })));
    const jobs = extractWorkzoomJobs(rows, portalUrl);
    console.log(`[${sourceName}] Found ${jobs.length} jobs`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } finally {
    await page.close();
  }
}
