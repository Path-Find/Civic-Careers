import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

export type Jobs2WebSummary = { title: string; url: string };

export function dedupeJobs2WebSummaries(summaries: Jobs2WebSummary[]): Jobs2WebSummary[] {
  return [...new Map(summaries.map(summary => [summary.url, summary])).values()];
}

export function getNextJobs2WebStartRow(currentStartRow: number, hrefs: string[]): number | null {
  const nextRows = hrefs
    .map(href => {
      try {
        return Number(new URL(href).searchParams.get('startrow'));
      } catch {
        return NaN;
      }
    })
    .filter(startRow => Number.isInteger(startRow) && startRow > currentStartRow);
  return nextRows.length > 0 ? Math.min(...nextRows) : null;
}

export async function scrapeJobs2Web(db: Client, context: BrowserContext, portalUrl: string, sourceName: string) {
  const baseUrl = new URL(portalUrl).origin;
  console.log(`Scraping ${sourceName} (Jobs2Web)...`);
  const page = await context.newPage();
  try {
    let startRow = 0;
    let hasMore = true;
    const visitedStartRows = new Set<number>();
    while (hasMore) {
      if (visitedStartRows.has(startRow)) break;
      visitedStartRows.add(startRow);

      const url = `${baseUrl}/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=${startRow}`;
      console.log(`[${sourceName}] startrow=${startRow}...`);
      await safeGoto(page, url, 60000);
      await page.waitForTimeout(3000);
      await page.waitForSelector('a[href*="/job/"]', { timeout: 15000 }).catch(() => {});

      const summaries = dedupeJobs2WebSummaries(await page.evaluate((baseUrl) => {
        return Array.from(document.querySelectorAll('a[href*="/job/"]'))
          .map(l => {
            const href = (l as HTMLAnchorElement).getAttribute('href') || '';
            return {
              title: l.textContent?.trim() || '',
              url: href.startsWith('http') ? href : baseUrl + href,
            };
          })
          .filter(j => j.title && j.url);
      }, baseUrl));

      if (summaries.length === 0) { hasMore = false; break; }

      let count = 0;
      for (const job of summaries) {
        count++;
        const id = new URL(job.url).pathname.split('/').filter(Boolean).pop() || urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${startRow + count}/?`);
        await scrapeRawAndStage(db, context, { ...job, id }, sourceName);
      }
      console.log(`\n[${sourceName}] Got ${summaries.length} jobs at startrow=${startRow}.`);

      const nextStartRow = getNextJobs2WebStartRow(
        startRow,
        await page.evaluate(() => Array.from(document.querySelectorAll('a[href*="startrow="]'))
          .map(link => (link as HTMLAnchorElement).href)),
      );
      if (nextStartRow !== null) {
        startRow = nextStartRow;
      } else {
        hasMore = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
