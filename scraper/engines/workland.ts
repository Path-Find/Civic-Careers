import { Client } from '@libsql/client/http';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage, safeGoto } from '../utils';

export async function scrapeWorkland(
  db: Client,
  context: BrowserContext,
  listingUrl: string,
  sourceName: string,
  idPrefix: string
) {
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    await page.waitForTimeout(6000);

    // Handle pagination: keep clicking next until no new jobs appear
    const seen = new Set<string>();
    let pageNum = 1;

    while (true) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      const pageJobs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/work/"]'))
          .map(a => ({ href: (a as HTMLAnchorElement).href }))
      );

      let added = 0;
      for (const { href } of pageJobs) {
        const m = href.match(/\/work\/(\d+)\//);
        if (!m?.[1] || seen.has(m[1])) continue;
        seen.add(m[1]);
        added++;
      }

      if (added === 0) break;

      // Try to click next page button
      const nextBtn = await page.$('a[ng-click*="next"], button[ng-click*="next"], a.next-page, li.next > a');
      if (!nextBtn) break;
      await nextBtn.click();
      await page.waitForTimeout(3000);
      pageNum++;
    }

    const jobs = await page.evaluate(() =>
      Array.from(new Map(
        Array.from(document.querySelectorAll('a[href*="/work/"]'))
          .map(a => {
            const href = (a as HTMLAnchorElement).href;
            const m = href.match(/\/work\/(\d+)\//);
            return m ? [m[1], href] as [string, string] : null;
          })
          .filter((x): x is [string, string] => x !== null)
      ).entries()).map(([id, url]) => ({ id, url }))
    );

    console.log(`\nScraping ${sourceName} (Workland) — ${jobs.length} jobs`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, { id: `${idPrefix}_${job.id}`, url: job.url }, sourceName);
    }
  } finally {
    await page.close();
  }
}
