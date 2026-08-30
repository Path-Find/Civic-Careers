import { BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { urlId, scrapeRawAndStage, safeGoto } from '../utils';
import { saveRawJob } from '../db';
import { EXCLUDED_GOVERNMENT_OF_CANADA_IDS, GOVERNMENT_OF_CANADA_FIXES, isRetiredGovernmentOfCanadaPage } from '../source-fixes';

export function isOntarioPublicServiceBotChallenge(text: string): boolean {
  return /(?:radware|hcaptcha|captcha|validate\.perfdrive\.com|security verification|activity and behavior on (?:this )?site made us think that you are a bot|incident id:\s*[a-f0-9-]{8,})/i.test(text);
}

// These federal postings are listed in GC Jobs but the employer's own page is
// the real application destination. Keep stable canonical URLs here so a
// routine scrape does not overwrite them with the generic GC detail page.
export async function scrapeOPS(db: Client, context: BrowserContext) {
  const sourceName = 'Province of Ontario';
  console.log(`Scraping ${sourceName} (OPS)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://www.gojobs.gov.on.ca/Search.aspx');
    const initialText = await page.locator('body').innerText().catch(() => '');
    if (isOntarioPublicServiceBotChallenge(`${page.url()}\n${initialText}`)) {
      throw new Error(`${sourceName}: official board blocked by Radware/hCaptcha challenge`);
    }
    const searchInput = await page.$('input[type="text"]');
    if (searchInput) await searchInput.type(' ', { delay: 100 });
    const btn = await page.$('#btnSearch');
    if (btn) {
      await btn.click();
      await page.waitForTimeout(5000);
    }
    // Radware can replace the results page after the search action, leaving
    // the scraper with an empty result set instead of an obvious challenge.
    const postSearchText = await page.locator('body').innerText().catch(() => '');
    if (isOntarioPublicServiceBotChallenge(`${page.url()}\n${postSearchText}`)) {
      throw new Error(`${sourceName}: official board blocked by Radware/hCaptcha challenge`);
    }

    let hasNextPage = true;
    let pageNum = 1;
    while (hasNextPage) {
      console.log(`[${sourceName}] Page ${pageNum}...`);
      const summaries = await page.evaluate(() => {
        const table = document.querySelector('#dgSearchResults');
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tr')).slice(1);
        return rows.map(row => {
          const titleLink = row.querySelector('a');
          if (!titleLink) return null;
          return { title: titleLink.textContent?.trim() || '', url: (titleLink as HTMLAnchorElement).href };
        }).filter(r => r && r.title && !r.url.includes('javascript:')) as { id: string; title: string; url: string }[];
      });

      let count = 0;
      for (const job of summaries) {
        count++;
        job.id = new URL(job.url).searchParams.get('JobID') || urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${count}/${summaries.length}`);
        await scrapeRawAndStage(db, context, job, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNum}.`);
      const nextLink = await page.$('#dgSearchResults tr:last-child a:has-text("Next")');
      if (nextLink) {
        await nextLink.click();
        await page.waitForTimeout(7000);
        pageNum++;
      } else {
        hasNextPage = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeGC(db: Client, context: BrowserContext) {
  const sourceName = 'Government of Canada';
  console.log(`Scraping ${sourceName} (GC)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page2440?fromMenu=true&toggleLanguage=en');
    await page.waitForTimeout(5000);
    let hasNextPage = true;
    let pageNum = 1;
    while (hasNextPage) {
      console.log(`[${sourceName}] Page ${pageNum}...`);
      const summaries = (await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="poster="]'));
        return links.map(l => {
          const title = l.textContent?.trim() || '';
          const href = (l as HTMLAnchorElement).href;
          const row = l.closest('li') || l.closest('tr') || l.parentElement;
          const rowText = row?.textContent?.toLowerCase() || '';
          if (!title || !href || title.length < 3) return null;
          return { title, url: href, rowText };
        }).filter(Boolean) as { id: string; title: string; url: string; rowText: string }[];
      })).filter(job => shouldScrapeGovernmentOfCanadaListing(job.title, job.rowText));

      let count = 0;
      for (const job of summaries) {
        count++;
        const urlObj = new URL(job.url);
        job.id = urlObj.searchParams.get('poster') || urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${count}/${summaries.length}`);
        await scrapeRawAndStage(db, context, {
          ...job,
          applicationUrl: GOVERNMENT_OF_CANADA_FIXES[job.id]?.applicationUrl,
          retiredPage: isRetiredGovernmentOfCanadaPage,
        }, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNum}.`);
      const nextLink = await page.$(`a[href*="requestedPage=${pageNum + 1}"]`);
      if (nextLink) {
        await nextLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(7000);
        pageNum++;
      } else {
        hasNextPage = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export function shouldScrapeGovernmentOfCanadaListing(title: string, rowText = ''): boolean {
  if (!title || title.length < 3) return false;
  if (/^candidate profile$/i.test(title.trim())) return false;
  const normalizedRowText = rowText.toLowerCase();
  if (normalizedRowText.includes('internal to the public service') || normalizedRowText.includes('public service only')) return false;
  return true;
}

export async function scrapeWaterfront(db: Client, context: BrowserContext) {
  const sourceName = 'Waterfront Toronto';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://www.waterfrontoronto.ca/opportunities/join-our-team');
    const jobLinks = await page.$$eval('a', as => as
      .filter(a => a.innerText.toLowerCase().includes('view the job posting'))
      .map(a => ({ title: a.parentElement?.innerText.split('\n')[0] || 'Job Posting', url: (a as HTMLAnchorElement).href })));
    for (const job of jobLinks) {
      if (!job.url.includes('waterfrontoronto.ca')) continue;
      await scrapeRawAndStage(db, context, { id: job.url.split('/').filter(Boolean).pop() || urlId(job.url), title: job.title, url: job.url }, sourceName);
    }
  } catch (err: any) {
    console.error(`Error scraping Waterfront: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeBarrie(db: Client, context: BrowserContext) {
  const sourceName = 'City of Barrie';
  const baseUrl = 'https://careers.barrie.ca';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, `${baseUrl}/search/`, 60000);
    await page.waitForTimeout(5000);

    let pageNum = 1;
    let hasNextPage = true;
    while (hasNextPage) {
      console.log(`[${sourceName}] Page ${pageNum}...`);
      await page.waitForSelector('a[href*="/careers/"]', { timeout: 15000 }).catch(() => {});

      const summaries = await page.evaluate((baseUrl) => {
        const seen = new Set<string>();
        return Array.from(document.querySelectorAll('a[href*="/careers/"]'))
          .map(l => {
            const href = (l as HTMLAnchorElement).getAttribute('href') || '';
            const url = href.startsWith('http') ? href : baseUrl + href;
            const title = l.textContent?.trim() || '';
            return { title, url };
          })
          .filter(j => {
            if (!j.title || j.title === 'Apply Now' || !j.url || seen.has(j.url)) return false;
            seen.add(j.url);
            return /\/careers\/.+-CA-\d+-en/.test(j.url);
          });
      }, baseUrl);

      let count = 0;
      for (const job of summaries) {
        count++;
        const idMatch = job.url.match(/CA-(\d+)-en/);
        const id = idMatch ? idMatch[1] : urlId(job.url);
        process.stdout.write(`\r[${sourceName}] ${count}/${summaries.length}`);
        await scrapeRawAndStage(db, context, { ...job, id }, sourceName);
      }
      console.log(`\n[${sourceName}] Finished page ${pageNum}.`);

      const nextBtn = await page.$('button:has-text("View next page"):not([disabled])');
      if (nextBtn && await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(5000);
        pageNum++;
        if (pageNum > 20) break;
      } else {
        hasNextPage = false;
      }
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeCambridge(db: Client, context: BrowserContext) {
  const sourceName = 'City of Cambridge';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://www.cambridge.ca/mayor-city-council-government/careers-volunteering/current-opportunities/', 60000);
    await page.waitForTimeout(3000);

    const summaries = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table a[href*="sapsf.com/sfcareer/jobreqcareer"]'))
        .map(l => ({
          title: l.textContent?.trim() || '',
          url: (l as HTMLAnchorElement).href,
        }))
        .filter(j => j.title && j.url);
    });

    console.log(`[${sourceName}] Found ${summaries.length} jobs`);
    for (const job of summaries) {
      const id = new URL(job.url).searchParams.get('jobId') || urlId(job.url);
      await scrapeRawAndStage(db, context, { ...job, id }, sourceName);
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeConservationHalton(db: Client, context: BrowserContext) {
  const sourceName = 'Conservation Halton';
  const pageUrl = 'https://www.conservationhalton.ca/about-us/employment/';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, pageUrl, 60000);
    await page.waitForTimeout(3000);

    const jobTitles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h2 button'))
        .map(btn => btn.textContent?.trim() || '')
        .filter(t => t.length > 3)
    );

    console.log(`[${sourceName}] Found ${jobTitles.length} jobs`);
    for (const title of jobTitles) {
      const btn = await page.$(`h2 button:has-text("${title.substring(0, 40)}")`);
      if (!btn) continue;

      await btn.click();
      await page.waitForTimeout(2000);

      const rawText = await page.evaluate((title) => {
        const buttons = Array.from(document.querySelectorAll('h2 button'));
        const btn = buttons.find(b => b.textContent?.trim().startsWith(title.substring(0, 20)));
        const h2 = btn?.closest('h2');
        const panel = h2?.nextElementSibling;
        if (!panel) return '';
        return `${title}\n\n${panel.textContent?.trim() || ''}`;
      }, title);

      if (rawText.length > 50) {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40);
        const url = `${pageUrl}#${slug}`;
        await saveRawJob(db, { id: urlId(url), url, source: sourceName, raw_text: rawText });
        process.stdout.write(' ✅');
      }
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeDurhamRegion(db: Client, context: BrowserContext) {
  const sourceName = 'Durham Region';
  const baseUrl = 'https://recruitregion.durham.ca';
  const portalUrl = `${baseUrl}/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3`;
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, portalUrl, 60000);
    await page.waitForTimeout(2000);

    await page.click('a:has-text("View All Jobs")');
    await page.waitForTimeout(3000);

    const summaries = await page.evaluate(() => {
      const results: Array<{ title: string; jobId: string; department: string; closingDate: string }> = [];
      const items = Array.from(document.querySelectorAll('[role="listitem"]')).filter(
        el => getComputedStyle(el as HTMLElement).cursor === 'pointer'
      );
      for (const item of items) {
        const divs = Array.from(item.querySelectorAll('div, span'));
        const getValue = (label: string) => {
          for (let i = 0; i < divs.length - 1; i++) {
            if (divs[i].textContent?.trim() === label) return divs[i + 1].textContent?.trim() || '';
          }
          return '';
        };
        const title = item.firstElementChild?.textContent?.trim() || '';
        const jobId = getValue('Job ID');
        if (title && jobId) results.push({ title, jobId, department: getValue('Business Unit'), closingDate: getValue('Close Date') });
      }
      return results;
    });

    console.log(`[${sourceName}] Found ${summaries.length} jobs`);
    if (!summaries.length) return;

    await page.click('[role="listitem"]');
    await page.waitForTimeout(2000);

    for (let i = 0; i < summaries.length; i++) {
      process.stdout.write(`\r[${sourceName}] ${i + 1}/${summaries.length}`);
      const { title, jobId, department, closingDate } = summaries[i];
      const url = `${baseUrl}/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?JobOpeningId=${jobId}&SiteId=3`;

      const detail = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return { location: '', employmentType: '', rawText: '' };
        const divs = Array.from(main.querySelectorAll('div, span'));
        const getValue = (label: string) => {
          for (let i = 0; i < divs.length - 1; i++) {
            if (divs[i].textContent?.trim() === label) return divs[i + 1].textContent?.trim() || '';
          }
          return '';
        };
        return { location: getValue('Location'), employmentType: getValue('Full/Part Time'), rawText: (main as HTMLElement).innerText?.trim() || '' };
      });

      const raw_text = `Title: ${title}\nDepartment: ${department}\nLocation: ${detail.location}\nClose Date: ${closingDate}\nEmployment Type: ${detail.employmentType}\n\n${detail.rawText}`;
      await saveRawJob(db, { id: urlId(url), url, source: sourceName, raw_text });

      if (i < summaries.length - 1) {
        const nextLink = page.locator('a:has-text("Next Job")');
        if (await nextLink.count() > 0) {
          await nextLink.click();
          await page.waitForTimeout(2000);
        }
      }
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeBrantford(db: Client, context: BrowserContext) {
  const sourceName = 'City of Brantford';
  const base = 'https://www.brantford.ca';
  const subPages = [
    `${base}/your-government/careers/current-opportunities/full-time-opportunities/`,
    `${base}/your-government/careers/current-opportunities/part-time-opportunities/`,
    `${base}/your-government/careers/current-opportunities/seasonal-opportunities/`,
    `${base}/your-government/careers/current-opportunities/student-opportunities/`,
  ];
  console.log(`Scraping ${sourceName}...`);
  const seen = new Set<string>();
  const page = await context.newPage();
  try {
    for (const subUrl of subPages) {
      await safeGoto(page, subUrl, 60000);
      await page.waitForTimeout(2000);

      const jobs = await page.evaluate((base) => {
        return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
          const link = row.querySelector('a[href*="job-profile"]') as HTMLAnchorElement;
          if (!link) return null;
          const cells = Array.from(row.querySelectorAll('td'));
          const href = link.getAttribute('href') || '';
          return {
            title: link.textContent?.trim() || '',
            url: href.startsWith('http') ? href : base + href,
            department: cells[1]?.textContent?.trim() || '',
            closingDate: cells[2]?.textContent?.trim() || '',
          };
        }).filter(Boolean);
      }, base);

      for (const job of jobs) {
        if (!job || seen.has(job.url)) continue;
        seen.add(job.url);
        await scrapeRawAndStage(db, context, { id: urlId(job.url), title: job.title, url: job.url, department: job.department, closingDate: job.closingDate }, sourceName);
      }
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapePeterborough(db: Client, context: BrowserContext) {
  const sourceName = 'City of Peterborough';
  const base = 'https://www.peterborough.ca';
  const careersPath = '/council-city-hall/careers';

  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, `${base}${careersPath}`, 60000);
    await page.waitForTimeout(2000);

    const jobs = extractPeterboroughJobs(await page.content(), `${base}${careersPath}`);

    console.log(`[${sourceName}] Found ${jobs.length} job pages`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, { ...job, retiredPage: isPeterboroughUnavailablePage }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export type PeterboroughJob = { id: string; title: string; url: string };

export function isPeterboroughUnavailablePage(rawText: string): boolean {
  return /(?:application error|job .*?is no longer available|requested page .*?not available)/i.test(rawText);
}

export function extractPeterboroughJobs(html: string, portalUrl: string): PeterboroughJob[] {
  const jobs: PeterboroughJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']*\/sfcareer\/jobreqcareer[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const rawUrl = decodeHtmlEntities(match[1]);
    const jobId = rawUrl.match(/[?&]jobId=(\d+)/i)?.[1];
    const company = rawUrl.match(/[?&]company=([\w-]+)/i)?.[1];
    if (!jobId || !company || seen.has(jobId)) continue;

    const title = decodeHtmlEntities(
      match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!title) continue;

    const url = new URL(`/sfcareer/jobreqcareer?jobId=${jobId}&company=${company}`, new URL(rawUrl, portalUrl).origin).href;
    seen.add(jobId);
    jobs.push({ id: `peterborough_${jobId}`, title, url });
  }

  return jobs;
}

export async function scrapeVaughanPL(db: Client, context: BrowserContext) {
  const sourceName = 'Vaughan Public Library';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, 'https://www.vaughanpl.info/jobs', 60000);
    await page.waitForTimeout(2000);

    const jobs = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#ats table tbody tr'));
      return rows.map(tr => {
        const descriptionLink = tr.querySelector<HTMLAnchorElement>('a[href*="/files/job_descriptions/"]');
        const applyLink = tr.querySelector<HTMLAnchorElement>('a[href*="/jobs-applications/add/"]');
        if (!descriptionLink || !applyLink) return null;
        return {
          title: descriptionLink.getAttribute('title') || descriptionLink.textContent?.trim() || undefined,
          descriptionUrl: descriptionLink.href,
          applicationUrl: applyLink.href,
        };
      }).filter(Boolean) as Array<{ title?: string; descriptionUrl: string; applicationUrl: string }>;
    });

    console.log(`[${sourceName}] Found ${jobs.length} jobs`);
    for (const job of jobs) {
      const m = job.applicationUrl.match(/\/jobs-applications\/add\/(\d+)/);
      if (!m?.[1]) continue;
      await scrapeRawAndStage(db, context, {
        id: `vaughanpl_${m[1]}`,
        url: job.applicationUrl,
        applicationUrl: job.applicationUrl,
        descriptionUrl: job.descriptionUrl,
        ...(job.title ? { title: job.title } : {}),
      }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeStClairCollege(db: Client, context: BrowserContext) {
  const sourceName = 'St. Clair College';
  const base = 'https://www.stclaircollege.ca';
  const listingUrls = [
    `${base}/careers/current-opportunities/ft`,
    `${base}/careers/current-opportunities/rpt`,
    `${base}/careers/current-opportunities/pt`,
  ];
  const applicationUrl = `${base}/careers/apply`;
  const seen = new Set<string>();
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    for (const listingUrl of listingUrls) {
      await safeGoto(page, listingUrl, 60000);
      const jobs = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/sites/default/files/careers/"]'))
        .map(link => ({ title: link.textContent?.trim() || undefined, url: link.href }))
        .filter(job => job.url.toLowerCase().endsWith('.pdf')));

      for (const job of jobs) {
        if (seen.has(job.url)) continue;
        seen.add(job.url);
        await scrapeRawAndStage(db, context, {
          id: `stclair_${urlId(job.url)}`,
          url: applicationUrl,
          applicationUrl,
          descriptionUrl: job.url,
          ...(job.title ? { title: job.title } : {}),
        }, sourceName);
      }
    }
    console.log(`\n[${sourceName}] Done — ${seen.size} jobs discovered.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

type PickeringJob = {
  title?: string;
  descriptionUrl: string;
  applicationUrl: string;
  source: 'City of Pickering' | 'Pickering Public Library';
  closingDate?: string;
};

export async function scrapePickering(
  db: Client,
  context: BrowserContext,
  requestedSource?: PickeringJob['source'],
) {
  const pageUrl = 'https://www.pickering.ca/council-city-administration/employment-opportunities/';
  console.log('Scraping Pickering employment opportunities...');
  const page = await context.newPage();
  try {
    await safeGoto(page, pageUrl, 60000);
    const jobs = await page.evaluate(() => Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/media/"][href$=".pdf"]'),
    ).map((link): PickeringJob => {
      const section = link.closest('.repeatable-content');
      const sectionTitle = section?.previousElementSibling?.textContent?.trim() || '';
      const row = link.closest('tr');
      const cells = row ? Array.from(row.querySelectorAll('td')).map(cell => cell.textContent?.trim() || '') : [];
      return {
        title: link.getAttribute('title') || link.textContent?.trim() || undefined,
        descriptionUrl: link.href,
        applicationUrl: window.location.href,
        source: /Pickering Public Library/i.test(sectionTitle)
          ? 'Pickering Public Library'
          : 'City of Pickering',
        ...(cells[4] ? { closingDate: cells[4] } : {}),
      };
    }));

    const activeJobs = jobs.filter((job) => {
      if (requestedSource && job.source !== requestedSource) return false;
      if (!job.closingDate) return true;
      const closingTime = Date.parse(job.closingDate);
      return !Number.isFinite(closingTime) || closingTime >= Date.now();
    });
    const scope = requestedSource ? ` for ${requestedSource}` : '';
    console.log(`[Pickering] Found ${activeJobs.length} active PDF postings${scope} (${jobs.length} listed).`);
    for (const job of activeJobs) {
      const id = `${job.source === 'Pickering Public Library' ? 'pickering_library' : 'pickering'}_${urlId(job.descriptionUrl)}`;
      await scrapeRawAndStage(db, context, {
        id,
        url: job.applicationUrl,
        applicationUrl: job.applicationUrl,
        descriptionUrl: job.descriptionUrl,
        ...(job.title ? { title: job.title } : {}),
      }, job.source);
    }
  } catch (err: any) {
    console.error(`Error scraping Pickering: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export type HaltonHillsJob = { id: string; title: string; url: string };

export function extractHaltonHillsJobs(html: string, portalUrl: string): HaltonHillsJob[] {
  const jobs: HaltonHillsJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b([^>]*class=["'][^"']*\bjob_card_container\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const attributes = match[1] || '';
    const body = match[2] || '';
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const titleHtml = body.match(/<[^>]*class=["'][^"']*\bcard_title\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1];
    if (!href || !titleHtml) continue;
    const url = new URL(href, portalUrl).href;
    const title = decodeHtmlEntities(titleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!title || seen.has(url)) continue;
    seen.add(url);
    jobs.push({ id: `haltonhills_${urlId(url)}`, title, url });
  }
  return jobs;
}

export async function scrapeHaltonHills(db: Client, context: BrowserContext) {
  const sourceName = 'Town of Halton Hills';
  const pageUrl = 'https://www.haltonhills.ca/careers';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, pageUrl, 60000);
    const jobs = extractHaltonHillsJobs(await page.content(), pageUrl);
    console.log(`[${sourceName}] Found ${jobs.length} postings.`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, sourceName);
    }
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export type StLawrenceJob = { id: string; title: string; url: string };

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export function extractStLawrenceJobs(html: string, portalUrl: string): StLawrenceJob[] {
  const jobs: StLawrenceJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']*\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const anchorText = match[2];
    if (!href) continue;

    const url = new URL(href, portalUrl);
    const jobPath = url.pathname.replace(/\/$/, '');
    const marker = '/jobs/';
    const slug = jobPath.slice(jobPath.indexOf(marker) + marker.length);
    if (!slug || seen.has(url.href)) continue;

    const title = decodeHtmlEntities(
      anchorText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!title) continue;

    seen.add(url.href);
    jobs.push({
      id: `stlawrence_${slug.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()}`,
      title,
      url: url.href,
    });
  }

  return jobs;
}

export async function scrapeStLawrenceCollege(db: Client, context: BrowserContext) {
  const sourceName = 'St. Lawrence College';
  const listingUrl = 'https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    const jobs = extractStLawrenceJobs(await page.content(), listingUrl);
    console.log(`[${sourceName}] Found ${jobs.length} job pages`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export type BrassRingJob = { id: string; title: string; url: string };

export function extractBrassRingJobs(html: string, portalUrl: string): BrassRingJob[] {
  const jobs: BrassRingJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href=["']([^"']*PageType=JobDetails(?:&amp;|&)jobid=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const jobId = match[2];
    const anchorText = match[3];
    if (!href || !jobId || !anchorText || seen.has(jobId)) continue;

    const url = new URL(href.replace(/&amp;/g, '&'), portalUrl).href;
    const title = decodeHtmlEntities(
      anchorText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!title) continue;

    seen.add(jobId);
    jobs.push({ id: `brassring_${jobId}`, title, url });
  }

  return jobs;
}

export async function scrapeBrassRing(db: Client, context: BrowserContext) {
  const sourceName = 'Halifax Regional Municipality';
  const listingUrl = 'https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25749&siteid=5764';
  console.log(`Scraping ${sourceName} (BrassRing)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    const allJobsButton = page.locator('[ng-click="searchMatchedJobs(this)"]');
    if (await allJobsButton.count()) {
      await allJobsButton.first().click();
      await page.waitForSelector('a[href*="PageType=JobDetails"]', { timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    const jobs = extractBrassRingJobs(await page.content(), listingUrl);
    console.log(`[${sourceName}] Found ${jobs.length} job pages`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export type CustomHtmlJob = { id: string; title: string; url: string };

export function extractCustomHtmlJobs(
  html: string,
  portalUrl: string,
  pathPrefix: string,
  options: { requireHrefLang?: string; titleClass?: string; idPrefix?: string } = {},
): CustomHtmlJob[] {
  const jobs: CustomHtmlJob[] = [];
  const seen = new Set<string>();
  const normalizedPrefix = pathPrefix.replace(/\/$/, '');
  const anchorPattern = /<a\b([^>]*href=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attributes = match[1] || '';
    const href = match[2];
    const anchorHtml = match[3] || '';
    if (!href) continue;
    if (options.requireHrefLang && !new RegExp(`hreflang=["']${options.requireHrefLang}["']`, 'i').test(attributes)) continue;

    const url = new URL(href, portalUrl);
    const pathname = url.pathname.replace(/\/$/, '');
    if (pathname === normalizedPrefix || !pathname.startsWith(`${normalizedPrefix}/`) || seen.has(url.href)) continue;

    const titleMatch = options.titleClass
      ? anchorHtml.match(new RegExp(`<[^>]*class=["'][^"']*${options.titleClass}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'))
      : null;
    const titleHtml = titleMatch?.[1] || anchorHtml;
    const title = decodeHtmlEntities(
      titleHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!title || /^apply now$/i.test(title)) continue;

    seen.add(url.href);
    jobs.push({ id: `${options.idPrefix ?? 'custom'}_${urlId(url.href)}`, title, url: url.href });
  }

  return jobs;
}

async function scrapeMunicipalHtml(
  db: Client,
  context: BrowserContext,
  listingUrl: string,
  sourceName: string,
  pathPrefix: string,
  idPrefix: string,
) {
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    const jobs = extractCustomHtmlJobs(await page.content(), listingUrl, pathPrefix, { idPrefix });
    console.log(`[${sourceName}] Found ${jobs.length} postings.`);
    for (const job of jobs) await scrapeRawAndStage(db, context, job, sourceName);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export function scrapeNorthBay(db: Client, context: BrowserContext) {
  return scrapeMunicipalHtml(
    db,
    context,
    'https://northbay.ca/city-government/careers/',
    'City of North Bay',
    '/current-employment-opportunities',
    'northbay',
  );
}

export function scrapeCollingwood(db: Client, context: BrowserContext) {
  return scrapeMunicipalHtml(
    db,
    context,
    'https://www.collingwood.ca/governance-engagement/careers-employment',
    'Town of Collingwood',
    '/governance-engagement/careers-employment',
    'collingwood',
  );
}

export type NanaimoJob = {
  id: string;
  title: string;
  url: string;
  descriptionUrl: string;
  applicationUrl: string;
};

export function extractNanaimoJobs(html: string, listingUrl: string): NanaimoJob[] {
  const starts = Array.from(html.matchAll(/<div\b[^>]*class=["'][^"']*\bgrid-item\b[^"']*["'][^>]*>/gi))
    .map(match => match.index ?? -1)
    .filter(index => index >= 0);
  const jobs: NanaimoJob[] = [];

  for (let index = 0; index < starts.length; index++) {
    const block = html.slice(starts[index], starts[index + 1] ?? html.length);
    const detailMatch = block.match(/<a\b[^>]*href=["']([^"']*\/your-government\/careers\/job-postings\/[^"']+)["'][^>]*>\s*View Job Posting and Job Description\s*<\/a>/i);
    const titleMatch = block.match(/<h3\b[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i);
    const pdfMatch = block.match(/<h3\b[^>]*>\s*<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
    if (!detailMatch || !titleMatch || !pdfMatch) continue;

    const detailUrl = new URL(detailMatch[1], listingUrl).href;
    const descriptionUrl = new URL(pdfMatch[1], listingUrl).href;
    const title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const competition = block.match(/Competition:\s*([^<\r\n]+)/i)?.[1]?.trim();
    if (!title || jobs.some(job => job.url === detailUrl)) continue;

    jobs.push({
      id: competition && !/^n\/a$/i.test(competition)
        ? `nanaimo_${competition.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()}`
        : `nanaimo_${urlId(detailUrl)}`,
      title,
      url: detailUrl,
      descriptionUrl,
      applicationUrl: detailUrl,
    });
  }

  return jobs;
}

export async function scrapeNanaimo(db: Client, context: BrowserContext) {
  const sourceName = 'City of Nanaimo';
  const listingUrl = 'https://www.nanaimo.ca/your-government/careers/job-postings';
  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, listingUrl, 60000);
    const jobs = extractNanaimoJobs(await page.content(), listingUrl);
    console.log(`[${sourceName}] Found ${jobs.length} postings.`);
    for (const job of jobs) await scrapeRawAndStage(db, context, job, sourceName);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

async function scrapeCustomHtmlPortal(
  db: Client,
  context: BrowserContext,
  config: {
    sourceName: string;
    listingUrl: string;
    pathPrefix: string;
    requireHrefLang?: string;
    titleClass?: string;
  },
) {
  console.log(`Scraping ${config.sourceName} (custom HTML)...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, config.listingUrl, 60000);
    const jobs = extractCustomHtmlJobs(await page.content(), config.listingUrl, config.pathPrefix, config);
    console.log(`[${config.sourceName}] Found ${jobs.length} job pages`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, job, config.sourceName);
    }
    console.log(`\n[${config.sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${config.sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeNipissing(db: Client, context: BrowserContext) {
  return scrapeCustomHtmlPortal(db, context, {
    sourceName: 'Nipissing University',
    listingUrl: 'https://www.nipissingu.ca/careers/employment-postings',
    pathPrefix: '/careers/employment-postings',
    requireHrefLang: 'en',
  });
}

export async function scrapeNorthernCollege(db: Client, context: BrowserContext) {
  return scrapeCustomHtmlPortal(db, context, {
    sourceName: 'Northern College',
    listingUrl: 'https://www.northerncollege.ca/careers/',
    pathPrefix: '/careers/jobs',
    titleClass: 'job-title',
  });
}

export type PhenomJob = { id: string; title: string; url: string };

function getHtmlAttribute(attributes: string, name: string): string | undefined {
  const match = attributes.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined;
}

export function extractPhenomJobs(html: string, portalUrl: string): PhenomJob[] {
  const jobs: PhenomJob[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b([^>]*href=["']([^"']*\/job\/(\d+)\/[^"']+)["'][^>]*)>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const attributes = match[1] || '';
    const href = match[2];
    const jobId = match[3];
    if (!href || !jobId || seen.has(jobId)) continue;

    const url = new URL(href, portalUrl).href;
    const title = getHtmlAttribute(attributes, 'data-ph-at-job-title-text');
    if (!title) continue;

    seen.add(jobId);
    jobs.push({ id: `phenom_${jobId}`, title, url });
  }

  return jobs;
}

export async function scrapeEdmontonPhenom(db: Client, context: BrowserContext) {
  const sourceName = 'City of Edmonton';
  const base = 'https://recruitment.edmonton.ca';
  const views = ['/search-results', '/int/search-results', '/student/search-results'];
  const seenJobs = new Set<string>();
  const seenPages = new Set<string>();
  console.log(`Scraping ${sourceName} (Phenom People)...`);
  const page = await context.newPage();
  try {
    for (const view of views) {
      let nextUrl = `${base}${view}`;
      while (!seenPages.has(nextUrl)) {
        seenPages.add(nextUrl);
        await safeGoto(page, nextUrl, 60000);
        const jobs = extractPhenomJobs(await page.content(), nextUrl);
        console.log(`[${sourceName}] ${view} ${nextUrl.includes('from=') ? 'next page' : 'first page'}: ${jobs.length} jobs`);
        for (const job of jobs) {
          if (seenJobs.has(job.id)) continue;
          seenJobs.add(job.id);
          await scrapeRawAndStage(db, context, job, sourceName);
        }

        const nextHref = await page.locator('a').evaluateAll((links) =>
          links.find((link) => link.textContent?.trim() === 'Next')?.getAttribute('href') ?? null,
        );
        if (!nextHref) break;
        nextUrl = new URL(nextHref, nextUrl).href;
      }
    }
    console.log(`\n[${sourceName}] Done — ${seenJobs.size} jobs discovered across all views.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeSmithsFalls(db: Client, context: BrowserContext) {
  const sourceName = 'Town of Smiths Falls';
  const base = 'https://www.smithsfalls.ca';
  const careersPath = '/council-administration/careers';

  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, `${base}${careersPath}/`, 60000);
    await page.waitForTimeout(2000);

    const jobUrls = await page.evaluate(({ careersPath }) => {
      const seen = new Set<string>();
      return Array.from(document.querySelectorAll<HTMLAnchorElement>(`table a[href*="${careersPath}/"]`))
        .map(a => a.href)
        .filter(href => {
          try {
            const path = new URL(href).pathname.replace(/\/$/, '');
            if (path === careersPath) return false;
            if (seen.has(href)) return false;
            seen.add(href);
            return true;
          } catch { return false; }
        });
    }, { careersPath });

    console.log(`[${sourceName}] Found ${jobUrls.length} job pages`);
    for (const url of jobUrls) {
      const slug = new URL(url).pathname.replace(/\/$/, '').split('/').pop() || '';
      await scrapeRawAndStage(db, context, { id: `smithsfalls_${slug}`, url }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeNorthumberland(db: Client, context: BrowserContext) {
  const sourceName = 'Northumberland County';
  const base = 'https://northumberland.ca';

  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, `${base}/county-government/careers/`, 60000);
    await page.waitForTimeout(2000);

    const jobUrls = await page.evaluate(() => {
      const seen = new Set<string>();
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/job/"]'))
        .map(a => a.href)
        .filter(href => {
          try {
            const path = new URL(href).pathname.replace(/\/$/, '');
            if (!/^\/job\/[^/]+$/.test(path)) return false;
            if (seen.has(href)) return false;
            seen.add(href);
            return true;
          } catch { return false; }
        });
    });

    console.log(`[${sourceName}] Found ${jobUrls.length} job pages`);
    for (const url of jobUrls) {
      const slug = new URL(url).pathname.replace(/\/$/, '').split('/').pop() || '';
      await scrapeRawAndStage(db, context, { id: `northumberland_${slug}`, url }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}

export async function scrapeTDSB(db: Client, context: BrowserContext) {
  const sourceName = 'Toronto District School Board';
  const base = 'https://www.tdsb.on.ca';

  console.log(`Scraping ${sourceName}...`);
  const page = await context.newPage();
  try {
    await safeGoto(page, `${base}/jobpostings/list.html`, 60000);
    await page.waitForTimeout(2000);

    const jobs = await page.evaluate(() => {
      const seen = new Set<string>();
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="jobpostings/details.html"]'))
        .map(a => ({ url: a.href, jobId: new URL(a.href).searchParams.get('jobId') }))
        .filter(j => {
          if (!j.jobId || seen.has(j.jobId)) return false;
          seen.add(j.jobId);
          return true;
        });
    });

    console.log(`[${sourceName}] Found ${jobs.length} job pages`);
    for (const job of jobs) {
      await scrapeRawAndStage(db, context, { id: `tdsb_${job.jobId}`, url: job.url }, sourceName);
    }
    console.log(`\n[${sourceName}] Done.`);
  } catch (err: any) {
    console.error(`Error scraping ${sourceName}: ${err.message}`);
    throw err;
  } finally {
    await page.close();
  }
}
