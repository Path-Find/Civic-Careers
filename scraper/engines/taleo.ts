import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

export async function scrapeTaleo(db: Client, context: BrowserContext, searchUrl: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (Taleo)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, searchUrl, 60000);
    await page.waitForTimeout(2000);

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
  } finally {
    await page.close();
  }
}
