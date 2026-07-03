import { chromium } from 'playwright';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapeSuccessFactors } from './engines/successfactors';
import { scrapeJobs2Web } from './engines/jobs2web';
import { scrapeDayforce } from './engines/dayforce';
import { scrapeRSS } from './engines/rss';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeWorkland } from './engines/workland';
import { scrapeJibe } from './engines/jibe';
import { scrapeADP } from './engines/adp';
import { scrapePeterborough, scrapeSmithsFalls } from './engines/custom';

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();

  // Eastern Ontario (batch 1)
  await scrapePeterborough(db, context);
  await scrapeSuccessFactors(db, context, 'https://career47.sapsf.com/careers/cityofottawa/search', 'City of Ottawa', 'https://career47.sapsf.com');
  await scrapeRSS(db, context, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston');
  await scrapeJazzHR(db, context, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville');
  await scrapeWorkland(db, context, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall');
  await scrapeSmithsFalls(db, context);

  // Southwestern & Northern Ontario (batch 2)
  await scrapeJazzHR(db, context, 'https://cityofwindsor.applytojob.com/apply/', 'City of Windsor', 'windsor');
  await scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=9ba4d624-1cab-4482-861f-900704c3df0d&ccId=19000101_000001&lang=en_CA', 'City of Sarnia');
  await scrapeDayforce(db, context, 'https://jobs.dayforcehcm.com/en-CA/stthomas/CANDIDATEPORTAL', 'City of St. Thomas');
  await scrapeJobs2Web(db, context, 'https://careers.regionofwaterloo.ca/RoW/search/', 'Region of Waterloo');
  await scrapeJibe(db, context, 'https://careers.thunderbay.ca/careers-home/jobs', 'City of Thunder Bay', 'thunderbay');

  await browser.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
