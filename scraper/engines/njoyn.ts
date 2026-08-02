import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage } from '../utils';

export async function scrapeNjoyn(db: Client, context: BrowserContext, url: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (Njoyn)...`);
  const page = await context.newPage();
  try {
    // networkidle hangs on these xweb.asp pages — same issue as Dayforce.
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#njoynPageContainer a, a[href*="joblisting"], .job-title a, .njoyn-job-row a', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);

    let hasNextPage = true;
    let pageNum = 1;
    while (hasNextPage) {
      console.log(`[${sourceName}] Page ${pageNum}...`);
      const summaries = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="JobDetails"], a[href*="jobdetails"], a'));
        return links.map(l => ({ title: l.textContent?.trim() || '', url: (l as HTMLAnchorElement).href }))
                    .filter(j => j.title.length > 5 && j.url && (/jobdetails/i.test(j.url) || /^[A-Z]\d{4}-\d+/i.test(j.title)));
      });

      let count = 0;
      for (const job of summaries) {
        count++;
        const jobId = Array.from(new URL(job.url).searchParams.entries())
          .find(([key]) => key.toLowerCase() === 'jobid')?.[1];
        const id = jobId || job.url.split('/').filter(Boolean).pop() || urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${count}/${summaries.length}`);
        await scrapeRawAndStage(db, context, { ...job, id }, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNum}.`);

      const nextBtn = await page.$('a:has-text("Next"), a.nextpage, a[rel="next"], td.next a');
      if (nextBtn && await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);
        pageNum++;
        if (pageNum > 20) break;
      } else {
        hasNextPage = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
