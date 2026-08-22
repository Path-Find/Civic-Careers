import { chromium } from 'playwright';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeTaleo } from './engines/taleo';
import { scrapeOracleCloud } from './engines/oracle';
import { scrapeTechnomedia } from './engines/technomedia';
import { scrapeCSOD } from './engines/csod';

const source = process.env.MANUAL_SOURCE;

async function main() {
  if (!source) throw new Error('MANUAL_SOURCE is required');

  const browser = await chromium.launch({
    headless: !process.env.DISPLAY && process.env.CI !== 'false',
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();

  const runners: Record<string, () => Promise<void>> = {
    'Niagara College': () => scrapeTaleo(db, context, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=38&org=NIAGARACOLLEGE', source),
    'Fleming College': () => scrapePeopleSoft(db, context, 'https://rsprd.flemingc.on.ca/psc/RSPRD/EMPLOYEE/RSMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant', source),
    'Western University': () => scrapePeopleSoft(db, context, 'https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', source),
    'University of Alberta': () => scrapeOracleCloud(db, context, 'https://iaejup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/UOA-Careers/jobs', source),
    'York University': () => scrapeTechnomedia(db, context),
    'University of Saskatchewan': () => scrapeCSOD(db, context, 'https://usask.csod.com/ux/ats/careersite/14/home?c=usask', source),
  };

  if (!runners[source]) throw new Error(`Manual source is not configured: ${source}`);
  await runners[source]();
  console.log(`Manual test completed for ${source}. Trial pass counts were not changed.`);
  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
