import { createHash } from 'crypto';
import { Page, Frame, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { discardRawJob, saveRawJob } from './db';

export function urlId(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 12);
}

// Shared page-load helper for every engine. 'networkidle' hangs/times out on
// sites with continuous background polling (confirmed on Dayforce and Njoyn,
// and the same fix was independently re-applied in scrapeRawAndStage below —
// this is why it's centralized here now instead of staying duplicated
// per-engine). domcontentloaded + a settle buffer is more reliable.
export async function safeGoto(page: Page, url: string, timeout = 60000): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForTimeout(2000);
}

export interface JobSummary {
  id: string;
  title?: string;
  url: string;
  department?: string;
  location?: string;
  closingDate?: string;
  salary?: string;
}

export const BASE_CONFIG = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 800 }
};

export function githubRunUrl(): string | null {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  return server && repository && runId ? `${server}/${repository}/actions/runs/${runId}` : null;
}

export async function notifyDiscord(content: string): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'GovJobs', content }),
    });
    if (!response.ok) console.error(`[Discord] Notification failed: HTTP ${response.status}`);
  } catch (err) {
    console.error('[Discord] Notification failed:', err);
  }
}

// Handles interstitial "Leaving GC Jobs" warning pages or similar redirects recursively.
export async function handleRedirections(page: Page, depth = 0): Promise<boolean> {
  if (depth > 3) return false;

  const bodyText = await page.textContent('body');

  if (bodyText?.includes('Sign in with your GCKey') || bodyText?.includes('GCKey login')) {
    console.warn(`   ⚠️ [Login] Required for: ${page.url()}`);
    return false;
  }

  const isWarningPage = bodyText?.includes('leave the GC Jobs') ||
                        bodyText?.includes('quitter le site') ||
                        bodyText?.includes('Leaving an External Site') ||
                        page.url().includes('page2440');

  if (isWarningPage) {
    const externalLink = await page.$$eval('main a, #content a, .center-block a, .external-link a', as => {
      return as.filter(a => {
        const href = (a as HTMLAnchorElement).href;
        return href.startsWith('http') &&
               !href.includes('cfp-psc.gc.ca') &&
               !href.includes('#') &&
               !href.includes('mailto');
      }).map(a => (a as HTMLAnchorElement).href);
    });

    if (externalLink.length > 0 && externalLink[0]) {
      console.log(`   [Redirect Lvl ${depth + 1}] ${externalLink[0].substring(0, 50)}...`);
      await safeGoto(page, externalLink[0], 60000);
      await page.waitForTimeout(3000);
      return await handleRedirections(page, depth + 1);
    }
  }
  return depth > 0;
}

// Some SPA job-detail pages (confirmed on Workday — University of Ottawa,
// University of Waterloo) return their nav/footer chrome before the real
// content has hydrated: "Skip to main content...Loading...Follow Us...".
// That shell is ~136 chars — over the naive length-only cutoff below — so it
// was slipping through as if it were a real posting, then silently failing
// AI parsing (no job_title to extract) on every single parse run forever.
export function looksUnrendered(text: string): boolean {
  return /skip to main content/i.test(text) && text.length < 400;
}

