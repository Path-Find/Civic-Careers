import { chromium, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { initDb } from './db';
import { BASE_CONFIG, githubRunUrl, notifyDiscord } from './utils';

import { scrapeSuccessFactors } from './engines/successfactors';
import { scrapeWorkday } from './engines/workday';
import { scrapeNjoyn } from './engines/njoyn';
import { scrapeOracleCloud } from './engines/oracle';
import { scrapeDayforce } from './engines/dayforce';
import { scrapeJobs2Web } from './engines/jobs2web';
import { scrapeICIMS } from './engines/icims';
import { scrapeHRSmart } from './engines/hrsmart';
import { scrapeUltiPro } from './engines/ultipro';
import { scrapeADP } from './engines/adp';
import { scrapeTaleo } from './engines/taleo';
import { scrapeAvanti } from './engines/avanti';
import { scrapeBambooHR, scrapeCreateTO } from './engines/bamboohr';
import { scrapeTalentPoolBuilder } from './engines/talentpoolbuilder';
import {
  scrapeOPS,
  scrapeGC,
  scrapeWaterfront,
  scrapeBarrie,
  scrapeCambridge,
  scrapeConservationHalton,
  scrapeBrantford,
  scrapePeterborough,
  scrapeSmithsFalls,
  scrapeNorthumberland,
  scrapeTDSB,
} from './engines/custom';
import { scrapeRSS } from './engines/rss';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeWorkland } from './engines/workland';
import { scrapeJibe } from './engines/jibe';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeCSOD } from './engines/csod';

export { scrapeSuccessFactors, scrapeWorkday, scrapeWaterfront, scrapeConservationHalton, scrapeADP };
export { urlId, scrapeRawAndStage } from './utils';

interface ScrapeTask {
  engine: string;
  label: string;
  run: (db: Client, context: BrowserContext) => Promise<void>;
}

