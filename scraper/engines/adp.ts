import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, safeGoto } from '../utils';
import { saveRawJob } from '../db';

export function adpTitleFromRaw(rawText: string, pageTitle = ''): string | undefined {
  if (pageTitle.trim()) return pageTitle.trim();
  const firstLine = rawText.split(/\r?\n/).map(line => line.trim()).find(Boolean);
  return firstLine || undefined;
}

export async function scrapeADP(db: Client, context: BrowserContext, portalUrl: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (ADP)...`);
  const page = await context.newPage();
  try {
    // ADP migrated its widget to web components (<sdf-*> custom elements) at
    // some point — there are no real <a href="#"> job links anymore, and the
    // h1's "(N of M)" heading only reflects the first page (N), not the true
    // total (M), so parsing it for the loop count silently undercounted.
    // The list is capped at ~10 items until a "View All" button
    // (#recruitment_careerCenter_showAllJobs, itself an <sdf-button>) is
    // clicked; job rows are div.current-openings-item elements with their
    // own onclick handler instead of a wrapping anchor.
    const loadPortal = async () => {
      await safeGoto(page, portalUrl, 60000);
      await page.waitForTimeout(5000);
      const viewAllBtn = await page.$('#recruitment_careerCenter_showAllJobs');
      if (viewAllBtn && await viewAllBtn.isVisible().catch(() => false)) {
        await viewAllBtn.click();
        await page.waitForTimeout(6000);
      }
    };

    await loadPortal();

    const count = await page.evaluate(() => document.querySelectorAll('div.current-openings-item').length);

    console.log(`[${sourceName}] Found ${count} jobs`);

    for (let i = 0; i < count; i++) {
      process.stdout.write(`\r[${sourceName}] ${i + 1}/${count}`);

      const clicked = await page.evaluate((idx) => {
        const candidates = Array.from(document.querySelectorAll('div.current-openings-item'));
        const item = candidates[idx] as HTMLElement;
        if (!item) return false;
        item.click();
        return true;
      }, i);

      if (!clicked) continue;

      await page.waitForTimeout(5000);

      const rawText = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, nav, footer').forEach(e => e.remove());
        return clone.innerText?.trim() || '';
      });

      const title = await page.evaluate(() => document.querySelector('h1, h2')?.textContent?.trim() || '');

      if (rawText.length > 100) {
        // Prefer the real "Requisition ID: N" shown on the detail view over an
        // index-based hash — index isn't stable across scrapes if job order
        // shifts, which would otherwise create duplicate rows for the same posting.
        const reqIdMatch = rawText.match(/Requisition ID:\s*(\d+)/i);
        const id = reqIdMatch ? `adp_${reqIdMatch[1]}` : urlId(portalUrl + i);
        const resolvedTitle = adpTitleFromRaw(rawText, title);
        await saveRawJob(db, { id, url: portalUrl, source: sourceName, title: resolvedTitle, raw_text: `${resolvedTitle || ''}\n\n${rawText}` });
      }

      await loadPortal();
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
