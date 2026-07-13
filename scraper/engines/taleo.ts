import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

export async function scrapeTaleo(db: Client, context: BrowserContext, searchUrl: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (Taleo)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, searchUrl, 60000);
    await page.waitForTimeout(2000);

    // Taleo's older <h4>-based template uses jscroll (infinite scroll) —
    // confirmed on St. Catharines: only 10 jobs render initially, scrolling
    // reveals 17 real total. The "next" trigger (a.jscroll-next) is a hidden
    // link jscroll's own JS watches for scroll-into-view, not something
    // safe to click or navigate to directly (a raw page navigation to its
    // href doesn't replicate jscroll's AJAX partial-load behavior). Scroll
    // repeatedly until the job count stops growing instead.
    let lastCount = 0;
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2500);
      const count = await page.evaluate(() => document.querySelectorAll('h4 a[href*="viewRequisition"], a[href*="jobdetail.ftl"]').length);
      if (count === lastCount) break;
      lastCount = count;
    }

    // Two Taleo Career Section templates seen in the wild: an older one
    // (Oakville, St. Catharines) with <h4> job-title links pointing at
    // viewRequisition, and a newer table-based one (Humber) with
    // <th scope="row"> wrapping links to jobdetail.ftl?job=N instead — the
    // old selector matched zero links on the newer template.
    const summaries = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h4 a[href*="viewRequisition"], a[href*="jobdetail.ftl"]')).map(link => {
        const h4 = link.closest('h4');
        const dept = h4?.nextElementSibling?.textContent?.trim() || '';
        return { title: link.textContent?.trim() || '', url: (link as HTMLAnchorElement).href, department: dept };
      });
    });

    console.log(`[${sourceName}] Found ${summaries.length} jobs`);
    for (const job of summaries) {
      const jobParam = new URL(job.url).searchParams.get('job');
      const id = jobParam || urlId(job.url);
      await scrapeRawAndStage(db, context, { id, ...job }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
