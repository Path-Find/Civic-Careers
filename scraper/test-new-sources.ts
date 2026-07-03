import { chromium } from 'playwright';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapeSuccessFactors } from './engines/successfactors';
import { scrapeRSS } from './engines/rss';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeWorkland } from './engines/workland';
import { scrapePeterborough } from './engines/custom';

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();

  await scrapePeterborough(db, context);
  await scrapeSuccessFactors(db, context, 'https://career47.sapsf.com/careers/cityofottawa/search', 'City of Ottawa', 'https://career47.sapsf.com');
  await scrapeRSS(db, context, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston');
  await scrapeJazzHR(db, context, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville');
  await scrapeWorkland(db, context, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall');

  await browser.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
