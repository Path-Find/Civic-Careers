import { chromium, BrowserContext } from 'playwright';
import { Client } from '@libsql/client';
import { cleanupExpiredJobsForSource, deactivateExpiredJobs, initDb } from './db';
import { BASE_CONFIG, githubRunUrl, isExternalSourceBlock, notifyDiscord } from './utils';

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
  scrapeBrassRing,
  scrapeCollingwood,
  scrapeEdmontonPhenom,
  scrapeHaltonHills,
  scrapeNanaimo,
  scrapeNipissing,
  scrapeNorthBay,
  scrapeNorthernCollege,
  scrapePickering,
  scrapeStClairCollege,
  scrapeStLawrenceCollege,
  scrapeVaughanPL,
} from './engines/custom';
import { scrapeRSS } from './engines/rss';
import { scrapeJazzHR } from './engines/jazzhhr';
import { scrapeWorkland } from './engines/workland';
import { scrapeJibe } from './engines/jibe';
import { scrapePeopleSoft } from './engines/peoplesoft';
import { scrapeCSOD } from './engines/csod';
import { scrapeTechnomedia } from './engines/technomedia';
import { scrapeNeogov } from './engines/neogov';
import { scrapePeopleAdmin } from './engines/peopleadmin';
import { scrapeLever } from './engines/lever';
import { scrapePrevue } from './engines/prevue';
import { scrapeSelkirk } from './engines/selkirk';
import { scrapeHiringPlatform } from './engines/hiringplatform';
import { scrapeApplyToEducation } from './engines/applytoeducation';
import { scrapeWorkable } from './engines/workable';
import { scrapeWorkzoom } from './engines/workzoom';
import { scrapeSapWebDynpro } from './engines/sap-webdynpro';
import { scrapeAlongside } from './engines/alongside';

export { scrapeSuccessFactors, scrapeWorkday, scrapeWaterfront, scrapeConservationHalton, scrapeADP };
export { urlId, scrapeRawAndStage } from './utils';

interface ScrapeTask {
  engine: string;
  label: string;
  allowEmptyCapture?: boolean;
  // CI matrix shard within the engine (default 1). Heavy sources get their own
  // shard so one engine's leg stays under its step timeout.
  shard?: number;
  // An engine may report a confirmed-empty capture (the portal's own "no jobs"
  // message), which is treated like allowEmptyCapture for that run only.
  run: (db: Client, context: BrowserContext) => Promise<void | { confirmedEmpty?: boolean }>;
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
  { engine: 'custom', label: 'Waterfront Toronto', allowEmptyCapture: true, run: (db, ctx) => scrapeWaterfront(db, ctx) },

