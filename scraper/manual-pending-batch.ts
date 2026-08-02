import { chromium, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { initDb } from './db';
import { BASE_CONFIG } from './utils';
import { scrapeWorkday } from './engines/workday';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeTaleo } from './engines/taleo';
import { scrapeOracleCloud } from './engines/oracle';
import { scrapeNjoyn } from './engines/njoyn';
import { scrapeTechnomedia } from './engines/technomedia';
import { scrapeADP } from './engines/adp';
import { scrapeJobs2Web } from './engines/jobs2web';
import { scrapeHRSmart } from './engines/hrsmart';
import { scrapeICIMS } from './engines/icims';
import { scrapeUltiPro } from './engines/ultipro';
import { scrapeRSS } from './engines/rss';
import { scrapeSuccessFactors } from './engines/successfactors';
import { scrapeDayforce } from './engines/dayforce';
import { scrapeNorthStar } from './engines/northstar';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeNeogov } from './engines/neogov';
import { scrapePeopleAdmin } from './engines/peopleadmin';
import { scrapeLever } from './engines/lever';
import { scrapePrevue } from './engines/prevue';
import { scrapeSelkirk } from './engines/selkirk';
import { scrapeBrassRing, scrapeEdmontonPhenom, scrapeNipissing, scrapeNorthernCollege, scrapeStClairCollege, scrapeStLawrenceCollege, scrapeVaughanPL } from './engines/custom';

type SourceRunner = (db: Client, context: BrowserContext) => Promise<void>;

