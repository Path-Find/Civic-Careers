import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

export async function scrapeWorkday(db: Client, context: BrowserContext, url: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (Workday)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, url, 60000);
    await page.waitForTimeout(10000);

    // Pattern 1: infinite-scroll "Load More" button (appends results to the DOM)
    let loadMore = true;
    while (loadMore) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      const loadMoreBtn = await page.$('button[data-automation-id="loadMoreButton"]');
      if (loadMoreBtn && await loadMoreBtn.isVisible()) {
        await loadMoreBtn.click();
        await page.waitForTimeout(5000);
      } else {
        loadMore = false;
      }
    }

    const collectPageLinks = () => page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[data-automation-id="jobTitle"]'));
      return links.map(l => ({ title: l.textContent?.trim() || '', url: (l as HTMLAnchorElement).href }))
                  .filter(j => j.title && j.url);
    });

    const seen = new Map<string, { title: string; url: string }>();
    (await collectPageLinks()).forEach(j => seen.set(j.url, j));

    // Pattern 2: classic numbered pagination with a "next" button (replaces the DOM per page,
    // no data-automation-id on these tenants — aria-label is the only reliable hook)
    let nextBtn = await page.$('nav[aria-label="pagination"] button[aria-label="next"]');
    let guard = 0;
    while (nextBtn && guard < 100) {
      const disabled = await nextBtn.getAttribute('disabled');
      const ariaDisabled = await nextBtn.getAttribute('aria-disabled');
      if (disabled !== null || ariaDisabled === 'true') break;
      await nextBtn.click();
      await page.waitForTimeout(3000);
      (await collectPageLinks()).forEach(j => seen.set(j.url, j));
      nextBtn = await page.$('nav[aria-label="pagination"] button[aria-label="next"]');
      guard++;
    }

    const summaries = Array.from(seen.values());
    console.log(`[${sourceName}] Found ${summaries.length} jobs`);

    // Visiting each new job's detail page is the slow part (individual page
    // load, not the pagination) — run a handful concurrently instead of one
    // at a time, same pattern as parser.ts's CONCURRENCY.
    const DETAIL_CONCURRENCY = 5;
    for (let i = 0; i < summaries.length; i += DETAIL_CONCURRENCY) {
      const batch = summaries.slice(i, i + DETAIL_CONCURRENCY);
      await Promise.all(batch.map(job => {
        const id = job.url.split('/').filter(Boolean).pop() || urlId(job.url);
        return scrapeRawAndStage(db, context, { ...job, id }, sourceName);
      }));
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