// Grouped by engine (not just region) so CI can run each engine as its own
// job — a bug in one engine's pagination/DOM handling (see workday.ts) then
// shows up as one red job instead of being buried in one aggregate log.
const TASKS: ScrapeTask[] = [
  // 1. Core Toronto Agencies
  { engine: 'successfactors', label: 'TTC', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://career17.sapsf.com/career?company=TTCPRODUCTION&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH', 'TTC', 'https://career17.sapsf.com') },
  { engine: 'successfactors', label: 'City of Toronto', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://jobs.toronto.ca/jobsatcity/search/', 'City of Toronto', 'https://jobs.toronto.ca') },
  { engine: 'oracle', label: 'Metrolinx', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://ehtc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'Metrolinx') },

  // 2. Libraries & Specialized
  // TPL (Njoyn) blocked by Radware bot protection — cannot scrape headlessly
  { engine: 'custom', label: 'Waterfront Toronto', run: (db, ctx) => scrapeWaterfront(db, ctx) },

  // 3. Crown Corps & Conservation
  { engine: 'jobs2web', label: 'CMHC', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.cmhc-schl.gc.ca/search/', 'CMHC') },
  { engine: 'dayforce', label: 'TRCA', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/trca/CANDIDATEPORTAL', 'TRCA') },
  { engine: 'dayforce', label: 'Infrastructure Ontario', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-US/infrastructureontario/CANDIDATEPORTAL', 'Infrastructure Ontario') },
  { engine: 'bamboohr', label: 'CreateTO', run: (db, ctx) => scrapeCreateTO(db, ctx) },
  { engine: 'custom', label: 'City of Barrie', run: (db, ctx) => scrapeBarrie(db, ctx) },
  { engine: 'njoyn', label: 'City of Oshawa', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://cityofoshawa.njoyn.com/CL/xweb/Xweb.asp?page=joblisting&CLID=126638', 'City of Oshawa') },
  { engine: 'workday', label: 'Town of Ajax', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://ajax.wd10.myworkdayjobs.com/Ajax', 'Town of Ajax') },
  { engine: 'ultipro', label: 'Town of Caledon', run: (db, ctx) => scrapeUltiPro(db, ctx, 'https://recruiting.ultipro.ca/COR5003CALED/JobBoard/55e2803a-385b-47b1-b911-51dd7ed81d1e/?q=&o=postedDateDesc', 'Town of Caledon') },
  { engine: 'workday', label: 'City of Niagara Falls', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://niagarafalls.wd10.myworkdayjobs.com/CNF', 'City of Niagara Falls') },
  { engine: 'jobs2web', label: 'City of London', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.london.ca/search/', 'City of London') },
  { engine: 'jobs2web', label: 'City of Kitchener', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.kitchener.ca/search/', 'City of Kitchener') },
  { engine: 'talentpoolbuilder', label: 'City of Waterloo', run: (db, ctx) => scrapeTalentPoolBuilder(db, ctx, 'https://cityofwaterloo.talentpoolbuilder.com/', 'City of Waterloo') },
  { engine: 'custom', label: 'City of Cambridge', run: (db, ctx) => scrapeCambridge(db, ctx) },
  { engine: 'custom', label: 'Conservation Halton', run: (db, ctx) => scrapeConservationHalton(db, ctx) },
  { engine: 'adp', label: 'Municipality of Clarington', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=09ed440f-e109-4f6f-ac03-075ea0a3a5e5&ccId=19000101_000001&lang=en_CA', 'Municipality of Clarington') },

  // 4. Federal
  { engine: 'custom', label: 'Government of Canada', run: (db, ctx) => scrapeGC(db, ctx) },

  // 5. Province of Ontario
  { engine: 'custom', label: 'Province of Ontario', run: (db, ctx) => scrapeOPS(db, ctx) },

  // 6. GTHA Regions & Cities
  { engine: 'workday', label: 'Town of Whitby', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://whitby.wd10.myworkdayjobs.com/EXT', 'Town of Whitby') },
  { engine: 'hrsmart', label: 'York Region', run: (db, ctx) => scrapeHRSmart(db, ctx, 'https://york.hua.hrsmart.com/hr/ats/JobSearch/viewAll', 'York Region') },
  { engine: 'adp', label: 'City of Markham', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=04bf51f8-d2dd-4641-ba92-183522f6e8b3&ccId=19000101_000001&type=MP&lang=en_CA', 'City of Markham') },
  { engine: 'adp', label: 'Town of Aurora', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b1fead40-7a8c-4b14-87a0-dc031bab192d&ccId=19000101_000001&lang=en_CA', 'Town of Aurora') },
  { engine: 'jobs2web', label: 'City of Richmond Hill', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.richmondhill.ca/search/', 'City of Richmond Hill') },
  { engine: 'icims', label: 'Peel Region', run: (db, ctx) => scrapeICIMS(db, ctx, 'https://careers-peelregion.icims.com/jobs/search?ss=1', 'Peel Region') },
  { engine: 'icims', label: 'City of Guelph', run: (db, ctx) => scrapeICIMS(db, ctx, 'https://careers-guelph.icims.com/jobs/search?ss=1', 'City of Guelph') },
  { engine: 'icims', label: 'City of Victoria', run: (db, ctx) => scrapeICIMS(db, ctx, 'https://careersen-victoria.icims.com/jobs/search?ss=1', 'City of Victoria') },
  { engine: 'successfactors', label: 'Halton Region', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://careers.halton.ca/search/', 'Halton Region', 'https://careers.halton.ca') },
  { engine: 'workday', label: 'City of Burlington', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://wd10.myworkdaysite.com/recruiting/cityofburlington/cob', 'City of Burlington') },
  { engine: 'taleo', label: 'Town of Oakville', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TOWNOFOA&cws=43', 'Town of Oakville') },
  { engine: 'workday', label: 'Town of Milton', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://milton.wd10.myworkdayjobs.com/TownOfMilton', 'Town of Milton') },
  { engine: 'successfactors', label: 'Mississauga', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://jobs.mississauga.ca/search/', 'Mississauga', 'https://jobs.mississauga.ca') },
  { engine: 'jobs2web', label: 'City of Brampton', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.brampton.ca/search/', 'City of Brampton') },
  { engine: 'njoyn', label: 'City of Vaughan', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://cityofvaughan.njoyn.com/cl4/xweb/Xweb.asp?page=joblisting&CLID=74035', 'City of Vaughan') },
  { engine: 'taleo', label: 'City of St. Catharines', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=COSC&cws=37', 'City of St. Catharines') },
  { engine: 'avanti', label: 'City of Welland', run: (db, ctx) => scrapeAvanti(db, ctx, 'https://welland.myavanti.ca/careers', 'City of Welland') },
  { engine: 'custom', label: 'City of Brantford', run: (db, ctx) => scrapeBrantford(db, ctx) },
  { engine: 'bamboohr', label: 'City of Hamilton', run: (db, ctx) => scrapeBambooHR(db, ctx, 'https://cityofhamilton.bamboohr.com/careers', 'City of Hamilton') },
  { engine: 'custom', label: 'City of Peterborough', run: (db, ctx) => scrapePeterborough(db, ctx) },

  // 7. Southwestern Ontario
  { engine: 'jazzhr', label: 'City of Windsor', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://cityofwindsor.applytojob.com/apply/', 'City of Windsor', 'windsor') },
  { engine: 'adp', label: 'City of Sarnia', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=9ba4d624-1cab-4482-861f-900704c3df0d&ccId=19000101_000001&lang=en_CA', 'City of Sarnia') },
  { engine: 'dayforce', label: 'City of St. Thomas', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-CA/stthomas/CANDIDATEPORTAL', 'City of St. Thomas') },
  { engine: 'dayforce', label: 'Town of Orangeville', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-US/orangeville/CANDIDATEPORTAL', 'Town of Orangeville') },
  { engine: 'jobs2web', label: 'Region of Waterloo', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.regionofwaterloo.ca/RoW/search/', 'Region of Waterloo') },

  // 8. Northern Ontario
  { engine: 'jibe', label: 'City of Thunder Bay', run: (db, ctx) => scrapeJibe(db, ctx, 'https://careers.thunderbay.ca/careers-home/jobs', 'City of Thunder Bay', 'thunderbay') },

  // 9. Eastern Ontario
  { engine: 'successfactors', label: 'City of Ottawa', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://career47.sapsf.com/careers/cityofottawa/search', 'City of Ottawa', 'https://career47.sapsf.com') },
  { engine: 'rss', label: 'City of Kingston', run: (db, ctx) => scrapeRSS(db, ctx, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston', 'https://careers.cityofkingston.ca/CL2/xweb/xweb.asp?CLID=61577&page=joblisting&lang=1') },
  { engine: 'jazzhr', label: 'City of Belleville', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville') },
  { engine: 'workland', label: 'City of Cornwall', run: (db, ctx) => scrapeWorkland(db, ctx, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall') },
  { engine: 'custom', label: 'Town of Smiths Falls', run: (db, ctx) => scrapeSmithsFalls(db, ctx) },

  // 10. Higher Education (Colleges & Universities)
  { engine: 'jobs2web', label: 'University of Toronto', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.utoronto.ca/search/', 'University of Toronto') },
  { engine: 'taleo', label: 'Seneca College', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=SENECOLL4&cws=42', 'Seneca College') },
  { engine: 'njoyn', label: 'Centennial College', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://centennial.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56827', 'Centennial College') },
  { engine: 'workday', label: 'University of Waterloo', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uwaterloo.wd3.myworkdayjobs.com/uw_careers', 'University of Waterloo') },
  { engine: 'workday', label: 'Brock University', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://brocku.wd3.myworkdayjobs.com/brocku_careers', 'Brock University') },
  { engine: 'njoyn', label: 'Sheridan College', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://sheridan.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=55117', 'Sheridan College') },
  { engine: 'jobs2web', label: 'University of Guelph', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.uoguelph.ca/search/', 'University of Guelph') },
  { engine: 'workday', label: 'University of Ottawa', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site', 'University of Ottawa') },
  { engine: 'workday', label: 'Algonquin College', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://algonquincollege.wd3.myworkdayjobs.com/CareerOpportunities', 'Algonquin College') },
  { engine: 'workday', label: 'Fanshawe College', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://fanshawec.wd3.myworkdayjobs.com/fanshawecareers', 'Fanshawe College') },
  { engine: 'njoyn', label: 'Carleton University', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://carleton.njoyn.com/CL2/xweb/xweb.asp?CLID=53443&page=joblisting&lang=1', 'Carleton University') },
  { engine: 'taleo', label: 'OCAD University', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=OCADU&cws=37', 'OCAD University') },
  { engine: 'taleo', label: 'Humber College', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en', 'Humber College') },
  { engine: 'njoyn', label: "Queen's University", run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://queensu.njoyn.com/cl4/xweb/xweb.asp?page=joblisting&CLID=74827', "Queen's University") },
  { engine: 'csod', label: 'George Brown College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://georgebrown.csod.com/ux/ats/careersite/4/home?c=georgebrown&lang=en-US', 'George Brown College') },
  { engine: 'csod', label: 'Mohawk College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://talent-mohawkcollege.csod.com/ux/ats/careersite/2/home?c=talent-mohawkcollege', 'Mohawk College') },
  { engine: 'csod', label: 'Durham College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://durham.csod.com/ux/ats/careersite/4/home?c=durham', 'Durham College') },
  { engine: 'csod', label: 'Ontario Tech University', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://ontariotechu.csod.com/ux/ats/careersite/4/home?c=ontariotechu', 'Ontario Tech University') },

  // 11. Health & Other Agencies
  { engine: 'oracle', label: 'EFHC', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'EFHC') },

  // 12. Western Canada (first sources outside Ontario/Quebec)
  { engine: 'jobs2web', label: 'City of Vancouver', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.vancouver.ca/search/', 'City of Vancouver') },
  { engine: 'dayforce', label: 'City of Brandon', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/brandon/COB', 'City of Brandon') },
  { engine: 'oracle', label: 'City of Red Deer', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://fa-eyjj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'City of Red Deer') },

  // 13. Additional custom sources
  { engine: 'custom', label: 'Northumberland County', run: (db, ctx) => scrapeNorthumberland(db, ctx) },
  { engine: 'custom', label: 'Toronto District School Board', run: (db, ctx) => scrapeTDSB(db, ctx) },

  // 14. PeopleSoft Fluid (only tenants confirmed working so far — see issue #37)
  { engine: 'peoplesoft', label: 'City of Winnipeg', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://careers.winnipeg.ca/psc/cgext/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'City of Winnipeg') },
];

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const engineFilter = process.env.SCRAPE_ENGINE;
  const tasks = engineFilter ? TASKS.filter(t => t.engine === engineFilter) : TASKS;

  if (engineFilter && tasks.length === 0) {
    console.error(`No tasks found for engine "${engineFilter}"`);
    process.exit(1);
  }

  console.log(`Launching browser (headless: ${headless})...`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();

  console.log(`--- STARTING SCRAPE RUN${engineFilter ? ` (engine: ${engineFilter})` : ''} — ${tasks.length} source(s) ---`);

  // Match SQLite's CURRENT_TIMESTAMP format ("YYYY-MM-DD HH:MM:SS", no "T"/"Z")
  // — comparing against a raw ISO string breaks the >= comparison below.
  const startedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const labels = tasks.map(t => t.label);
  const inPlaceholders = labels.map(() => '?').join(',');
  // raw_jobs is upsert-by-id and never deletes rows, so a plain row-count delta
  // across the run tells us how many *new* postings appeared (re-scraped
  // existing postings just bump scraped_at, they don't add a row).
  const countForLabels = async () => {
    const result = await db.execute({
      sql: `SELECT COUNT(*) as n FROM raw_jobs WHERE source IN (${inPlaceholders})`,
      args: labels,
    });
    return Number(result.rows[0]?.n ?? 0);
  };
  const beforeCount = labels.length > 0 ? await countForLabels() : 0;

  const results: { label: string; ok: boolean; error?: string }[] = [];
  for (const task of tasks) {
    try {
      await task.run(db, context);
      await db.execute({
        sql: `INSERT INTO source_scrape_status (source, last_successful_scrape_at, last_status)
              VALUES (?, CURRENT_TIMESTAMP, 'success')
              ON CONFLICT(source) DO UPDATE SET
                last_successful_scrape_at = CURRENT_TIMESTAMP,
                last_status = 'success'`,
        args: [task.label],
      });
      results.push({ label: task.label, ok: true });
    } catch (err: any) {
      await db.execute({
        sql: `INSERT INTO source_scrape_status (source, last_successful_scrape_at, last_status)
              VALUES (?, NULL, 'failed')
              ON CONFLICT(source) DO UPDATE SET last_status = 'failed'`,
        args: [task.label],
      });
      results.push({ label: task.label, ok: false, error: err.message });
    }
  }

  console.log('All scraping tasks complete.');
  await browser.close();

  if (process.env.DISCORD_WEBHOOK_URL) {
    const afterCount = labels.length > 0 ? await countForLabels() : 0;
    const netNew = afterCount - beforeCount;
    const touchedResult = await db.execute({
      sql: `SELECT COUNT(*) as n FROM raw_jobs WHERE scraped_at >= ? AND source IN (${inPlaceholders})`,
      args: [startedAt, ...labels],
    });
    const touched = Number(touchedResult.rows[0]?.n ?? 0);

    const engineLabel = engineFilter ? `${engineFilter} scrape` : 'Full scrape';
    const postingWord = touched === 1 ? 'posting' : 'postings';
    const okLabels = results.filter(r => r.ok).map(r => r.label);
    const failLabels = results.filter(r => !r.ok).map(r => r.label);
    const statusLines = [
      ...(okLabels.length > 0 ? [`OK     ${okLabels.join(', ')}`] : []),
      ...(failLabels.length > 0 ? [`FAILED ${failLabels.join(', ')}`] : []),
    ].join('\n');

    const runLink = githubRunUrl();
    const content = failLabels.length > 0
      ? `🚨 GovJobs scraper needs attention\nFailed sites: ${failLabels.join(', ')}.\nStart a conversation with Codex to investigate and fix the scraper.${runLink ? `\nRun: ${runLink}` : ''}`
      : `✅ ${engineLabel} complete — ${touched} job ${postingWord} touched (${netNew >= 0 ? '+' : ''}${netNew} new).${runLink ? `\nRun: ${runLink}` : ''}`;

    await notifyDiscord(content);
  }

  if (results.some(result => !result.ok)) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(async err => {
    console.error(err);
    await notifyDiscord(`🚨 GovJobs scraper stopped before completion.\nStart a conversation with Codex to investigate and fix the scraper.${githubRunUrl() ? `\nRun: ${githubRunUrl()}` : ''}`);
    process.exit(1);
  });
}