  // 3. Crown Corps & Conservation
  { engine: 'jobs2web', label: 'CMHC', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.cmhc-schl.gc.ca/search/', 'CMHC') },
  { engine: 'jobs2web', label: 'VIA TGF Inc.', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://carrieres-careers.altotrain.ca/search/', 'VIA TGF Inc.') },
  { engine: 'jobs2web', label: 'VIA Rail Canada', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.viarail.ca/search/', 'VIA Rail Canada') },
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

  // 5. GTHA Regions & Cities
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
  { engine: 'jobs2web', label: 'City of Ottawa', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs-emplois.ottawa.ca/city-jobs/search/', 'City of Ottawa') },
  { engine: 'rss', label: 'City of Kingston', run: (db, ctx) => scrapeRSS(db, ctx, 'https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1', 'City of Kingston', 'kingston', 'https://careers.cityofkingston.ca/CL2/xweb/xweb.asp?CLID=61577&page=joblisting&lang=1') },
  { engine: 'jazzhr', label: 'City of Belleville', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://cityofbelleville.applytojob.com/apply/', 'City of Belleville', 'belleville') },
  { engine: 'workland', label: 'City of Cornwall', run: (db, ctx) => scrapeWorkland(db, ctx, 'https://atlas.workland.com/careers/cornwall/jobs?page=1', 'City of Cornwall', 'cornwall') },
  // The board explicitly publishes a no-openings row when the town has no jobs.
  { engine: 'custom', label: 'Town of Smiths Falls', allowEmptyCapture: true, run: (db, ctx) => scrapeSmithsFalls(db, ctx) },

  // 10. Higher Education (Colleges & Universities)
  { engine: 'jobs2web', label: 'University of Toronto', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.utoronto.ca/search/', 'University of Toronto') },
  { engine: 'taleo', label: 'Seneca College', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=SENECOLL4&cws=42', 'Seneca College') },
  { engine: 'njoyn', label: 'Centennial College', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://centennial.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56827', 'Centennial College') },
  { engine: 'workday', label: 'University of Waterloo', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uwaterloo.wd3.myworkdayjobs.com/uw_careers', 'University of Waterloo') },
  { engine: 'workday', label: 'Brock University', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://brocku.wd3.myworkdayjobs.com/brocku_careers', 'Brock University') },
  { engine: 'workday', label: 'UBC', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://ubc.wd10.myworkdayjobs.com/ubcstaffjobs', 'UBC') },
  { engine: 'njoyn', label: 'Sheridan College', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://sheridan.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=55117', 'Sheridan College') },
  { engine: 'jobs2web', label: 'University of Guelph', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.uoguelph.ca/search/', 'University of Guelph') },
  { engine: 'workday', label: 'University of Ottawa', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site', 'University of Ottawa') },
  { engine: 'workday', label: 'Algonquin College', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://algonquincollege.wd3.myworkdayjobs.com/CareerOpportunities', 'Algonquin College') },
  { engine: 'workday', label: 'Fanshawe College', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://fanshawec.wd3.myworkdayjobs.com/fanshawecareers', 'Fanshawe College') },
  { engine: 'njoyn', label: 'Carleton University', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://carleton.njoyn.com/CL2/xweb/xweb.asp?CLID=53443&page=joblisting&lang=1', 'Carleton University') },
  { engine: 'adp', label: 'Algoma University', allowEmptyCapture: true, run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=325cbdb8-d490-4480-ae8d-d332911ec006&ccId=19000101_000001&lang=en_CA', 'Algoma University') },
  { engine: 'taleo', label: 'OCAD University', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=OCADU&cws=37', 'OCAD University') },
  { engine: 'taleo', label: 'Humber College', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en', 'Humber College') },
  { engine: 'njoyn', label: "Queen's University", run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://queensu.njoyn.com/cl4/xweb/xweb.asp?page=joblisting&CLID=74827', "Queen's University") },
  { engine: 'csod', label: 'George Brown College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://georgebrown.csod.com/ux/ats/careersite/4/home?c=georgebrown&lang=en-US', 'George Brown College') },
  { engine: 'csod', label: 'Mohawk College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://talent-mohawkcollege.csod.com/ux/ats/careersite/2/home?c=talent-mohawkcollege', 'Mohawk College') },
  { engine: 'csod', label: 'Durham College', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://durham.csod.com/ux/ats/careersite/4/home?c=durham', 'Durham College') },
  { engine: 'csod', label: 'Ontario Tech University', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://ontariotechu.csod.com/ux/ats/careersite/4/home?c=ontariotechu', 'Ontario Tech University') },
  { engine: 'technomedia', label: 'York University', run: (db, ctx) => scrapeTechnomedia(db, ctx) },

  // 11. Health & Other Agencies
  { engine: 'oracle', label: 'University of Windsor', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'University of Windsor') },

  // 12. Western Canada (first sources outside Ontario/Quebec)
  { engine: 'jobs2web', label: 'City of Vancouver', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.vancouver.ca/search/', 'City of Vancouver') },
  { engine: 'dayforce', label: 'City of Brandon', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/brandon/COB', 'City of Brandon') },
  { engine: 'oracle', label: 'City of Red Deer', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://fa-eyjj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location', 'City of Red Deer') },

  // 13. Additional custom sources
  { engine: 'custom', label: 'Northumberland County', run: (db, ctx) => scrapeNorthumberland(db, ctx) },
  { engine: 'custom', label: 'Toronto District School Board', run: (db, ctx) => scrapeTDSB(db, ctx) },

  // 14. PeopleSoft Fluid (only tenants confirmed working so far — see issue #37)
  { engine: 'peoplesoft', label: 'City of Winnipeg', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://careers.winnipeg.ca/psc/cgext/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'City of Winnipeg') },

  // 15. Graduated from the Trial Action on 2026-10-19 (11-21 consecutive passes each).
  { engine: 'taleo', label: 'Niagara College', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=38&org=NIAGARACOLLEGE', 'Niagara College') },
  { engine: 'peoplesoft', label: 'Fleming College', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://rsprd.flemingc.on.ca/psc/RSPRD/EMPLOYEE/RSMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant', 'Fleming College') },
  { engine: 'peoplesoft', label: 'Western University', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'Western University') },
  { engine: 'peoplesoft', label: 'Toronto Metropolitan University', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U', 'Toronto Metropolitan University') },
  { engine: 'peoplesoft', label: 'McMaster University', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab', 'McMaster University') },
  { engine: 'peoplesoft', label: 'City of Calgary', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&SiteId=1', 'City of Calgary') },
  { engine: 'peoplesoft', label: 'Durham Region', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3', 'Durham Region') },
  { engine: 'peoplesoft', label: 'Niagara Region', run: (db, ctx) => scrapePeopleSoft(db, ctx, 'https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Siteid=1002', 'Niagara Region') },
  { engine: 'oracle', label: 'University of Alberta', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://iaejup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/UOA-Careers/jobs', 'University of Alberta') },
  { engine: 'csod', label: 'University of Saskatchewan', run: (db, ctx) => scrapeCSOD(db, ctx, 'https://usask.csod.com/ux/ats/careersite/14/home?c=usask', 'University of Saskatchewan') },
  { engine: 'neogov', label: 'Cambrian College', run: (db, ctx) => scrapeNeogov(db, ctx, 'https://gjobs.neogov.ca/careers/cambriancollege', 'Cambrian College') },
  { engine: 'njoyn', label: 'City of Abbotsford', run: (db, ctx) => scrapeNjoyn(db, ctx, 'https://abbotsford.njoyn.com/CL3/xweb/Xweb.asp?CLID=55227&page=joblisting', 'City of Abbotsford') },
  { engine: 'taleo', label: 'City of Burnaby', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=CITYBURNABY&cws=37', 'City of Burnaby') },
  { engine: 'taleo', label: 'City of Delta', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=XNZ8Q7&cws=37', 'City of Delta') },
  { engine: 'taleo', label: 'City of Richmond (BC)', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TRQS8M&cws=37', 'City of Richmond (BC)') },
  { engine: 'taleo', label: 'District of West Vancouver', run: (db, ctx) => scrapeTaleo(db, ctx, 'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=WESTVAN&cws=40', 'District of West Vancouver') },
  { engine: 'hrsmart', label: 'City of Kamloops', run: (db, ctx) => scrapeHRSmart(db, ctx, 'https://kamloops.hua.hrsmart.com/hr/ats/JobSearch/search', 'City of Kamloops') },
  { engine: 'peopleadmin', label: 'City of Kelowna', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://careeropportunities.kelowna.ca/postings/search', 'City of Kelowna') },
  { engine: 'hrsmart', label: 'Town of Newmarket', run: (db, ctx) => scrapeHRSmart(db, ctx, 'https://newmarket.hua.hrsmart.com/hr/ats/JobSearch/viewAll', 'Town of Newmarket') },
  { engine: 'jazzhr', label: 'County of Brant', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://countyofbrant.applytojob.com/apply/', 'County of Brant', 'brant') },
  { engine: 'ultipro', label: 'Lambton County', run: (db, ctx) => scrapeUltiPro(db, ctx, 'https://recruiting.ultipro.ca/COR5004CLMB/JobBoard/6b014206-1003-40c3-98a0-b2340f1971da/?o=postedDateDesc&q=', 'Lambton County') },
  { engine: 'jazzhr', label: 'Essex County', run: (db, ctx) => scrapeJazzHR(db, ctx, 'https://app.jazz.co/widgets/basic/create/countyofessex', 'Essex County', 'essex') },
  { engine: 'dayforce', label: 'Grey County', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://jobs.dayforcehcm.com/en-CA/greycounty/CANDIDATEPORTAL', 'Grey County') },
  { engine: 'dayforce', label: 'City of Quinte West', run: (db, ctx) => scrapeDayforce(db, ctx, 'https://canr58.dayforcehcm.com/CandidatePortal/en-CA/quintewest', 'City of Quinte West') },
  { engine: 'jobs2web', shard: 2, label: 'County of Wellington', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.wellington.ca/search/', 'County of Wellington') },
  { engine: 'neogov', label: 'Loyalist College', run: (db, ctx) => scrapeNeogov(db, ctx, 'https://gjobs.neogov.ca/careers/loyalistcollege', 'Loyalist College') },
  { engine: 'workday', shard: 2, label: 'LCBO', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://lcbo.wd3.myworkdayjobs.com/LCBOCareerSite', 'LCBO') },
  { engine: 'workday', label: 'OLG', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://olg.wd3.myworkdayjobs.com/Careers', 'OLG') },
  { engine: 'workday', label: 'Public Health Ontario', run: (db, ctx) => scrapeWorkday(db, ctx, 'https://publichealthontario.wd10.myworkdayjobs.com/PHOCareerSite', 'Public Health Ontario') },
  { engine: 'oracle', label: 'WSIB', run: (db, ctx) => scrapeOracleCloud(db, ctx, 'https://wsib-iaepup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?mode=location', 'WSIB') },
  { engine: 'icims', label: 'Ontario Health atHome', run: (db, ctx) => scrapeICIMS(db, ctx, 'https://healthcareathomejobs-en.icims.com/jobs/search?ss=1', 'Ontario Health atHome') },
  { engine: 'peopleadmin', label: 'Dalhousie University', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://dal.peopleadmin.ca/postings/search', 'Dalhousie University') },
  { engine: 'peopleadmin', label: 'University of Lethbridge', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://uleth.peopleadmin.ca/postings/search', 'University of Lethbridge') },
  { engine: 'peopleadmin', label: 'Confederation College', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://confederationcollege.peopleadmin.ca/postings/search', 'Confederation College') },
  { engine: 'peopleadmin', label: 'British Columbia Institute of Technology', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://careers.bcit.ca/postings/search', 'British Columbia Institute of Technology') },
  { engine: 'peopleadmin', label: 'Douglas College', run: (db, ctx) => scrapePeopleAdmin(db, ctx, 'https://www.douglascollegecareers.ca/postings/search', 'Douglas College') },
  { engine: 'custom', label: 'Vaughan Public Library', run: (db, ctx) => scrapeVaughanPL(db, ctx) },
  { engine: 'custom', label: 'St. Clair College', run: (db, ctx) => scrapeStClairCollege(db, ctx) },
  { engine: 'custom', label: 'St. Lawrence College', run: (db, ctx) => scrapeStLawrenceCollege(db, ctx) },
  { engine: 'custom', label: 'Halifax Regional Municipality', run: (db, ctx) => scrapeBrassRing(db, ctx) },
  { engine: 'custom', label: 'Nipissing University', run: (db, ctx) => scrapeNipissing(db, ctx) },
  { engine: 'custom', label: 'Northern College', run: (db, ctx) => scrapeNorthernCollege(db, ctx) },
  { engine: 'custom', label: 'City of Edmonton', run: (db, ctx) => scrapeEdmontonPhenom(db, ctx) },
  { engine: 'lever', label: 'Okanagan College', run: (db, ctx) => scrapeLever(db, ctx, 'okanagan', 'Okanagan College') },
  { engine: 'prevue', label: 'College of the Rockies', run: (db, ctx) => scrapePrevue(db, ctx, 'cotr', 886, 'College of the Rockies') },
  { engine: 'selkirk', label: 'Selkirk College', run: (db, ctx) => scrapeSelkirk(db, ctx, 'Selkirk College') },
  { engine: 'custom', label: 'City of Pickering', run: (db, ctx) => scrapePickering(db, ctx, 'City of Pickering') },
  { engine: 'custom', label: 'Pickering Public Library', run: (db, ctx) => scrapePickering(db, ctx, 'Pickering Public Library') },
  { engine: 'custom', label: 'Town of Halton Hills', run: (db, ctx) => scrapeHaltonHills(db, ctx) },
  { engine: 'custom', label: 'City of North Bay', run: (db, ctx) => scrapeNorthBay(db, ctx) },
  { engine: 'custom', label: 'Town of Collingwood', run: (db, ctx) => scrapeCollingwood(db, ctx) },
  { engine: 'custom', label: 'City of Nanaimo', run: (db, ctx) => scrapeNanaimo(db, ctx) },
  { engine: 'hiringplatform', label: 'City of Orillia', run: (db, ctx) => scrapeHiringPlatform(db, ctx, 'https://orillia.hiringplatform.ca/list/careers', 'City of Orillia') },
  { engine: 'adp', label: 'Credit Valley Conservation', run: (db, ctx) => scrapeADP(db, ctx, 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=628c6eb9-02b8-492d-b651-c4f1a4220344&ccId=9201548179279_3&lang=en_CA&selectedMenuKey=CurrentOpenings', 'Credit Valley Conservation') },
  { engine: 'applytoeducation', label: 'Toronto Catholic District School Board', run: (db, ctx) => scrapeApplyToEducation(db, ctx, 'https://www.tcdsb.org/page/jobs', 'Toronto Catholic District School Board') },
  { engine: 'workable', label: 'Norfolk County', run: (db, ctx) => scrapeWorkable(db, ctx, 'norfolk-county', 'Norfolk County') },
  { engine: 'avanti', label: 'Bruce County', run: (db, ctx) => scrapeAvanti(db, ctx, 'https://brucecounty.myavanti.ca/careers', 'Bruce County') },
  { engine: 'workzoom', label: 'County of Renfrew', run: (db, ctx) => scrapeWorkzoom(db, ctx, 'https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC', 'County of Renfrew') },
  { engine: 'sap-webdynpro', label: 'Manitoba Hydro', run: (db, ctx) => scrapeSapWebDynpro(db, ctx, 'https://careers.hydro.mb.ca/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search', 'Manitoba Hydro') },
  { engine: 'jobs2web', shard: 2, label: 'Government of Alberta', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobpostings.alberta.ca/go/All-Jobs-GoA/2617217/', 'Government of Alberta') },
  { engine: 'jobs2web', shard: 2, label: 'Canada Post', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.canadapost.ca/go/Canada-Post-All-Current-Opportunities/2319117/', 'Canada Post') },
  { engine: 'jobs2web', shard: 2, label: 'Bank of Canada', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.bankofcanada.ca/go/All-Job-Opportunities/2400817/', 'Bank of Canada') },
  { engine: 'jobs2web', shard: 2, label: 'ICBC', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.icbc.com/go/All-Current-Job-Opportunities/2681517/', 'ICBC') },
  { engine: 'jobs2web', shard: 2, label: 'SaskPower', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.saskpower.com/search/?q', 'SaskPower') },
  { engine: 'jobs2web', shard: 2, label: 'SaskTel', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.sasktel.com/go/Current-Opportunities/2684517/', 'SaskTel') },
  { engine: 'jobs2web', shard: 2, label: 'Government of Nova Scotia', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.novascotia.ca/go/All-Opportunities/502817/', 'Government of Nova Scotia') },
  { engine: 'jobs2web', shard: 2, label: 'Ontario Energy Board', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.oeb.ca/', 'Ontario Energy Board') },
  { engine: 'jobs2web', shard: 2, label: 'City of Saskatoon', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://careers.saskatoon.ca/search/', 'City of Saskatoon') },
  { engine: 'jobs2web', shard: 2, label: 'Regional Municipality of Wood Buffalo', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.rmwb.ca/search/', 'Regional Municipality of Wood Buffalo') },
  { engine: 'alongside', label: 'University of New Brunswick', run: (db, ctx) => scrapeAlongside(db, ctx, [
    'https://widget.alongside.com/widgets/jobs_widget/horizontal/235818/en',
    'https://widget.alongside.com/widgets/jobs_widget/horizontal/235818/en/internal',
    'https://widget.alongside.com/widgets/jobs_widget/horizontal/249707/en/internal',
  ], 'University of New Brunswick') },
  { engine: 'alongside', label: "Saint Mary's University", run: (db, ctx) => scrapeAlongside(db, ctx, [
    'https://widget.alongside.com/widgets/jobs_widget/horizontal/247668/en',
    'https://widget.alongside.com/widgets/jobs_widget/horizontal/201305/en',
  ], "Saint Mary's University") },
  { engine: 'successfactors', shard: 2, label: 'Shared Health Manitoba', run: (db, ctx) => scrapeSuccessFactors(
    db,
    ctx,
    'https://careers.wrha.mb.ca/search/?createNewAlert=false&q=&locationsearch=&optionsFacetsDD_facility=&optionsFacetsDD_customfield2=',
    'Shared Health Manitoba',
    'https://careers.wrha.mb.ca',
  ) },
  { engine: 'ultipro', label: 'London Public Library', run: (db, ctx) => scrapeUltiPro(
    db,
    ctx,
    'https://recruiting.ultipro.ca/LON5100LPLY/JobBoard/5a8bb7ac-1f7b-4aae-9db8-37f3df5b9940/?o=postedDateDesc&q=',
    'London Public Library',
  ) },
  { engine: 'taleo', label: 'Richmond Public Library', run: (db, ctx) => scrapeTaleo(
    db,
    ctx,
    'https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?cws=44&org=TRQS8M',
    'Richmond Public Library',
  ) },
  { engine: 'taleo', label: 'Edmonton Public Library', run: (db, ctx) => scrapeTaleo(
    db,
    ctx,
    'https://edmonton.taleo.net/careersection/epl-ext/jobsearch.ftl',
    'Edmonton Public Library',
  ) },
  { engine: 'peoplesoft', label: 'TransLink', run: (db, ctx) => scrapePeopleSoft(
    db,
    ctx,
    'https://careersconnect.translink.bc.ca/psc/EXT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U&FOCUS=Applicant&SiteId=2',
    'TransLink',
  ) },
  { engine: 'jobs2web', shard: 2, label: 'BC Transit', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.bctransit.com/search/', 'BC Transit') },
  { engine: 'jobs2web', shard: 2, label: 'Toronto Hydro', run: (db, ctx) => scrapeJobs2Web(db, ctx, 'https://jobs.torontohydro.com/search/', 'Toronto Hydro') },
];

async function main() {
  const headless = !process.env.DISPLAY && process.env.CI !== 'false';
  const engineFilter = process.env.SCRAPE_ENGINE;
  const sourceFilter = process.env.SCRAPE_SOURCE;
  const shardFilter = process.env.SCRAPE_SHARD ? Number(process.env.SCRAPE_SHARD) : undefined;
  // OPS is intentionally excluded from scheduled TASKS because its board
  // requires a human CAPTCHA step. Keep the documented manual command as an
  // explicit opt-in without making OPS part of the normal production scrape.
  const manualOpsRequested = process.env.OPS_MANUAL_CAPTCHA === 'true'
    && engineFilter === 'custom'
    && sourceFilter === 'Province of Ontario';
  const tasks: ScrapeTask[] = manualOpsRequested
    ? [{ engine: 'custom', label: 'Province of Ontario', run: (db, ctx) => scrapeOPS(db, ctx) }]
    : TASKS.filter(task =>
      (!engineFilter || task.engine === engineFilter)
      && (!sourceFilter || task.label === sourceFilter)
      && (shardFilter === undefined || (task.shard ?? 1) === shardFilter)
    );

  if ((engineFilter || sourceFilter) && tasks.length === 0) {
    console.error(`No tasks found for${engineFilter ? ` engine "${engineFilter}"` : ''}${engineFilter && sourceFilter ? ' and' : ''}${sourceFilter ? ` source "${sourceFilter}"` : ''}`);
    process.exit(1);
  }

  console.log(`Launching browser (headless: ${headless})...`);
  const browser = await chromium.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const db = await initDb();

  console.log(`--- STARTING SCRAPE RUN${engineFilter ? ` (engine: ${engineFilter})` : ''}${sourceFilter ? ` (source: ${sourceFilter})` : ''} — ${tasks.length} source(s) ---`);

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

  const results: { label: string; status: 'success' | 'blocked' | 'failed'; error?: string }[] = [];
  for (const task of tasks) {
    const taskContext = await browser.newContext(BASE_CONFIG);
    try {
      const taskStartedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const outcome = await task.run(db, taskContext);
      const allowEmpty = task.allowEmptyCapture || Boolean(outcome && outcome.confirmedEmpty);
      await cleanupExpiredJobsForSource(db, task.label, taskStartedAt, allowEmpty);
      await db.execute({
        sql: `INSERT INTO source_scrape_status (source, last_successful_scrape_at, last_status)
              VALUES (?, CURRENT_TIMESTAMP, 'success')
              ON CONFLICT(source) DO UPDATE SET
                last_successful_scrape_at = CURRENT_TIMESTAMP,
                last_status = 'success'`,
        args: [task.label],
      });
      results.push({ label: task.label, status: 'success' });
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const externallyBlocked = isExternalSourceBlock(err);
      console.error(`[${task.label}] ${externallyBlocked ? 'Source blocked externally' : 'Scrape failed'}:`, errorMessage);
      await db.execute({
        sql: `INSERT INTO source_scrape_status (source, last_successful_scrape_at, last_status)
              VALUES (?, NULL, ?)
              ON CONFLICT(source) DO UPDATE SET last_status = excluded.last_status`,
        args: [task.label, externallyBlocked ? 'blocked' : 'failed'],
      }).catch(statusErr => console.error(`[${task.label}] Failed to record status:`, statusErr));
      results.push({ label: task.label, status: externallyBlocked ? 'blocked' : 'failed', error: errorMessage });
    } finally {
      await taskContext.close();
    }
  }

  console.log('All scraping tasks complete.');
  const expiredCount = await deactivateExpiredJobs(db);
  if (expiredCount > 0) console.log(`[Expiry] Deactivated ${expiredCount} job(s) past their closing date.`);
  await browser.close();

  // Matrix jobs run one engine per GitHub Actions job. Sending here creates a
  // noisy burst of near-identical Discord messages; the parser remains the
  // single workflow-level completion notification.
  if (process.env.DISCORD_WEBHOOK_URL && !process.env.GITHUB_ACTIONS) {
    const afterCount = labels.length > 0 ? await countForLabels() : 0;
    const netNew = afterCount - beforeCount;
    const touchedResult = await db.execute({
      sql: `SELECT COUNT(*) as n FROM raw_jobs WHERE scraped_at >= ? AND source IN (${inPlaceholders})`,
      args: [startedAt, ...labels],
    });
    const touched = Number(touchedResult.rows[0]?.n ?? 0);

    const engineLabel = engineFilter ? `${engineFilter} scrape` : 'Full scrape';
    const postingWord = touched === 1 ? 'posting' : 'postings';
    const blockedLabels = results.filter(r => r.status === 'blocked').map(r => r.label);
    const failLabels = results.filter(r => r.status === 'failed').map(r => r.label);

    const runLink = githubRunUrl();
    const content = failLabels.length > 0
      ? `🚨 GovJobs scraper needs attention\nFailed sites: ${failLabels.join(', ')}.\nStart a conversation with Codex to investigate and fix the scraper.${runLink ? `\nRun: ${runLink}` : ''}`
      : blockedLabels.length > 0
      ? `⚠️ ${engineLabel} completed with externally blocked sites: ${blockedLabels.join(', ')}. Existing jobs were preserved; source access needs review.${runLink ? `\nRun: ${runLink}` : ''}`
      : `✅ ${engineLabel} complete — ${touched} job ${postingWord} touched (${netNew >= 0 ? '+' : ''}${netNew} new).${runLink ? `\nRun: ${runLink}` : ''}`;

    await notifyDiscord(content);
  }

  if (results.some(result => result.status === 'failed')) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(async err => {
    console.error(err);
    await notifyDiscord(`🚨 GovJobs scraper stopped before completion.\nStart a conversation with Codex to investigate and fix the scraper.${githubRunUrl() ? `\nRun: ${githubRunUrl()}` : ''}`);
    process.exit(1);
  });
}
