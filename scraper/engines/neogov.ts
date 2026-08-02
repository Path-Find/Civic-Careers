import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage, safeGoto, urlId } from '../utils';

export function neogovJobId(url: string): string {
  const match = new URL(url).pathname.match(/\/jobs\/(\d+)(?:\/|$)/i);
  return match?.[1] ? `neogov_${match[1]}` : `neogov_${urlId(url)}`;
}

export async function scrapeNeogov(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  console.log(`Scraping ${sourceName} (NEOGOV)...`);
  const page = await context.newPage();
  const seenUrls = new Set<string>();

  try {
    await safeGoto(page, portalUrl, 60000);

    let pageNumber = 1;
    while (pageNumber <= 100) {
      await page.waitForSelector(
        '#job-list-container a.item-details-link[href*="/jobs/"], #job-list-container a[href*="/jobs/"]',
        { timeout: 20000 },
      ).catch(() => {});

      const summaries = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(
          '#job-list-container a.item-details-link[href*="/jobs/"], #job-list-container a[href*="/jobs/"]',
        ));
        const seen = new Set<string>();
        return links.reduce<Array<{ title: string; url: string }>>((jobs, link) => {
          const url = link.href;
          const title = link.textContent?.trim() || '';
          if (url && title && !seen.has(url)) {
            seen.add(url);
            jobs.push({ title, url });
          }
          return jobs;
        }, []);
      });

      if (summaries.length === 0) {
        console.log(`[${sourceName}] No job links found on page ${pageNumber}.`);
        break;
      }

      console.log(`[${sourceName}] Page ${pageNumber}: ${summaries.length} jobs.`);
      let count = 0;
      for (const job of summaries) {
        if (seenUrls.has(job.url)) continue;
        seenUrls.add(job.url);
        count++;
        process.stdout.write(`\r[${sourceName}] ${seenUrls.size} jobs`);
        await scrapeRawAndStage(db, context, {
          id: neogovJobId(job.url),
          title: job.title,
          url: job.url,
        }, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNumber} (${count} new jobs).`);

      const next = page.locator('#job-list-container a[rel="next"]').first();
      if (!(await next.count()) || (await next.getAttribute('aria-disabled')) === 'true') break;

      const nextPageNumber = pageNumber + 1;
      await Promise.all([
        page.waitForURL((url) => url.searchParams.get('page') === String(nextPageNumber), { timeout: 15000 }),
        next.click(),
      ]);
      await page.waitForTimeout(1000);
      pageNumber = nextPageNumber;
    }

    console.log(`[${sourceName}] Done — ${seenUrls.size} jobs discovered.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
