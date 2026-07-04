import { chromium } from 'playwright';
import { initDb, cleanupExpiredJobs } from './db';
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

async function main() {
  const runStartedAt = new Date().toISOString();
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  console.log(`Launching browser (headless: ${headless})...`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();

  console.log('--- STARTING TORONTO SCRAPE RUN ---');

  // 1. Core Toronto Agencies
  await scrapeSuccessFactors(db, context, 'https://career17.sapsf.com/career?company=TTCPRODUCTION&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH', 'TTC', 'https://career17.sapsf.com');
  await scrapeSuccessFactors(db, context, 'https://jobs.toronto.ca/jobsatcity/', 'City of Toronto', 'https://jobs.toronto.ca');
  await scrapeOracleCloud(db, context, 'https://ehtc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'Metrolinx');

  // 2. Libraries & Specialized
  // TPL (Njoyn) blocked by Radware bot protection — cannot scrape headlessly
  await scrapeWaterfront(db, context);
  await scrapeVaughanPL(db, context);

  // 3. Crown Corps & Conservation
  await scrapeJobs2Web(db, context, 'https://careers.cmhc-schl.gc.ca/search/', 'CMHC');
  await scrapeDayforce(db, context, 'https://jobs.dayforcehcm.com/trca/CANDIDATEPORTAL', 'TRCA');
  await scrapeDayforce(db, context, 'https://jobs.dayforcehcm.com/en-US/infrastructureontario/CANDIDATEPORTAL', 'Infrastructure Ontario');
  await scrapeCreateTO(db, context);
  await scrapeBarrie(db, context);
  await scrapeNjoyn(db, context, 'https://cityofoshawa.njoyn.com/CL/xweb/Xweb.asp?tbtoken=ZlxYRhoXCBtxZi4lLkAuJF4DNyQmCFQ9dmxEcFFZe0ggUikFE2BcKkocUDcTdmUELiUuQC4kXgkbVRdUT3NsF3U%3D&chk=ZVpaShM%3D&page=joblisting&CLID=126638', 'City of Oshawa');
  await scrapeWorkday(db, context, 'https://ajax.wd10.myworkdayjobs.com/Ajax', 'Town of Ajax');
  await scrapeUltiPro(db, context, 'https://recruiting.ultipro.ca/COR5003CALED/JobBoard/55e2803a-385b-47b1-b911-51dd7ed81d1e/?q=&o=postedDateDesc', 'Town of Caledon');
  await scrapeWorkday(db, context, 'https://niagarafalls.wd10.myworkdayjobs.com/CNF', 'City of Niagara Falls');
  await scrapeJobs2Web(db, context, 'https://careers.london.ca/search/', 'City of London');
  await scrapeJobs2Web(db, context, 'https://jobs.kitchener.ca/search/', 'City of Kitchener');
  await scrapeTalentPoolBuilder(db, context, 'https://cityofwaterloo.talentpoolbuilder.com/', 'City of Waterloo');
  await scrapeCambridge(db, context);
  await scrapeConservationHalton(db, context);
  await scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=09ed440f-e109-4f6f-ac03-075ea0a3a5e5&ccId=19000101_000001&lang=en_CA', 'Municipality of Clarington');

  // 4. Federal
  await scrapeGC(db, context);

  // 5. Province of Ontario
  await scrapeOPS(db, context);

  // 6. GTHA Regions & Cities
  await scrapeDurhamRegion(db, context);
  await scrapeWorkday(db, context, 'https://whitby.wd10.myworkdayjobs.com/EXT', 'Town of Whitby');
  await scrapeHRSmart(db, context, 'https://york.hua.hrsmart.com/hr/ats/JobSearch/viewAll', 'York Region');
  await scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=04bf51f8-d2dd-4641-ba92-183522f6e8b3&ccId=19000101_000001&type=MP&lang=en_CA', 'City of Markham');
  await scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b1fead40-7a8c-4b14-87a0-dc031bab192d&ccId=19000101_000001&lang=en_CA', 'Town of Aurora');
  await scrapeJobs2Web(db, context, 'https://jobs.richmondhill.ca/search/', 'City of Richmond Hill');
  await scrapeICIMS(db, context, 'https://careers-peelregion.icims.com/jobs/search?ss=1', 'Peel Region');
  await scrapeSuccessFactors(db, context, 'https://careers.halton.ca/search/', 'Halton Region', 'https://careers.halton.ca');
  await scrapeWorkday(db, context, 'https://wd10.myworkdaysite.com/recruiting/cityofburlington/cob', 'City of Burlington');
  await scrapeTaleo(db, context, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TOWNOFOA&cws=43', 'Town of Oakville');
  await scrapeWorkday(db, context, 'https://milton.wd10.myworkdayjobs.com/TownOfMilton', 'Town of Milton');
  await scrapeSuccessFactors(db, context, 'https://jobs.mississauga.ca/search/', 'Mississauga', 'https://jobs.mississauga.ca');
  await scrapeWorkday(db, context, 'https://brampton.wd3.myworkdayjobs.com/Brampton_External_Careers', 'City of Brampton');
  await scrapeNjoyn(db, context, 'https://vaughan.njoyn.com/cl4/xweb/xweb.asp?tbtoken=ZlpRRhcXCB8GYwF0NyVccitLdGZfcVVMf0gjV1oMExdbW0UZXUcbBhdxcBEbURRTSXUuX30%3D&chk=ZVpaShM%3D&CLID=52423&page=joblisting', 'City of Vaughan');
  await scrapeTaleo(db, context, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=COSC&cws=37', 'City of St. Catharines');
  await scrapeAvanti(db, context, 'https://welland.myavanti.ca/careers', 'City of Welland');
  await scrapeBrantford(db, context);
  await scrapeBambooHR(db, context, 'https://cityofhamilton.bamboohr.com/careers', 'City of Hamilton');
  await scrapePeterborough(db, context);

  // 7. Southwestern Ontario
  await scrapeJazzHR(db, context, 'https://cityofwindsor.applytojob.com/apply/', 'City of Windsor', 'windsor');
  await scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=9ba4d624-1cab-4482-861f-900704c3df0d&ccId=19000101_000001&lang=en_CA', 'City of Sarnia');
  await scrapeDayforce(db, context, 'https://jobs.dayforcehcm.com/en-CA/stthomas/CANDIDATEPORTAL', 'City of St. Thomas');
  await scrapeJobs2Web(db, context, 'https://careers.regionofwaterloo.ca/RoW/search/', 'Region of Waterloo');

  // 8. Northern Ontario
  await scrapeJibe(db, context, 'https://careers.thunderbay.ca/careers-home/jobs', 'City of Thunder Bay', 'thunderbay');

  // 9. Eastern Ontario
  await scrapeSuccessFactors(db, context, 'https://career47.sapsf.com/careers/cityofottawa/search', 'City of Ottawa', 'https://career47.sapsf.com');
  await scrapeRSS(db, context, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston');
  await scrapeJazzHR(db, context, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville');
  await scrapeWorkland(db, context, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall');
  await scrapeSmithsFalls(db, context);

  console.log('\nCleaning up expired jobs...');
  await cleanupExpiredJobs(db, runStartedAt);

  console.log('All scraping tasks complete.');
  await browser.close();
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}
