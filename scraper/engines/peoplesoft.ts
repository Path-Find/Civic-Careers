import { BrowserContext, Frame } from 'playwright';
import { Client } from '@libsql/client';
import { safeGoto } from '../utils';
import { saveRawJob } from '../db';

// PeopleSoft Fluid career sites don't expose real
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

    // McMaster renders the actual PeopleSoft search inside a child frame;
    // the outer portal frame contains only the navigation shell. Prefer the
    // frame with the populated search results when one is present.
    let target: Frame = page.mainFrame();
    for (const frame of page.frames()) {
      if (frame === page.mainFrame()) continue;
      const text = await frame.locator('body').innerText().catch(() => '');
      if (/matches found|Search Results|Job Title/i.test(text)) {
        target = frame;
        break;
      }
    }

    // Some tenants (TMU confirmed) show facet counts on load but don't
    // populate real results until the search is explicitly submitted —
    // clicking this is a safe no-op on tenants that already auto-populate
    // (Winnipeg confirmed).
    const searchBtn = await target.$('#HRS_SCH_WRK_FLU_HRS_SEARCH_BTN, [id*="HRS_SEARCH_BTN"]');
    if (searchBtn) {
      await searchBtn.click();
      await page.waitForTimeout(6000);
    }

    // The detail trigger is a child div on some tenants, but the row owns the
    // actual OnRowAction handler (TransLink uses this shape).
    const firstRow = await target.$('li[onclick*="HRS_VIEW_DETAILS"], [id^="HRS_VIEW_DETAILS"], a[id^="POSTINGLINK$"]');
    if (!firstRow) {
      console.log(`[${sourceName}] No job rows found`);
      return;
    }
    await firstRow.click();
    await page.waitForTimeout(4000);

    const seenIds = new Set<string>();
    let count = 0;
    const MAX_JOBS = 300;

    while (count < MAX_JOBS) {
      const jobIdMatch = await target.evaluate(() => document.body.innerText.match(/Job ID\s*(\d+)/)?.[1]);
      if (!jobIdMatch) break;
      if (seenIds.has(jobIdMatch)) break; // walked the full list and looped back
      seenIds.add(jobIdMatch);

      const rawText = await target.evaluate(() => {
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

      const nextBtn = await target.$('a:has-text("Next Job"), button:has-text("Next Job"), [id*="HRS_NEXT_PB"]');
      if (!nextBtn || !(await nextBtn.isVisible().catch(() => false))) break;
      await nextBtn.click();
      await page.waitForTimeout(2500);
    }
    console.log(`\n[${sourceName}] Done — ${count} jobs.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