const BATCHES: Record<string, Record<string, SourceRunner>> = {
  'workday-1': {
    'McGill University': (db, context) => scrapeWorkday(
      db,
      context,
      'https://mcgill.wd3.myworkdayjobs.com/mcgill_careers',
      'McGill University',
    ),
    UBC: (db, context) => scrapeWorkday(
      db,
      context,
      'https://ubc.wd10.myworkdayjobs.com/ubcstaffjobs',
      'UBC',
    ),
    'Langara College': (db, context) => scrapeWorkday(
      db,
      context,
      'https://langara.wd10.myworkdayjobs.com/External_Employment_Opportunities',
      'Langara College',
    ),
    'Ontario Health': (db, context) => scrapeWorkday(
      db,
      context,
      'https://oh.wd3.myworkdayjobs.com/en-US/OH',
      'Ontario Health',
    ),
    'Ontario Clean Water Agency': (db, context) => scrapeWorkday(
      db,
      context,
      'https://ocwa.wd10.myworkdayjobs.com/en-US/External',
      'Ontario Clean Water Agency',
    ),
  },
  'mixed-2': {
    'Niagara College': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=38&org=NIAGARACOLLEGE',
      'Niagara College',
    ),
    'Georgian College': (db, context) => scrapeTaleo(
      db,
      context,
      'https://aa165.taleo.net/careersection/gc_external_career_site/jobsearch.ftl?lang=en&portal=8216760849',
      'Georgian College',
    ),
    'Fleming College': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://rsprd.flemingc.on.ca/psc/RSPRD/EMPLOYEE/RSMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant',
      'Fleming College',
    ),
    'University of Alberta': (db, context) => scrapeOracleCloud(
      db,
      context,
      'https://iaejup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/UOA-Careers/jobs',
      'University of Alberta',
    ),
    'University of the Fraser Valley': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://ufv.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56144&lang=1',
      'University of the Fraser Valley',
    ),
  },
  'mixed-3': {
    'Western University': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U',
      'Western University',
    ),
    'York University': (db, context) => scrapeTechnomedia(
      db,
      context,
      'https://jobs-ca.technomedia.com/yorkuniversity/',
      'York University',
    ),
    'ADP Workforce Now': (db, context) => scrapeADP(
      db,
      context,
      'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b3dc7fb4-546d-4c57-a2f4-0ab75313ff85&ccId=19000101_000001&lang=en_CA&selectedMenuKey=CurrentOpenings',
      'ADP Workforce Now',
    ),
  },
  'peoplesoft-4': {
    'Toronto Metropolitan University': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U',
      'Toronto Metropolitan University',
    ),
    'McMaster University': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab',
      'McMaster University',
    ),
    'City of Greater Sudbury': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U',
      'City of Greater Sudbury',
    ),
    'City of Calgary': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&SiteId=1',
      'City of Calgary',
    ),
    'Niagara Region': (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Siteid=1002',
      'Niagara Region',
    ),
  },
  'hrsmart-5': {
    'BC Public Service': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://bcpublicservice.hua.hrsmart.com/hr/ats/JobSearch/search',
      'BC Public Service',
    ),
    'Simcoe County': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://simcoe.hua.hrsmart.com/hr/ats/JobSearch/viewAll',
      'Simcoe County',
    ),
    'University of Victoria': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://uvic.mua.hrdepartment.com/hr/ats/JobSearch/viewAll',
      'University of Victoria',
    ),
  },
  'jobs2web-6': {
    'Government of Alberta': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://jobpostings.alberta.ca/go/All-Jobs-GoA/2617217/',
      'Government of Alberta',
    ),
    'Ontario Energy Board': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.oeb.ca/',
      'Ontario Energy Board',
    ),
    'City of Ottawa (Jobs2Web)': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://jobs-emplois.ottawa.ca/city-jobs/search/',
      'City of Ottawa (Jobs2Web)',
    ),
    'City of Saskatoon': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.saskatoon.ca/search/',
      'City of Saskatoon',
    ),
    'Regional Municipality of Wood Buffalo': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://jobs.rmwb.ca/search/',
      'Regional Municipality of Wood Buffalo',
    ),
  },
  'jobs2web-7': {
    'VIA TGF Inc.': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://carrieres-careers.altotrain.ca/search/',
      'VIA TGF Inc.',
    ),
    'VIA Rail Canada': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.viarail.ca/search/',
      'VIA Rail Canada',
    ),
  },
  'mixed-8': {
    'LCBO': (db, context) => scrapeWorkday(
      db,
      context,
      'https://lcbo.wd3.myworkdayjobs.com/LCBOCareerSite',
      'LCBO',
    ),
    OLG: (db, context) => scrapeWorkday(
      db,
      context,
      'https://olg.wd3.myworkdayjobs.com/Careers',
      'OLG',
    ),
    'Public Health Ontario': (db, context) => scrapeWorkday(
      db,
      context,
      'https://publichealthontario.wd10.myworkdayjobs.com/PHOCareerSite',
      'Public Health Ontario',
    ),
    WSIB: (db, context) => scrapeOracleCloud(
      db,
      context,
      'https://wsib-iaepup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?mode=location',
      'WSIB',
    ),
    'Ontario Health atHome': (db, context) => scrapeICIMS(
      db,
      context,
      'https://healthcareathomejobs-en.icims.com/jobs/search?ss=1',
      'Ontario Health atHome',
    ),
  },
  'jobs2web-9': {
    IESO: (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.ieso.ca/search/',
      'IESO',
    ),
  },
  'engine-ready-10': {
    'McGill University': (db, context) => scrapeWorkday(
      db,
      context,
      'https://mcgill.wd3.myworkdayjobs.com/mcgill_careers',
      'McGill University',
    ),
    'Hydro Ottawa': (db, context) => scrapeWorkday(
      db,
      context,
      'https://hydroottawa.wd3.myworkdayjobs.com/en-US/hydro_ottawa_careersite',
      'Hydro Ottawa',
    ),
    'Hydro One': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://jobs.hydroone.com/search',
      'Hydro One',
    ),
    'Toronto Hydro': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://jobs.torontohydro.com/search/',
      'Toronto Hydro',
    ),
  },
  'engine-ready-11': {
    'Oakville Public Library': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?brid=ohm5hsyepJ9o6VvSF7WaYg&cws=43&org=TOWNOFOA',
      'Oakville Public Library',
    ),
    'London Public Library': (db, context) => scrapeUltiPro(
      db,
      context,
      'https://recruiting.ultipro.ca/LON5100LPLY/JobBoard/5a8bb7ac-1f7b-4aae-9db8-37f3df5b9940/?o=postedDateDesc&q=',
      'London Public Library',
    ),
    'University of Northern British Columbia': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://unbc.njoyn.com/CL/xweb/Xweb.asp?categoryid=1385&clid=125926&page=joblisting',
      'University of Northern British Columbia',
    ),
    'Thompson Rivers University': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://tru.hua.hrsmart.com/hr/ats/JobSearch/viewAll',
      'Thompson Rivers University',
    ),
    'Royal Roads University': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://royalroads.mua.hrdepartment.com/hr/ats/JobSearch/viewAll',
      'Royal Roads University',
    ),
  },
  'london-library-retry': {
    'London Public Library': (db, context) => scrapeUltiPro(
      db,
      context,
      'https://recruiting.ultipro.ca/LON5100LPLY/JobBoard/5a8bb7ac-1f7b-4aae-9db8-37f3df5b9940/?o=postedDateDesc&q=',
      'London Public Library',
    ),
  },
  'conestoga-rss': {
    'Conestoga College': (db, context) => scrapeRSS(
      db,
      context,
      'https://employment.conestogac.on.ca/RSSFeed.aspx?category=support',
      'Conestoga College',
      'conestoga',
    ),
  },
  'manitoba-ready': {
    'City of Kawartha Lakes': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=37&org=CITYOFKA',
      'City of Kawartha Lakes',
    ),
    'Manitoba Public Insurance': (db, context) => scrapeICIMS(
      db,
      context,
      'https://careers-mpi.icims.com/jobs/search?ss=1',
      'Manitoba Public Insurance',
    ),
  },
  'saint-boniface-dayforce': {
    'Université de Saint-Boniface': (db, context) => scrapeDayforce(
      db,
      context,
      'https://jobs.dayforcehcm.com/fr-CA/usb/CANDIDATEPORTAL',
      'Université de Saint-Boniface',
    ),
  },
  'winnipeg-northstar': {
    'University of Winnipeg': (db, context) => scrapeNorthStar(
      db,
      context,
      'https://www.northstarats.com/University-of-Winnipeg',
      'University of Winnipeg',
    ),
  },
  'njoyn-ontario': {
    'Lambton College': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://lambtoncollege.njoyn.com/CL4/xweb/Xweb.asp?CLID=72351&page=joblisting',
      'Lambton College',
    ),
    'Sault College': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://saultcollege.njoyn.com/cl3/xweb/Xweb.asp?CLID=56877&page=joblisting',
      'Sault College',
    ),
  },
  'ontario-municipal-ready': {
    'Municipality of Chatham-Kent': (db, context) => scrapeUltiPro(
      db,
      context,
      'https://recruiting.ultipro.ca/COR5101COMCH/JobBoard/99e5515b-9ffb-4d3b-a84e-95f953a5c0f2/?q=&o=postedDateDesc',
      'Municipality of Chatham-Kent',
    ),
    'City of Woodstock': (db, context) => scrapeJazzHR(
      db,
      context,
      'https://cityofwoodstock.applytojob.com/apply/',
      'City of Woodstock',
      'woodstock',
    ),
  },
  'ontario-ready-2': {
    'Collège Boréal': (db, context) => scrapeWorkday(
      db,
      context,
      'https://collegeboreal.wd3.myworkdayjobs.com/en-US/CB',
      'Collège Boréal',
    ),
    'County of Brant': (db, context) => scrapeJazzHR(
      db,
      context,
      'https://countyofbrant.applytojob.com/apply/',
      'County of Brant',
      'brant',
    ),
  },
  'ontario-ready-3': {
    'City of Quinte West': (db, context) => scrapeDayforce(
      db,
      context,
      'https://canr58.dayforcehcm.com/CandidatePortal/en-CA/quintewest',
      'City of Quinte West',
    ),
  },
  'york-region-ready': {
    'Town of East Gwillimbury': (db, context) => scrapeADP(
      db,
      context,
      'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?ccId=19000101_000001&cid=f5060f66-1f92-430e-b67b-c5e16cd9318f&lang=en_CA&type=JS',
      'Town of East Gwillimbury',
    ),
    'Town of Bradford West Gwillimbury': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://bwg.njoyn.com/CL/xweb/Xweb.asp?CLID=124493&page=joblisting',
      'Town of Bradford West Gwillimbury',
    ),
    'BWG Public Library': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://bwg.njoyn.com/CL/xweb/Xweb.asp?CLID=126454&page=joblisting',
      'BWG Public Library',
    ),
  },
  'niagara-ready-2': {
    'City of Port Colborne': (db, context) => scrapeWorkday(
      db,
      context,
      'https://portcolborne.wd10.myworkdayjobs.com/en-US/CPC',
      'City of Port Colborne',
    ),
  },
  'ontario-ready-4': {
    'County of Lambton': (db, context) => scrapeUltiPro(
      db,
      context,
      'https://recruiting.ultipro.ca/COR5004CLMB/JobBoard/6b014206-1003-40c3-98a0-b2340f1971da/?o=postedDateDesc&q=',
      'County of Lambton',
    ),
    'Grey County': (db, context) => scrapeDayforce(
      db,
      context,
      'https://jobs.dayforcehcm.com/en-CA/greycounty/CANDIDATEPORTAL',
      'Grey County',
    ),
  },
  'ontario-ready-5': {
    'County of Essex': (db, context) => scrapeJazzHR(
      db,
      context,
      'https://app.jazz.co/widgets/basic/create/countyofessex',
      'County of Essex',
      'essex',
    ),
  },
  'ontario-ready-6': {
    'Algoma University': (db, context) => scrapeADP(
      db,
      context,
      'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=325cbdb8-d490-4480-ae8d-d332911ec006&ccId=19000101_000001&lang=en_CA',
      'Algoma University',
    ),
  },
  'bc-ready-1': {
    'Richmond Public Library': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?cws=44&org=TRQS8M',
      'Richmond Public Library',
    ),
    'City of Abbotsford': (db, context) => scrapeNjoyn(
      db,
      context,
      'https://abbotsford.njoyn.com/CL3/xweb/Xweb.asp?CLID=55227&page=joblisting',
      'City of Abbotsford',
    ),
  },
  'platform-ready-1': {
    'Wilfrid Laurier University': (db, context) => scrapeSuccessFactors(
      db,
      context,
      'https://careers.wlu.ca/go/All-jobs/504947/',
      'Wilfrid Laurier University',
      'https://careers.wlu.ca',
    ),
    'Edmonton Public Library': (db, context) => scrapeTaleo(
      db,
      context,
      'https://edmonton.taleo.net/careersection/epl-ext/jobsearch.ftl',
      'Edmonton Public Library',
    ),
    'Kwantlen Polytechnic University': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?cws=37&org=JT63GS',
      'Kwantlen Polytechnic University',
    ),
    'Shared Health Manitoba': (db, context) => scrapeSuccessFactors(
      db,
      context,
      'https://careers.wrha.mb.ca/search/?createNewAlert=false&q=&locationsearch=&optionsFacetsDD_facility=&optionsFacetsDD_customfield2=',
      'Shared Health Manitoba',
      'https://careers.wrha.mb.ca',
    ),
  },
  'platform-ready-2': {
    'Simon Fraser University': (db, context) => scrapeTaleo(
      db,
      context,
      'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=SIMOFRAS&cws=37',
      'Simon Fraser University',
    ),
    'Town of Newmarket': (db, context) => scrapeHRSmart(
      db,
      context,
      'https://newmarket.hua.hrsmart.com/hr/ats/JobSearch/viewAll',
      'Town of Newmarket',
    ),
    'County of Wellington': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.wellington.ca/search/',
      'County of Wellington',
    ),
  },
  'peoplesoft-ready-1': {
    TransLink: (db, context) => scrapePeopleSoft(
      db,
      context,
      'https://careersconnect.translink.bc.ca/psc/EXT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U&FOCUS=Applicant&SiteId=2',
      'TransLink',
    ),
  },
  'neogov-1': {
    'Cambrian College': (db, context) => scrapeNeogov(
      db,
      context,
      'https://gjobs.neogov.ca/careers/cambriancollege',
      'Cambrian College',
    ),
  },
  'peopleadmin-1': {
    'Dalhousie University': (db, context) => scrapePeopleAdmin(
      db,
      context,
      'https://dal.peopleadmin.ca/postings/search',
      'Dalhousie University',
    ),
    'University of Lethbridge': (db, context) => scrapePeopleAdmin(
      db,
      context,
      'https://uleth.peopleadmin.ca/postings/search',
      'University of Lethbridge',
    ),
    'Confederation College': (db, context) => scrapePeopleAdmin(
      db,
      context,
      'https://confederationcollege.peopleadmin.ca/postings/search',
      'Confederation College',
    ),
    'British Columbia Institute of Technology': (db, context) => scrapePeopleAdmin(
      db,
      context,
      'https://careers.bcit.ca/postings/search',
      'British Columbia Institute of Technology',
    ),
    'Douglas College': (db, context) => scrapePeopleAdmin(
      db,
      context,
      'https://www.douglascollegecareers.ca/postings/search',
      'Douglas College',
    ),
  },
  'pdf-1': {
    'Vaughan Public Library': (db, context) => scrapeVaughanPL(db, context),
    'St. Clair College': (db, context) => scrapeStClairCollege(db, context),
  },
  'stlawrence-1': {
    'St. Lawrence College': (db, context) => scrapeStLawrenceCollege(db, context),
  },
  'brassring-1': {
    'Halifax Regional Municipality': (db, context) => scrapeBrassRing(db, context),
  },
  'custom-colleges-1': {
    'Nipissing University': (db, context) => scrapeNipissing(db, context),
    'Northern College': (db, context) => scrapeNorthernCollege(db, context),
  },
  'phenom-1': {
    'City of Edmonton': (db, context) => scrapeEdmontonPhenom(db, context),
  },
  'lever-1': {
    'Okanagan College': (db, context) => scrapeLever(db, context, 'okanagan', 'Okanagan College'),
  },
  'prevue-1': {
    'College of the Rockies': (db, context) => scrapePrevue(db, context, 'cotr', 886, 'College of the Rockies'),
  },
  'selkirk-1': {
    'Selkirk College': (db, context) => scrapeSelkirk(db, context, 'Selkirk College'),
  },
  'manual-ready-5': {
    'Essex County': (db, context) => scrapeJazzHR(
      db,
      context,
      'https://app.jazz.co/widgets/basic/create/countyofessex',
      'Essex County',
      'essex',
    ),
    'Grey County': (db, context) => scrapeDayforce(
      db,
      context,
      'https://jobs.dayforcehcm.com/en-CA/greycounty/CANDIDATEPORTAL',
      'Grey County',
    ),
    'City of Quinte West': (db, context) => scrapeDayforce(
      db,
      context,
      'https://canr58.dayforcehcm.com/CandidatePortal/en-CA/quintewest',
      'City of Quinte West',
    ),
    'County of Wellington': (db, context) => scrapeJobs2Web(
      db,
      context,
      'https://careers.wellington.ca/search/',
      'County of Wellington',
    ),
    'Loyalist College': (db, context) => scrapeNeogov(
      db,
      context,
      'https://gjobs.neogov.ca/careers/loyalistcollege',
      'Loyalist College',
    ),
  },
};

async function main() {
  const batchName = process.env.PENDING_BATCH;
  if (!batchName || !BATCHES[batchName]) {
    throw new Error(`PENDING_BATCH must be one of: ${Object.keys(BATCHES).join(', ')}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(BASE_CONFIG);
  const db = await initDb();
  let failed = false;

  try {
    for (const [source, run] of Object.entries(BATCHES[batchName])) {
      console.log(`\n=== ${source} ===`);
      try {
        await run(db, context);
        const count = await db.execute({
          sql: 'SELECT COUNT(*) AS count FROM raw_jobs WHERE source = ?',
          args: [source],
        });
        const storedJobs = Number(count.rows[0]?.count ?? 0);
        if (storedJobs === 0) {
          throw new Error(`${source}: scraper completed but stored 0 jobs`);
        }
        console.log(`[${source}] Manual validation passed (${storedJobs} stored jobs).`);
      } catch (err: any) {
        failed = true;
        console.error(`[${source}] Manual validation failed: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (failed) process.exitCode = 1;
}

main().catch(err => { console.error(err); process.exit(1); });
