import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage, safeGoto, urlId } from '../utils';

export async function scrapeNorthStar(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  console.log(`Scraping ${sourceName} (NorthStar ATS)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, portalUrl, 60000);

    const jobs = await page.evaluate(() => {
      const seen = new Set<string>();
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="javascript:Popup("]'))
        .flatMap((element) => {
          const href = element.getAttribute('href') || '';
          const match = href.match(/Popup\(['"](https?:\/\/www\.northstarats\.com\/[^'"]+)['"]\)/i);
          if (!match?.[1] || seen.has(match[1])) return [];
          seen.add(match[1]);
          return [{
            title: element.textContent?.trim() || 'NorthStar ATS posting',
            url: match[1],
          }];
        });
    }).then((summaries) => summaries.map((job) => ({ ...job, id: urlId(job.url) })));

    console.log(`[${sourceName}] Found ${jobs.length} postings.`);
    for (const [index, job] of jobs.entries()) {
      process.stdout.write(`\r[${sourceName}] ${index + 1}/${jobs.length}`);
      await scrapeRawAndStage(db, context, job, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