export async function scrapeRawAndStage(db: Client, context: BrowserContext, job: JobSummary, sourceName: string): Promise<boolean> {
  const existing = await db.execute({ sql: `SELECT parsed_at FROM raw_jobs WHERE id = ?`, args: [job.id!] });
  if (existing.rows.length > 0 && existing.rows[0]!['parsed_at'] !== null) {
    await db.execute({ sql: `UPDATE raw_jobs SET scraped_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [job.id!] });
    await db.execute({
      sql: `INSERT INTO jobs (id, url, source, is_active, scraped_at)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET is_active = 1, scraped_at = CURRENT_TIMESTAMP`,
      args: [job.id!, job.url, sourceName]
    });
    process.stdout.write(' ⏭');
    return true;
  }

  const page = await context.newPage();
  try {
    await safeGoto(page, job.url, 45000);

    await handleRedirections(page);
    await page.waitForSelector('body', { timeout: 10000 });

    const metadataPostedAt = ['City of Toronto', 'University of Toronto', 'CMHC', 'Region of Waterloo', 'City of London', 'Mississauga', 'City of Vancouver', 'University of Waterloo', 'City of Waterloo', 'City of Richmond Hill'].includes(sourceName)
      ? await page.locator('meta[itemprop="datePosted"]').getAttribute('content').catch(() => null)
      : null;

    const structuredPostedAt = ['City of Barrie', 'City of Windsor', 'City of Thunder Bay', 'City of Belleville', 'City of Burlington', 'City of St. Catharines', 'City of Niagara Falls'].includes(sourceName)
      ? await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => {
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            const entries = Array.isArray(data) ? data : [data];
            const posting = entries.find((entry) => entry?.datePosted);
            if (posting?.datePosted) return posting.datePosted;
          } catch {
            // Ignore unrelated or malformed JSON-LD blocks.
          }
        }
        return null;
      }).catch(() => null)
      : null;

    // Workday detail pages can expose the shell before the job content hydrates.
    // Wait for the actual posting container on those pages before treating the
    // shell as an unrendered listing.
    if (/myworkday(?:jobs|site)\.com/i.test(job.url)) {
      await page.waitForSelector(
        '[data-automation-id="jobPostingPage"], [data-automation-id="jobPostingDescription"]',
        { timeout: 15000 }
      ).catch(() => {});
    }

    const extractFrom = (target: Page | Frame) => target.evaluate((selector) => {
      const root = selector ? document.querySelector(selector) : document.body;
      const clone = (root ?? document.body).cloneNode(true) as HTMLElement;
      const noise = 'script, style, link, meta, noscript, nav, footer, header, #header, #footer';
      clone.querySelectorAll(noise).forEach(e => e.remove());
      return clone.innerText?.trim() || '';
    }, sourceName === 'York University' ? '#maincontent' : null);

    // Branded iCIMS tenants (confirmed on Peel Region, City of Guelph) serve the
    // real job content inside a nested frame with "in_iframe=1" in its URL —
    // the top-level page is just the tenant's own site chrome. This URL
    // convention is iCIMS-specific, so it's a no-op for every other engine.
    const contentFrame = page.frames().find(f => f.url().includes('in_iframe=1'));
    let rawText = await extractFrom(contentFrame ?? page);

    if (looksUnrendered(rawText)) {
      // Page hadn't finished hydrating yet — give it one more chance before bailing.
      await page.waitForTimeout(5000);
      rawText = await extractFrom(contentFrame ?? page);
    }

    if (!rawText || rawText.length < 100 || looksUnrendered(rawText)) {
      console.warn(`\n   ⚠️  [${sourceName}] Page never rendered real content: ${job.url}`);
      await discardRawJob(db, job.id!);
      return false;
    }

    if (sourceName === 'York University') {
      rawText = rawText.replace(/The University welcomes applications from all qualified individuals,[\s\S]*?(?=#LI-DNI\b|Click here for more details)/i, '').trim();
    }

    const labeledPostedAt = sourceName === 'EFHC' || sourceName === 'City of Brampton'
      ? rawText.match(/posting\s+date\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] ?? null
      : sourceName === 'York Region' || sourceName === 'York University'
        ? rawText.match(/date\s+posted\s*[:\-]?\s*(\d{2}[-\/]\d{2}[-\/]\d{4})/i)?.[1] ?? null
      : null;
    const postedAt = metadataPostedAt || structuredPostedAt || labeledPostedAt;
    await saveRawJob(db, { id: job.id!, url: job.url, source: sourceName, title: job.title, raw_text: rawText, posted_at: postedAt });
    process.stdout.write(' ✅');
    return true;
  } catch (err: any) {
    console.warn(`\n   ⚠️  [${sourceName}] Failed ${job.url}: ${err.message}`);
    await discardRawJob(db, job.id!).catch(() => {});
    return false;
  } finally {
    await page.close();
  }
}
