import { chromium, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';

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
  scrapeDurhamRegion,
  scrapeBrantford,
  scrapePeterborough,
  scrapeSmithsFalls,
  scrapeVaughanPL,
} from './engines/custom';
import { scrapeRSS } from './engines/rss';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeWorkland } from './engines/workland';
import { scrapeJibe } from './engines/jibe';

export { scrapeSuccessFactors, scrapeWorkday, scrapeWaterfront, scrapeConservationHalton, scrapeADP };
export { urlId, scrapeRawAndStage } from './utils';

interface ScrapeTask {
  engine: string;
  run: (db: Client, context: BrowserContext) => Promise<void>;
}

// Grouped by engine (not just region) so CI can run each engine as its own
// job — a bug in one engine's pagination/DOM handling (see workday.ts) then
// shows up as one red job instead of being buried in one aggregate log.
const TASKS: ScrapeTask[] = [
  // 1. Core Toronto Agencies
  { engine: 'successfactors', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://career17.sapsf.com/career?company=TTCPRODUCTION&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH', 'TTC', 'https://career17.sapsf.com') },
  { engine: 'successfactors', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://jobs.toronto.ca/jobsatcity/search/', 'City of Toronto', 'https://jobs.toronto.ca') },
  { engine: 'oracle', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://ehtc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'Metrolinx') },

  // 2. Libraries & Specialized
  // TPL (Njoyn) blocked by Radware bot protection — cannot scrape headlessly
  { engine: 'custom', run: (db, ctx) => scrapeWaterfront(db, ctx) },
  { engine: 'custom', run: (db, ctx) => scrapeVaughanPL(db, ctx) },

  // 3. Crown Corps & Conservation
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.cmhc-schl.gc.ca/search/', 'CMHC') },
  { engine: 'dayforce', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/trca/CANDIDATEPORTAL', 'TRCA') },
  { engine: 'dayforce', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-US/infrastructureontario/CANDIDATEPORTAL', 'Infrastructure Ontario') },
  { engine: 'bamboohr', run: (db, ctx) => scrapeCreateTO(db, ctx) },
  { engine: 'custom', run: (db, ctx) => scrapeBarrie(db, ctx) },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://cityofoshawa.njoyn.com/CL/xweb/Xweb.asp?page=joblisting&CLID=126638', 'City of Oshawa') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://ajax.wd10.myworkdayjobs.com/Ajax', 'Town of Ajax') },
  { engine: 'ultipro', run: (db, ctx) => scrapeUltiPro(db, ctx, 'https://recruiting.ultipro.ca/COR5003CALED/JobBoard/55e2803a-385b-47b1-b911-51dd7ed81d1e/?q=&o=postedDateDesc', 'Town of Caledon') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://niagarafalls.wd10.myworkdayjobs.com/CNF', 'City of Niagara Falls') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.london.ca/search/', 'City of London') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.kitchener.ca/search/', 'City of Kitchener') },
  { engine: 'talentpoolbuilder', run: (db, ctx) => scrapeTalentPoolBuilder(db, ctx, 'https://cityofwaterloo.talentpoolbuilder.com/', 'City of Waterloo') },
  { engine: 'custom', run: (db, ctx) => scrapeCambridge(db, ctx) },
  { engine: 'custom', run: (db, ctx) => scrapeConservationHalton(db, ctx) },
  { engine: 'adp', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=09ed440f-e109-4f6f-ac03-075ea0a3a5e5&ccId=19000101_000001&lang=en_CA', 'Municipality of Clarington') },

  // 4. Federal
  { engine: 'custom', run: (db, ctx) => scrapeGC(db, ctx) },

  // 5. Province of Ontario
  { engine: 'custom', run: (db, ctx) => scrapeOPS(db, ctx) },

  // 6. GTHA Regions & Cities
  { engine: 'custom', run: (db, ctx) => scrapeDurhamRegion(db, ctx) },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://whitby.wd10.myworkdayjobs.com/EXT', 'Town of Whitby') },
  { engine: 'hrsmart', run: (db, ctx) => scrapeHRSmart(db, ctx, 'https://york.hua.hrsmart.com/hr/ats/JobSearch/viewAll', 'York Region') },
  { engine: 'adp', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=04bf51f8-d2dd-4641-ba92-183522f6e8b3&ccId=19000101_000001&type=MP&lang=en_CA', 'City of Markham') },
  { engine: 'adp', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b1fead40-7a8c-4b14-87a0-dc031bab192d&ccId=19000101_000001&lang=en_CA', 'Town of Aurora') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.richmondhill.ca/search/', 'City of Richmond Hill') },
  { engine: 'icims', run: (db, ctx) => scrapeICIMS(db, ctx, 'https://careers-peelregion.icims.com/jobs/search?ss=1', 'Peel Region') },
  { engine: 'successfactors', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://careers.halton.ca/search/', 'Halton Region', 'https://careers.halton.ca') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://wd10.myworkdaysite.com/recruiting/cityofburlington/cob', 'City of Burlington') },
  { engine: 'taleo', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TOWNOFOA&cws=43', 'Town of Oakville') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://milton.wd10.myworkdayjobs.com/TownOfMilton', 'Town of Milton') },
  { engine: 'successfactors', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://jobs.mississauga.ca/search/', 'Mississauga', 'https://jobs.mississauga.ca') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.brampton.ca/search/', 'City of Brampton') },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://cityofvaughan.njoyn.com/cl4/xweb/Xweb.asp?page=joblisting&CLID=74035', 'City of Vaughan') },
  { engine: 'taleo', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=COSC&cws=37', 'City of St. Catharines') },
  { engine: 'avanti', run: (db, ctx) => scrapeAvanti(db, ctx, 'https://welland.myavanti.ca/careers', 'City of Welland') },
  { engine: 'custom', run: (db, ctx) => scrapeBrantford(db, ctx) },
  { engine: 'bamboohr', run: (db, ctx) => scrapeBambooHR(db, ctx, 'https://cityofhamilton.bamboohr.com/careers', 'City of Hamilton') },
  { engine: 'custom', run: (db, ctx) => scrapePeterborough(db, ctx) },

  // 7. Southwestern Ontario
  { engine: 'jazzhr', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://cityofwindsor.applytojob.com/apply/', 'City of Windsor', 'windsor') },
  { engine: 'adp', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=9ba4d624-1cab-4482-861f-900704c3df0d&ccId=19000101_000001&lang=en_CA', 'City of Sarnia') },
  { engine: 'dayforce', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-CA/stthomas/CANDIDATEPORTAL', 'City of St. Thomas') },
  { engine: 'dayforce', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-US/orangeville/CANDIDATEPORTAL', 'Town of Orangeville') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.regionofwaterloo.ca/RoW/search/', 'Region of Waterloo') },

  // 8. Northern Ontario
  { engine: 'jibe', run: (db, ctx) => scrapeJibe(db, ctx, 'https://careers.thunderbay.ca/careers-home/jobs', 'City of Thunder Bay', 'thunderbay') },

  // 9. Eastern Ontario
  { engine: 'successfactors', run: (db, ctx) => scrapeSuccessFactors(db, ctx, 'https://career47.sapsf.com/careers/cityofottawa/search', 'City of Ottawa', 'https://career47.sapsf.com') },
  { engine: 'rss', run: (db, ctx) => scrapeRSS(db, ctx, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston') },
  { engine: 'jazzhr', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville') },
  { engine: 'workland', run: (db, ctx) => scrapeWorkland(db, ctx, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall') },
  { engine: 'custom', run: (db, ctx) => scrapeSmithsFalls(db, ctx) },

  // 10. Higher Education (Colleges & Universities)
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.utoronto.ca/search/', 'University of Toronto') },
  { engine: 'taleo', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=SENECOLL4&cws=42', 'Seneca College') },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://centennial.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56827', 'Centennial College') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uwaterloo.wd3.myworkdayjobs.com/uw_careers', 'University of Waterloo') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://brocku.wd3.myworkdayjobs.com/brocku_careers', 'Brock University') },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://sheridan.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=55117', 'Sheridan College') },
  { engine: 'jobs2web', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.uoguelph.ca/search/', 'University of Guelph') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site', 'University of Ottawa') },
  { engine: 'workday', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://algonquincollege.wd3.myworkdayjobs.com/CareerOpportunities', 'Algonquin College') },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://carleton.njoyn.com/CL2/xweb/xweb.asp?CLID=53443&page=joblisting&lang=1', 'Carleton University') },
  { engine: 'taleo', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=OCADU&cws=37', 'OCAD University') },
  { engine: 'njoyn', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://queensu.njoyn.com/cl4/xweb/xweb.asp?page=joblisting&CLID=74827', "Queen's University") },

  // 11. Health & Other Agencies
  { engine: 'oracle', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'EFHC') },
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
  for (const task of tasks) {
    await task.run(db, context);
  }

  console.log('All scraping tasks complete.');
  await browser.close();

  if (process.env.DISCORD_WEBHOOK_URL) {
    const result = await db.execute({
      sql: `SELECT COUNT(*) as n FROM raw_jobs WHERE scraped_at >= ?`,
      args: [startedAt],
    });
    const jobCount = result.rows[0]?.n ?? 0;
    const engineLabel = engineFilter ? `${engineFilter} scrape` : 'Full scrape';
    const companyWord = tasks.length === 1 ? 'company' : 'companies';
    const postingWord = jobCount === 1 ? 'posting' : 'postings';
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'GovJobs',
        content: `${engineLabel} done — checked ${tasks.length} ${companyWord}, touched ${jobCount} job ${postingWord}.`,
      }),
    });
  }
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
