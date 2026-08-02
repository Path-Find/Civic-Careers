import { chromium, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeTaleo } from './engines/taleo';
import { scrapeOracleCloud } from './engines/oracle';
import { scrapeCSOD } from './engines/csod';
import { scrapeNeogov } from './engines/neogov';
import { scrapeNjoyn } from './engines/njoyn';
import { scrapeHRSmart } from './engines/hrsmart';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeUltiPro } from './engines/ultipro';
import { scrapeDayforce } from './engines/dayforce';
import { scrapeJobs2Web } from './engines/jobs2web';
import { scrapeICIMS } from './engines/icims';
import { scrapePeopleAdmin } from './engines/peopleadmin';
import { scrapeLever } from './engines/lever';
import { scrapePrevue } from './engines/prevue';
import { scrapeSelkirk } from './engines/selkirk';
import { scrapeHiringPlatform } from './engines/hiringplatform';
import { scrapeADP } from './engines/adp';
import { scrapeApplyToEducation } from './engines/applytoeducation';
import { scrapeWorkable } from './engines/workable';
import { scrapeAvanti } from './engines/avanti';
import { scrapeVipCloud } from './engines/vipcloud';
import { scrapeWorkzoom } from './engines/workzoom';
import { scrapeSapWebDynpro } from './engines/sap-webdynpro';
import { scrapeBrassRing, scrapeEdmontonPhenom, scrapeHaltonHills, scrapeNipissing, scrapeNorthernCollege, scrapePickering, scrapeStClairCollege, scrapeStLawrenceCollege, scrapeVaughanPL } from './engines/custom';

const REQUIRED_SUCCESSFUL_RUNS = 3;
type SourceRunner = (db: Client, context: BrowserContext) => Promise<void>;

