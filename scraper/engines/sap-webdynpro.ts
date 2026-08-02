import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import pdfParse from 'pdf-parse';
import { saveRawJob } from '../db';
import { safeGoto, urlId } from '../utils';

export type SapWebDynproJob = {
  title: string;
  reference: string;
  postedAt?: string;
  location?: string;
  closingDate?: string;
};

export function extractSapWebDynproJobs(rows: SapWebDynproJob[], portalUrl: string) {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const title = row.title.trim();
    const reference = row.reference.trim();
    if (!title || !reference || seen.has(reference)) return [];
    seen.add(reference);
    const url = `${portalUrl}#${encodeURIComponent(reference)}`;
    return [{
      id: urlId(url),
      title,
      url,
      applicationUrl: portalUrl,
      location: row.location?.trim() || undefined,
      postedAt: normalizeSapDate(row.postedAt),
      closingDate: normalizeSapDate(row.closingDate),
    }];
  });
}

function normalizeSapDate(value?: string): string | undefined {
  const match = value?.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return value?.trim() || undefined;
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

export async function scrapeSapWebDynpro(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  console.log(`Scraping ${sourceName} (SAP Web Dynpro)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, portalUrl, 60000);
    // Web Dynpro hydrates the table in several client events; the first
    // response can expose only part of the current result set.
    await page.waitForTimeout(20000);
    const titleLinks = page.locator('tr[rr] a.lsLink');
    await titleLinks.first().waitFor({ state: 'attached', timeout: 30000 });
    const rows = await titleLinks.evaluateAll((links) => links.map((link) => {
      const cells = Array.from(link.closest('tr')?.querySelectorAll('td') || [])
        .map((cell) => cell.textContent?.trim() || '');
      return {
        title: link.textContent?.trim() || '',
        reference: cells[3] || '',
        postedAt: cells[4] || '',
        location: cells[5] || '',
        closingDate: cells[6] || '',
      };
    }));
    const jobs = extractSapWebDynproJobs(rows, portalUrl);
    console.log(`[${sourceName}] Found ${jobs.length} jobs`);

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      if (!job) continue;
      const popupPromise = context.waitForEvent('page');
      await titleLinks.nth(index).click();
      const popup = await popupPromise;
      try {
        await popup.waitForLoadState('domcontentloaded');
        const detailFrame = popup.locator('iframe#WD2C');
        await detailFrame.waitFor({ state: 'attached', timeout: 20000 });
        const source = await detailFrame.getAttribute('src');
        if (!source) throw new Error(`SAP detail PDF URL missing for ${job.title}`);
        const pdfUrl = new URL(source, popup.url()).toString();
        const cookies = await context.cookies(pdfUrl);
        const response = await fetch(pdfUrl, {
          headers: {
            Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; '),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
        });
        if (!response.ok) throw new Error(`SAP detail PDF returned HTTP ${response.status}`);
        const parsed = await pdfParse(Buffer.from(await response.arrayBuffer()));
        const rawText = parsed.text.trim();
        if (rawText.length < 100) throw new Error(`SAP detail PDF was empty for ${job.title}`);
        await saveRawJob(db, {
          id: job.id,
          url: job.url,
          application_url: job.applicationUrl,
          source: sourceName,
          raw_text: rawText,
          title: job.title,
          posted_at: job.postedAt,
        });
        process.stdout.write(' ✅');
      } finally {
        await popup.close();
        // The SAP window-opening control needs a short reset before the next
        // row can open its own posting window.
        await page.waitForTimeout(2500);
      }
    }
    console.log(`\n[${sourceName}] Done.`);
  } finally {
    await page.close();
  }
}
