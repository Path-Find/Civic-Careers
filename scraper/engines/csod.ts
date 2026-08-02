import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

// Cornerstone OnDemand (CSOD) career sites. Jobs render statically on the
// home page for every tenant checked (George Brown, Mohawk, Durham College,
// Ontario Tech — 8 to 19 openings, no growth on scroll) — no Load More
// button or infinite scroll observed, but we scroll a few times anyway in
// case a larger tenant does paginate this way.
export async function scrapeCSOD(db: Client, context: BrowserContext, url: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (CSOD)...`);
  const baseUrl = new URL(url).origin;
  const page = await context.newPage();
  try {
    await safeGoto(page, url, 60000);
    await page.waitForTimeout(5000);

    const summaries: Array<{ title: string; url: string; location: string }> = [];
    const seenUrls = new Set<string>();

    for (let pageNumber = 1; pageNumber <= 100; pageNumber++) {
      let lastCount = 0;
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(2000);
        const count = await page.$$eval('a[data-tag="displayJobTitle"]', els => els.length);
        if (count === lastCount) break;
        lastCount = count;
      }

      const pageSummaries = await page.evaluate((baseUrl) => {
        return Array.from(document.querySelectorAll('a[data-tag="displayJobTitle"]')).map(link => {
          const href = link.getAttribute('href') || '';
          const card = link.closest('.p-panel');
          const location = card?.querySelector('[data-tag="displayJobLocation"]')?.textContent?.trim() || '';
          return {
            title: link.textContent?.trim() || '',
            url: href.startsWith('http') ? href : baseUrl + href,
            location,
          };
        }).filter(j => j.title && j.url);
      }, baseUrl);

      for (const job of pageSummaries) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          summaries.push(job);
        }
      }

      console.log(`[${sourceName}] Page ${pageNumber}: ${pageSummaries.length} jobs`);

      const nextButton = page.locator('button.page-nav-caret.next:not([disabled])').first();
      if (await nextButton.count() === 0 || !(await nextButton.isVisible())) break;

      const firstUrl = pageSummaries[0]?.url;
      await nextButton.click();
      await page.waitForTimeout(2000);
      const nextFirstHref = await page.locator('a[data-tag="displayJobTitle"]').first().getAttribute('href');
      if (!nextFirstHref || nextFirstHref === firstUrl) break;
    }

    console.log(`[${sourceName}] Found ${summaries.length} jobs`);
    for (const job of summaries) {
      const reqId = job.url.match(/\/requisition\/(\d+)/)?.[1];
      await scrapeRawAndStage(db, context, { ...job, id: reqId || urlId(job.url) }, sourceName);
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
