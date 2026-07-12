import { Client } from '@libsql/client/http';
import { BrowserContext } from 'playwright';
import { scrapeRawAndStage, safeGoto } from '../utils';

// Jibe by iCIMS — Angular SPA with infinite scroll
export async function scrapeJibe(
  db: Client,
  context: BrowserContext,
  listingUrl: string,
  sourceName: string,
  idPrefix: string
) {
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    await page.waitForTimeout(5000);

    // Infinite scroll: keep scrolling until job count stabilises
    let prevCount = 0;
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      const count = await page.$$eval('a.job-title-link', els => els.length);
      if (count === prevCount) break;
      prevCount = count;
    }

    const jobs = await page.$$eval('a.job-title-link', (els) =>
      els.map(a => ({ href: (a as HTMLAnchorElement).href }))
    );

    // De-duplicate by req ID in URL (/jobs/<id>)
    const seen = new Set<string>();
    const unique = jobs.filter(({ href }) => {
      const m = href.match(/\/jobs\/(\d+)/);
      if (!m?.[1] || seen.has(m[1])) return false;
      seen.add(m[1]);
      return true;
    });

    console.log(`\nScraping ${sourceName} (Jibe/iCIMS) — ${unique.length} jobs`);
    for (const { href } of unique) {
      const m = href.match(/\/jobs\/(\d+)/);
      const id = m?.[1] ? `${idPrefix}_${m[1]}` : null;
      if (!id) continue;
      await scrapeRawAndStage(db, context, { id, url: href }, sourceName);
    }
  } finally {
    await page.close();
  }
}
