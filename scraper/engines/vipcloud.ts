import { BrowserContext, Frame } from 'playwright';
import { Client } from '@libsql/client';
import { saveRawJob } from '../db';
import { urlId, safeGoto } from '../utils';

export type VipCloudRow = {
  title: string;
  requisition: string;
  category?: string;
  location?: string;
  postedAt?: string;
  closingDate?: string;
};

export function extractVipCloudJobs(rows: VipCloudRow[], portalUrl: string) {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const requisition = row.requisition.trim();
    const title = row.title.trim();
    if (!title || !requisition || seen.has(requisition)) return [];
    seen.add(requisition);
    const canonicalUrl = `${portalUrl}#${encodeURIComponent(requisition)}`;
    return [{
      id: urlId(canonicalUrl),
      title,
      url: canonicalUrl,
      applicationUrl: portalUrl,
      category: row.category?.trim() || undefined,
      location: row.location?.trim() || undefined,
      postedAt: normalizeVipDate(row.postedAt),
      closingDate: normalizeVipDate(row.closingDate),
    }];
  });
}

function normalizeVipDate(value?: string): string | undefined {
  const match = value?.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return value?.trim() || undefined;
  return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
}

async function readDetailFrame(page: import('playwright').Page): Promise<Frame> {
  const iframe = page.locator('iframe[src*="RestoreSession-ContentDoc-1"][src*="layout=-1"]').last();
  await iframe.waitFor({ state: 'attached', timeout: 15000 });
  const frame = await iframe.contentFrame();
  if (!frame) throw new Error('VIP Cloud detail iframe did not expose a frame');
  await frame.locator('body').waitFor({ state: 'attached', timeout: 15000 });
  return frame;
}

export async function scrapeVipCloud(
  db: Client,
  context: BrowserContext,
  portalUrl: string,
  sourceName: string,
) {
  console.log(`Scraping ${sourceName} (VIP Cloud)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, portalUrl, 60000);
    const rows = await page.locator('table tbody tr').evaluateAll((tableRows) => tableRows.flatMap((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || '');
      const titleControl = row.querySelector('[clk="1"]');
      const title = titleControl?.textContent?.trim() || '';
      const metadata = cells[0] || '';
      const requisition = metadata.match(/Requisition\s+No\s*:\s*([^\s-]+)/i)?.[1] || '';
      const category = metadata.match(/Category\s*:\s*(.+)$/i)?.[1] || '';
      if (!title || !requisition) return [];
      return [{
        title,
        requisition,
        category,
        location: cells[2],
        postedAt: cells[3],
        closingDate: cells[4],
      }];
    }));
    const jobs = extractVipCloudJobs(rows, portalUrl);
    console.log(`[${sourceName}] Found ${jobs.length} jobs`);

    const titleControls = page.locator('table tbody tr [clk="1"]');
    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      if (!job) continue;
      await titleControls.nth(index).click({ force: true });
      const detailFrame = await readDetailFrame(page);
      const rawText = (await detailFrame.locator('body').innerText()).trim();
      if (rawText.length < 100) throw new Error(`VIP Cloud detail was empty for ${job.title}`);
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
      await page.locator('a').filter({ hasText: /^Back$/ }).first().click({ force: true });
      await page.locator('table tbody tr').first().waitFor({ state: 'attached', timeout: 15000 });
    }
    console.log(`\n[${sourceName}] Done.`);
  } finally {
    await page.close();
  }
}