const SOURCES = {
  'Niagara College': (db: Client, context: BrowserContext) =>
    scrapeTaleo(db, context, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=38&org=NIAGARACOLLEGE', 'Niagara College'),
  'Fleming College': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://rsprd.flemingc.on.ca/psc/RSPRD/EMPLOYEE/RSMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant', 'Fleming College'),
  'Western University': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'Western University'),
  'Toronto Metropolitan University': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'Toronto Metropolitan University'),
  'McMaster University': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab', 'McMaster University'),
  'City of Calgary': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&SiteId=1', 'City of Calgary'),
  'Durham Region': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3', 'Durham Region'),
  'Niagara Region': (db: Client, context: BrowserContext) =>
    scrapePeopleSoft(db, context, 'https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Siteid=1002', 'Niagara Region'),
  'University of Alberta': (db: Client, context: BrowserContext) =>
    scrapeOracleCloud(db, context, 'https://iaejup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/UOA-Careers/jobs', 'University of Alberta'),
  'University of Saskatchewan': (db: Client, context: BrowserContext) =>
    scrapeCSOD(db, context, 'https://usask.csod.com/ux/ats/careersite/14/home?c=usask', 'University of Saskatchewan'),
  'Cambrian College': (db: Client, context: BrowserContext) =>
    scrapeNeogov(db, context, 'https://gjobs.neogov.ca/careers/cambriancollege', 'Cambrian College'),
  'City of Abbotsford': (db: Client, context: BrowserContext) =>
    scrapeNjoyn(db, context, 'https://abbotsford.njoyn.com/CL3/xweb/Xweb.asp?CLID=55227&page=joblisting', 'City of Abbotsford'),
  'Town of Newmarket': (db: Client, context: BrowserContext) =>
    scrapeHRSmart(db, context, 'https://newmarket.hua.hrsmart.com/hr/ats/JobSearch/viewAll', 'Town of Newmarket'),
  'County of Brant': (db: Client, context: BrowserContext) =>
    scrapeJazzHR(db, context, 'https://countyofbrant.applytojob.com/apply/', 'County of Brant', 'brant'),
  'Lambton County': (db: Client, context: BrowserContext) =>
    scrapeUltiPro(db, context, 'https://recruiting.ultipro.ca/COR5004CLMB/JobBoard/6b014206-1003-40c3-98a0-b2340f1971da/?o=postedDateDesc&q=', 'Lambton County'),
  'Essex County': (db: Client, context: BrowserContext) =>
    scrapeJazzHR(db, context, 'https://app.jazz.co/widgets/basic/create/countyofessex', 'Essex County', 'essex'),
  'Grey County': (db: Client, context: BrowserContext) =>
    scrapeDayforce(db, context, 'https://jobs.dayforcehcm.com/en-CA/greycounty/CANDIDATEPORTAL', 'Grey County'),
  'City of Quinte West': (db: Client, context: BrowserContext) =>
    scrapeDayforce(db, context, 'https://canr58.dayforcehcm.com/CandidatePortal/en-CA/quintewest', 'City of Quinte West'),
  'County of Wellington': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://careers.wellington.ca/search/', 'County of Wellington'),
  'Loyalist College': (db: Client, context: BrowserContext) =>
    scrapeNeogov(db, context, 'https://gjobs.neogov.ca/careers/loyalistcollege', 'Loyalist College'),
  LCBO: (db: Client, context: BrowserContext) =>
    scrapeWorkday(db, context, 'https://lcbo.wd3.myworkdayjobs.com/LCBOCareerSite', 'LCBO'),
  OLG: (db: Client, context: BrowserContext) =>
    scrapeWorkday(db, context, 'https://olg.wd3.myworkdayjobs.com/Careers', 'OLG'),
  'Public Health Ontario': (db: Client, context: BrowserContext) =>
    scrapeWorkday(db, context, 'https://publichealthontario.wd10.myworkdayjobs.com/PHOCareerSite', 'Public Health Ontario'),
  WSIB: (db: Client, context: BrowserContext) =>
    scrapeOracleCloud(db, context, 'https://wsib-iaepup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?mode=location', 'WSIB'),
  'Ontario Health atHome': (db: Client, context: BrowserContext) =>
    scrapeICIMS(db, context, 'https://healthcareathomejobs-en.icims.com/jobs/search?ss=1', 'Ontario Health atHome'),
  'Dalhousie University': (db: Client, context: BrowserContext) =>
    scrapePeopleAdmin(db, context, 'https://dal.peopleadmin.ca/postings/search', 'Dalhousie University'),
  'University of Lethbridge': (db: Client, context: BrowserContext) =>
    scrapePeopleAdmin(db, context, 'https://uleth.peopleadmin.ca/postings/search', 'University of Lethbridge'),
  'Confederation College': (db: Client, context: BrowserContext) =>
    scrapePeopleAdmin(db, context, 'https://confederationcollege.peopleadmin.ca/postings/search', 'Confederation College'),
  'British Columbia Institute of Technology': (db: Client, context: BrowserContext) =>
    scrapePeopleAdmin(db, context, 'https://careers.bcit.ca/postings/search', 'British Columbia Institute of Technology'),
  'Douglas College': (db: Client, context: BrowserContext) =>
    scrapePeopleAdmin(db, context, 'https://www.douglascollegecareers.ca/postings/search', 'Douglas College'),
  'Vaughan Public Library': (db: Client, context: BrowserContext) =>
    scrapeVaughanPL(db, context),
  'St. Clair College': (db: Client, context: BrowserContext) =>
    scrapeStClairCollege(db, context),
  'St. Lawrence College': (db: Client, context: BrowserContext) =>
    scrapeStLawrenceCollege(db, context),
  'Halifax Regional Municipality': (db: Client, context: BrowserContext) =>
    scrapeBrassRing(db, context),
  'Nipissing University': (db: Client, context: BrowserContext) =>
    scrapeNipissing(db, context),
  'Northern College': (db: Client, context: BrowserContext) =>
    scrapeNorthernCollege(db, context),
  'City of Edmonton': (db: Client, context: BrowserContext) =>
    scrapeEdmontonPhenom(db, context),
  'Okanagan College': (db: Client, context: BrowserContext) =>
    scrapeLever(db, context, 'okanagan', 'Okanagan College'),
  'College of the Rockies': (db: Client, context: BrowserContext) =>
    scrapePrevue(db, context, 'cotr', 886, 'College of the Rockies'),
  'Selkirk College': (db: Client, context: BrowserContext) =>
    scrapeSelkirk(db, context, 'Selkirk College'),
  'City of Pickering': (db: Client, context: BrowserContext) =>
    scrapePickering(db, context, 'City of Pickering'),
  'Pickering Public Library': (db: Client, context: BrowserContext) =>
    scrapePickering(db, context, 'Pickering Public Library'),
  'Town of Halton Hills': (db: Client, context: BrowserContext) =>
    scrapeHaltonHills(db, context),
  'City of Orillia': (db: Client, context: BrowserContext) =>
    scrapeHiringPlatform(db, context, 'https://orillia.hiringplatform.ca/list/careers', 'City of Orillia'),
  'Credit Valley Conservation': (db: Client, context: BrowserContext) =>
    scrapeADP(db, context, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=628c6eb9-02b8-492d-b651-c4f1a4220344&ccId=9201548179279_3&lang=en_CA&selectedMenuKey=CurrentOpenings', 'Credit Valley Conservation'),
  'Toronto Catholic District School Board': (db: Client, context: BrowserContext) =>
    scrapeApplyToEducation(db, context, 'https://www.tcdsb.org/page/jobs', 'Toronto Catholic District School Board'),
  'Norfolk County': (db: Client, context: BrowserContext) =>
    scrapeWorkable(db, context, 'norfolk-county', 'Norfolk County'),
  'Bruce County': (db: Client, context: BrowserContext) =>
    scrapeAvanti(db, context, 'https://brucecounty.myavanti.ca/careers', 'Bruce County'),
  'Town of Whitchurch-Stouffville': (db: Client, context: BrowserContext) =>
    scrapeVipCloud(db, context, 'https://townofws-careers.vipcloud.ca/default', 'Town of Whitchurch-Stouffville'),
  'Town of Georgina': (db: Client, context: BrowserContext) =>
    scrapeVipCloud(db, context, 'https://georgina-careers.vipcloud.ca/default', 'Town of Georgina'),
  'County of Renfrew': (db: Client, context: BrowserContext) =>
    scrapeWorkzoom(db, context, 'https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC', 'County of Renfrew'),
  'Manitoba Hydro': (db: Client, context: BrowserContext) =>
    scrapeSapWebDynpro(db, context, 'https://careers.hydro.mb.ca/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search', 'Manitoba Hydro'),
  'Government of Alberta': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://jobpostings.alberta.ca/go/All-Jobs-GoA/2617217/', 'Government of Alberta'),
  'Ontario Energy Board': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://careers.oeb.ca/', 'Ontario Energy Board'),
  'City of Ottawa (Jobs2Web)': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://jobs-emplois.ottawa.ca/city-jobs/search/', 'City of Ottawa (Jobs2Web)'),
  'City of Saskatoon': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://careers.saskatoon.ca/search/', 'City of Saskatoon'),
  'Regional Municipality of Wood Buffalo': (db: Client, context: BrowserContext) =>
    scrapeJobs2Web(db, context, 'https://jobs.rmwb.ca/search/', 'Regional Municipality of Wood Buffalo'),
} satisfies Record<string, SourceRunner>;

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();
  let failed = false;

  async function runTrialSource(source: string, run: () => Promise<void>) {
    console.log(`\n=== ${source} ===`);
    try {
      await run();
      const count = await db.execute({
        sql: 'SELECT COUNT(*) AS count FROM raw_jobs WHERE source = ?',
        args: [source],
      });
      const jobCount = Number(count.rows[0]?.count ?? 0);
      await db.execute({
        sql: `INSERT INTO trial_source_results
                (source, consecutive_successes, last_status, last_job_count, last_run_at)
              VALUES (?, 1, 'success', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(source) DO UPDATE SET
                consecutive_successes = trial_source_results.consecutive_successes + 1,
                last_status = 'success',
                last_job_count = excluded.last_job_count,
                last_run_at = CURRENT_TIMESTAMP`,
        args: [source, jobCount],
      });
      console.log(`[${source}] Trial success (${jobCount} stored jobs).`);
    } catch (err: any) {
      failed = true;
      await db.execute({
        sql: `INSERT INTO trial_source_results
                (source, consecutive_successes, last_status, last_job_count, last_run_at)
              VALUES (?, 0, 'failed', 0, CURRENT_TIMESTAMP)
              ON CONFLICT(source) DO UPDATE SET
                consecutive_successes = 0,
                last_status = 'failed',
                last_job_count = 0,
                last_run_at = CURRENT_TIMESTAMP`,
        args: [source],
      });
      console.error(`[${source}] Trial failed: ${err.message}`);
    }
  }

  const sourceEntries = Object.entries(SOURCES);
  for (const [source, run] of sourceEntries) {
    await runTrialSource(source, () => run(db, context));
  }

  console.log('\n=== Trial pass counts ===');
  const results = await db.execute({
    sql: `SELECT source, consecutive_successes, last_status, last_job_count
          FROM trial_source_results
          WHERE source IN (${sourceEntries.map(() => '?').join(',')})
          ORDER BY source`,
    args: sourceEntries.map(([source]) => source),
  });
  for (const row of results.rows) {
    const status = row.last_status === 'success' && Number(row.consecutive_successes) >= REQUIRED_SUCCESSFUL_RUNS
      ? 'READY FOR PROMOTION'
      : 'KEEP IN TRIAL';
    console.log(`${row.source}: ${row.last_status}, ${row.consecutive_successes}/${REQUIRED_SUCCESSFUL_RUNS} consecutive passes, ${row.last_job_count} stored jobs — ${status}`);
  }

  await browser.close();
  if (failed) process.exitCode = 1;
}

main().catch(err => { console.error(err); process.exit(1); });
