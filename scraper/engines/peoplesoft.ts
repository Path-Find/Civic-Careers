import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { safeGoto } from '../utils';
import { saveRawJob } from '../db';

// PeopleSoft Fluid career sites (confirmed on TMU, Western, McMaster, Greater
// Sudbury, Winnipeg, Calgary, TransLink, Durham Region) don't expose real
// per-job URLs — every row's "View Details" link is a stateful form postback
// (javascript:submitAction_win0(...)), and the browser URL never changes.
// All rows ARE present in the DOM at once (confirmed via row count matching
// the page's own total), but the only way to get from one job's detail view
// to the next is the page's own "Next Job" control, which walks the whole
// list from wherever you start. So instead of collecting links and visiting
// each independently (the pattern every other engine uses), this clicks into
// the first result and walks forward with Next Job until it runs out or
// starts repeating.
export async function scrapePeopleSoft(db: Client, context: BrowserContext, searchUrl: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (PeopleSoft Fluid)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, searchUrl, 60000);
    await page.waitForTimeout(8000);

    const firstBtn = await page.$('[id^="HRS_VIEW_DETAILSPB"]');
    if (!firstBtn) {
      console.log(`[${sourceName}] No job rows found`);
      return;
    }
    await firstBtn.click();
    await page.waitForTimeout(4000);

    const seenIds = new Set<string>();
    let count = 0;
    const MAX_JOBS = 300;

    while (count < MAX_JOBS) {
      const jobIdMatch = await page.evaluate(() => document.body.innerText.match(/Job ID\s*(\d+)/)?.[1]);
      if (!jobIdMatch) break;
      if (seenIds.has(jobIdMatch)) break; // walked the full list and looped back
      seenIds.add(jobIdMatch);

      const rawText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        const noise = 'script, style, link, meta, noscript, nav, footer, header, #header, #footer';
        clone.querySelectorAll(noise).forEach(e => e.remove());
        return clone.innerText?.trim() || '';
      });

      if (rawText.length > 100) {
        const url = `${searchUrl}#jobid=${jobIdMatch}`;
        await saveRawJob(db, { id: `psft_${jobIdMatch}`, url, source: sourceName, raw_text: rawText });
        process.stdout.write(' ✅');
      }
      count++;

      const nextBtn = await page.$('a:has-text("Next Job"), button:has-text("Next Job"), [id*="HRS_NEXT_PB"]');
      if (!nextBtn || !(await nextBtn.isVisible().catch(() => false))) break;
      await nextBtn.click();
      await page.waitForTimeout(2500);
    }
    console.log(`\n[${sourceName}] Done — ${count} jobs.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
  } finally {
    await page.close();
  }
}
