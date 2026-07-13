import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';

export async function scrapeICIMS(db: Client, context: BrowserContext, url: string, sourceName: string) {
  console.log(`Scraping ${sourceName} (iCIMS)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, url, 60000);
    await page.waitForTimeout(10000);

    let hasNextPage = true;
    let pageNum = 1;
    while (hasNextPage) {
      console.log(`[${sourceName}] Page ${pageNum}...`);
      // Branded tenants (e.g. Peel Region, Guelph) serve real content inside a
      // *second* frame whose URL also contains "icims.com" — the plain
      // /icims\.com/ regex used to match the wrong (outer/branding) frame.
      // Also: job links use path-based URLs (/jobs/{id}/{slug}/job), not a
      // "job=" query param — confirmed 2026-07-12 by inspecting Peel Region's
      // actual rendered DOM (a screenshot showed 8 real jobs while the old
      // selector found 0).
      const frame = page.frames().find(f => f.url().includes('in_iframe=1'))
        ?? page.frames().find(f => f.url().includes('icims.com'))
        ?? page;
      const summaries = await frame.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          // The link's accessible text includes a hidden "Job Title" label
          // before the real title (e.g. "Job Title\n\nSub-Foreperson, ...") — strip it.
          .map(l => ({ title: (l.textContent || '').replace(/^\s*Job Title\s*/i, '').trim(), url: (l as HTMLAnchorElement).href }))
          .filter(j => {
            if (!j.title || !j.url) return false;
            try { return new URL(j.url).pathname.replace(/\/$/, '').toLowerCase().endsWith('/job'); }
            catch { return false; }
          })
          .map(j => {
            // Drop the internal in_iframe param — not meaningful outside the branded embed.
            const u = new URL(j.url);
            u.searchParams.delete('in_iframe');
            return { ...j, url: u.toString() };
          });
      });

      let count = 0;
      for (const job of summaries) {
        count++;
        const idMatch = job.url.match(/\/jobs\/(\d+)\//);
        const id = idMatch ? idMatch[1] : urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${count}/${summaries.length}`);
        await scrapeRawAndStage(db, context, { ...job, id }, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNum}.`);

      const nextBtn = await frame.$('a[title="Next Page"], a:has-text("Next"), .iCIMS_Pagination a:last-child');
      if (nextBtn && await nextBtn.isVisible()) {
        const isDisabled = await nextBtn.getAttribute('class').then(c => c?.includes('disabled') || false);
        if (!isDisabled) {
          await nextBtn.click();
          await page.waitForTimeout(7000);
          pageNum++;
          if (pageNum > 20) break;
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
  } finally {
    await page.close();
  }
}
