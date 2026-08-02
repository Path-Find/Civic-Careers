import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage, urlId } from '../utils';

const YORK_U_LIST_URL = 'https://jobs-ca.technomedia.com/yorkuniversity/?_4x1F8B08000000000000FF6DCEBB0E83200040D1BF6134BCD181418B367E0033692D69F0010430A97F5F07A7A6FBCDC9CD8B3DEED6ABC34B0C196C0422D8A09A084C506390660622CC21D877F7FA290884B5E19AF12B89294C36E7B1D84DC690CA63ADE6F08C2117E7DFD57CE6C07957B41ED57F895E50B6EB66FD2E3161207F261993F3852690CF5749FB8E939EB4EDADE1F530F44851ACA0605CF1EE04C5173BA647D0D1000000';

export async function scrapeTechnomedia(db: Client, context: BrowserContext, url = YORK_U_LIST_URL, sourceName = 'York University') {
  console.log(`Scraping ${sourceName} (Technomedia)...`);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    const jobs = await page.locator('[onclick^="detailOffre("]').evaluateAll((elements) => {
      const seen = new Set<string>();
      return elements.flatMap((element) => {
        const match = element.getAttribute('onclick')?.match(/detailOffre\((\d+)\)/);
        if (!match || seen.has(match[1])) return [];
        seen.add(match[1]);
        const card = element.closest('.latestJobItems');
        return [{ id: match[1], title: card?.querySelector('.jobName')?.textContent?.trim() || `Technomedia posting ${match[1]}` }];
      });
    });

    console.log(`[${sourceName}] Found ${jobs.length} postings.`);
    for (const job of jobs) {
      const detailUrl = `${url}&offerid=${job.id}`;
      await scrapeRawAndStage(db, context, { id: urlId(detailUrl), url: detailUrl, title: job.title }, sourceName);
    }
  } finally {
    await page.close();
  }
}
