import { BrowserContext, Page } from 'playwright';
import { Client } from '@libsql/client';
import { scrapeRawAndStage, urlId } from '../utils';

const YORK_U_BASE = 'https://jobs-ca.technomedia.com/yorkuniversity/';

type TechnomediaJob = { id: string; title: string; detailUrl: string };

async function dismissTechnomediaChrome(page: Page) {
  await page.evaluate(() => {
    const modal = document.getElementById('modalCookiesDisclaimer');
    if (modal) {
      modal.classList.remove('show');
      (modal as HTMLElement).style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }).catch(() => {});
}

async function openJobList(page: Page, listUrl: string) {
  await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await dismissTechnomediaChrome(page);

  // Homepage is a featured carousel; full board is behind "View Job Postings Here".
  const viewAll = page.getByText(/View Job Postings Here/i).first();
  if (await viewAll.count()) {
    await viewAll.click({ force: true }).catch(() => {});
    await page.waitForTimeout(4000);
    await dismissTechnomediaChrome(page);
  }

  await page.waitForSelector('#CTG_JOB_LIST a.relink[href*="offerid="], a.relink[href*="offerid="]', {
    timeout: 30000,
  }).catch(() => {});
  await page.waitForTimeout(1500);
}

function collectJobsFromList(page: Page): Promise<TechnomediaJob[]> {
  // Keep this evaluate body free of nested function declarations — tsx/esbuild
  // injects a __name helper that does not exist in the browser context.
  return page.evaluate((base) => {
    const seen = new Set();
    const jobs = [];
    const origin = base.replace(/\/?$/, '/');

    const rows = document.querySelectorAll('#CTG_JOB_LIST tbody tr, tr.tblStripingEven, tr.tblStripingOdd');
    for (const row of rows) {
      const link = row.querySelector('a.relink[href*="offerid="]');
      if (!link) continue;
      const href = link.getAttribute('href') || '';
      const match = href.match(/offerid=(\d+)/i)
        || link.getAttribute('onclick')?.match(/detailOffre\((\d+)\)/);
      if (!match || seen.has(match[1])) continue;
      seen.add(match[1]);

      const titleLinks = [...row.querySelectorAll('a.relink')].map((a) => a.textContent?.trim() || '').filter(Boolean);
      const title = (titleLinks.find((t) => !/^\d+$/.test(t)) || titleLinks[0] || `Posting ${match[1]}`)
        .replace(/&amp;/g, '&')
        .trim();
      // Prefer the list's own detail href (includes Technomedia state blob).
      const path = href.includes('offerid=') ? href : `?offerid=${match[1]}`;
      let detailUrl = path;
      try {
        detailUrl = new URL(path, origin).toString();
      } catch {
        detailUrl = path.startsWith('?') || path.startsWith('/')
          ? `${origin.replace(/\/$/, '')}${path.startsWith('?') ? path : path}`
          : `${origin}${path}`;
      }
      jobs.push({ id: match[1], title, detailUrl });
    }

    // Homepage carousel fallback (featured jobs only).
    if (jobs.length === 0) {
      for (const card of document.querySelectorAll('.latestJobItems')) {
        const btn = card.querySelector('[onclick*="detailOffre"]');
        const match = btn?.getAttribute('onclick')?.match(/detailOffre\((\d+)\)/);
        if (!match || seen.has(match[1])) continue;
        seen.add(match[1]);
        const title = card.querySelector('.jobName')?.textContent?.trim()
          || card.querySelector('span[title]')?.getAttribute('title')
          || `Posting ${match[1]}`;
        let detailUrl = `${origin}?offerid=${match[1]}`;
        try {
          detailUrl = new URL(`?offerid=${match[1]}`, origin).toString();
        } catch {
          // keep fallback
        }
        jobs.push({ id: match[1], title, detailUrl });
      }
    }

    return jobs;
  }, YORK_U_BASE);
}

async function loadMoreJobPages(page: Page, sourceName: string): Promise<TechnomediaJob[]> {
  const all = new Map<string, TechnomediaJob>();

  const absorb = async () => {
    for (const job of await collectJobsFromList(page)) {
      if (!all.has(job.id)) all.set(job.id, job);
    }
  };

  await absorb();

  for (let pageNum = 2; pageNum <= 40; pageNum++) {
    const loadMore = page.locator('#loadMoreJob a, #loadMoreJob').first();
    const visible = await loadMore.isVisible().catch(() => false);
    if (!visible) break;

    const before = all.size;
    await page.evaluate(() => {
      const fn = (window as unknown as { loadJobResultContent?: () => void }).loadJobResultContent;
      if (typeof fn === 'function') fn();
    }).catch(async () => {
      await loadMore.click({ force: true });
    });

    let grew = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.waitForTimeout(500);
      await dismissTechnomediaChrome(page);
      await absorb();
      if (all.size > before) {
        grew = true;
        break;
      }
    }

    console.log(`[${sourceName}] After load-more page ${pageNum}: ${all.size} unique postings`);
    if (!grew) break;

    const remainingHidden = await page.evaluate(() => {
      const total = Number((document.getElementById('hidNbJob') as HTMLInputElement | null)?.value || 0);
      const next = (window as unknown as { iNextPage?: number }).iNextPage;
      if (!total || !next) return false;
      return total <= next * 50;
    }).catch(() => false);
    if (remainingHidden) {
      await absorb();
      break;
    }
  }

  return [...all.values()];
}

export async function scrapeTechnomedia(
  db: Client,
  context: BrowserContext,
  url = YORK_U_BASE,
  sourceName = 'York University',
) {
  console.log(`Scraping ${sourceName} (Technomedia)...`);
  const page = await context.newPage();
  try {
    await openJobList(page, url);
    const jobs = await loadMoreJobPages(page, sourceName);
    console.log(`[${sourceName}] Found ${jobs.length} postings.`);

    for (const job of jobs) {
      // Stable id by offer number so list-state query blobs don't fork rows.
      const stableUrl = `${YORK_U_BASE}?offerid=${job.id}`;
      await scrapeRawAndStage(db, context, {
        id: urlId(stableUrl),
        url: job.detailUrl,
        title: job.title,
      }, sourceName);
      // Technomedia starts returning "resource not available" under rapid fire.
      await page.waitForTimeout(400);
    }
  } finally {
    await page.close();
  }
}
