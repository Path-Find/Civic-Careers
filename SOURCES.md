# Sources

This document tracks **all active** job portals currently scraped by GovJobs, grouped by scraping engine (see `scraper/engines/`) rather than by region — that's the axis that actually matters for maintenance, since a bug in one engine (e.g. Workday pagination) affects every source in that group at once.

**Total active: 78** (see `scraper/scraper.ts`'s `TASKS` array for the live implementation — this file is generated from it and should be re-synced whenever sources are added/removed there). First sources outside Ontario/Quebec as of 2026-07-12 (City of Vancouver, City of Brandon MB, City of Red Deer AB).

See [PENDING.md](PENDING.md) for sources not yet active, with notes on status and blockers.

Toronto Public Library is currently disabled (blocked by Radware bot protection).

## ADP WorkforceNow (4)

- **City of Markham** — [Careers](https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=04bf51f8-d2dd-4641-ba92-183522f6e8b3&ccId=19000101_000001&type=MP&lang=en_CA)
- **City of Sarnia** — [Careers](https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=9ba4d624-1cab-4482-861f-900704c3df0d&ccId=19000101_000001&lang=en_CA)
- **Municipality of Clarington** — [Careers](https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=09ed440f-e109-4f6f-ac03-075ea0a3a5e5&ccId=19000101_000001&lang=en_CA)
- **Town of Aurora** — [Careers](https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b1fead40-7a8c-4b14-87a0-dc031bab192d&ccId=19000101_000001&lang=en_CA)

## Avanti (1)

- **City of Welland** — [Careers](https://welland.myavanti.ca/careers)

## BambooHR (2)

- **City of Hamilton** — [Careers](https://cityofhamilton.bamboohr.com/careers)
- **CreateTO** — [Careers](https://createto.ca/about-us/careers)

## CSOD / Cornerstone OnDemand (4)

- **Durham College** — [Home](https://durham.csod.com/ux/ats/careersite/4/home?c=durham)
- **George Brown College** — [Home](https://georgebrown.csod.com/ux/ats/careersite/4/home?c=georgebrown&lang=en-US)
- **Mohawk College** — [Home](https://talent-mohawkcollege.csod.com/ux/ats/careersite/2/home?c=talent-mohawkcollege)
- **Ontario Tech University** — [Home](https://ontariotechu.csod.com/ux/ats/careersite/4/home?c=ontariotechu)

## Custom (11)

- **City of Barrie** — [Search](https://careers.barrie.ca/search/)
- **City of Brantford** — [Current Opportunities](https://www.brantford.ca/your-government/careers/current-opportunities/)
- **City of Cambridge** — [Opportunities](https://www.cambridge.ca/mayor-city-council-government/careers-volunteering/current-opportunities/)
- **City of Peterborough** — [Careers](https://www.peterborough.ca/en/city-services/jobs.aspx)
- **Conservation Halton** — [Employment](https://www.conservationhalton.ca/about-us/employment/)
- **Government of Canada** — [GC Jobs](https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page2440?fromMenu=true&toggleLanguage=en) (covers Transport Canada, Statistics Canada, Infrastructure Canada, and many other federal departments)
- **Northumberland County** — [Careers](https://northumberland.ca/county-government/careers/)
- **Province of Ontario (OPS)** — [Ontario Public Service Jobs](https://www.gojobs.gov.on.ca/Search.aspx)
- **Toronto District School Board** — [Job Postings](https://www.tdsb.on.ca/jobpostings/list.html)
- **Town of Smiths Falls** — [Careers](https://www.smithsfalls.ca/)
- **Waterfront Toronto** — [Opportunities](https://www.waterfrontoronto.ca/opportunities/join-our-team)

## Dayforce HCM (5)

- **City of Brandon** — [Candidate Portal](https://jobs.dayforcehcm.com/brandon/COB)
- **City of St. Thomas** — [Candidate Portal](https://jobs.dayforcehcm.com/en-CA/stthomas/CANDIDATEPORTAL)
- **Infrastructure Ontario** — [Candidate Portal](https://jobs.dayforcehcm.com/en-US/infrastructureontario/CANDIDATEPORTAL)
- **TRCA** — [Candidate Portal](https://jobs.dayforcehcm.com/trca/CANDIDATEPORTAL)
- **Town of Orangeville** — [Candidate Portal](https://jobs.dayforcehcm.com/en-US/orangeville/CANDIDATEPORTAL)

## HRSmart (1)

- **York Region** — [Job Search](https://york.hua.hrsmart.com/hr/ats/JobSearch/viewAll)

## iCIMS (3)

- **City of Guelph** — [Careers](https://careers-guelph.icims.com/jobs/search?ss=1)
- **City of Victoria** — [Careers](https://careersen-victoria.icims.com/jobs/search?ss=1)
- **Peel Region** — [Careers](https://careers-peelregion.icims.com/jobs/search?ss=1)

## Jibe (1)

- **City of Thunder Bay** — [Careers](https://careers.thunderbay.ca/careers-home/jobs)

## Jobs2Web (9)

- **City of Brampton** — [Search](https://careers.brampton.ca/search/)
- **City of Kitchener** — [Search](https://jobs.kitchener.ca/search/)
- **City of London** — [Careers](https://careers.london.ca/search/)
- **City of Richmond Hill** — [Search](https://jobs.richmondhill.ca/search/)
- **City of Vancouver** — [Search](https://jobs.vancouver.ca/search/)
- **CMHC** — [Careers](https://careers.cmhc-schl.gc.ca/search/)
- **Region of Waterloo** — [Search](https://careers.regionofwaterloo.ca/RoW/search/)
- **University of Guelph** — [Careers](https://careers.uoguelph.ca/search/)
- **University of Toronto** — [Jobs](https://jobs.utoronto.ca/search/)

## JazzHR (2)

- **City of Belleville** — [Apply](https://cityofbelleville.applytojob.com/apply/)
- **City of Windsor** — [Apply](https://cityofwindsor.applytojob.com/apply/)

## Njoyn (6)

- **Carleton University** — [Job Listing](https://carleton.njoyn.com/CL2/xweb/xweb.asp?CLID=53443&page=joblisting&lang=1)
- **Centennial College** — [Job Listing](https://centennial.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56827)
- **City of Oshawa** — [Job Listing](https://cityofoshawa.njoyn.com/CL/xweb/Xweb.asp?page=joblisting&CLID=126638)
- **City of Vaughan** — [Job Listing](https://cityofvaughan.njoyn.com/cl4/xweb/Xweb.asp?page=joblisting&CLID=74035)
- **Queen's University** — [Job Listing](https://queensu.njoyn.com/cl4/xweb/xweb.asp?page=joblisting&CLID=74827)
- **Sheridan College** — [Job Listing](https://sheridan.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=55117)

## PeopleSoft Fluid (2)

- **City of Winnipeg** — [Careers](https://careers.winnipeg.ca/psc/cgext/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U) — click-and-walk pattern (no real per-job URLs on this platform).
- **Durham Region** — [Job Search](https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3) — click-and-walk pattern; includes Durham Region Transit postings.

## Oracle Cloud (3)

- **City of Red Deer** — [Careers](https://fa-eyjj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location)
- **EFHC** — [Careers](https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location)
- **Metrolinx** — [Careers](https://ehtc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs)

## RSS (1)

- **City of Kingston** — [Careers](https://careers.cityofkingston.ca/CL2/net/ResumeProcessing/RssFeedOutput.aspx?CLID=61577&lang=1)

## SuccessFactors (5)

- **City of Ottawa** — [Careers](https://career47.sapsf.com/careers/cityofottawa/search)
- **City of Toronto** — [Jobs at City](https://jobs.toronto.ca/jobsatcity/search/)
- **Halton Region** — [Search](https://careers.halton.ca/search/)
- **Mississauga** — [Search](https://jobs.mississauga.ca/search/)
- **TTC** — [Careers](https://career17.sapsf.com/career?company=TTCPRODUCTION&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH)

## Taleo (5)

- **City of St. Catharines** — [Careers](https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=COSC&cws=37)
- **Humber College** — [Careers](https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en)
- **OCAD University** — [Careers](https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=OCADU&cws=37)
- **Seneca College** — [Careers](https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=SENECOLL4&cws=42)
- **Town of Oakville** — [Careers](https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TOWNOFOA&cws=43)

## TalentPoolBuilder (1)

- **City of Waterloo** — [Job Board](https://cityofwaterloo.talentpoolbuilder.com/)

## UltiPro (1)

- **Town of Caledon** — [Job Board](https://recruiting.ultipro.ca/COR5003CALED/JobBoard/55e2803a-385b-47b1-b911-51dd7ed81d1e/?q=&o=postedDateDesc)

## Workday (10)

- **Algonquin College** — [Careers](https://algonquincollege.wd3.myworkdayjobs.com/CareerOpportunities)
- **Brock University** — [Careers](https://brocku.wd3.myworkdayjobs.com/brocku_careers)
- **City of Burlington** — [Careers](https://wd10.myworkdaysite.com/recruiting/cityofburlington/cob)
- **City of Niagara Falls** — [Careers](https://niagarafalls.wd10.myworkdayjobs.com/CNF)
- **Fanshawe College** — [Careers](https://fanshawec.wd3.myworkdayjobs.com/fanshawecareers)
- **Town of Ajax** — [Careers](https://ajax.wd10.myworkdayjobs.com/Ajax)
- **Town of Milton** — [Careers](https://milton.wd10.myworkdayjobs.com/TownOfMilton)
- **Town of Whitby** — [Careers](https://whitby.wd10.myworkdayjobs.com/EXT)
- **University of Ottawa** — [External Career Site](https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site)
- **University of Waterloo** — [Careers](https://uwaterloo.wd3.myworkdayjobs.com/uw_careers)

## Workland (1)

- **City of Cornwall** — [Careers](https://atlas.workland.com/careers/cornwall/jobs)

---

See [PENDING.md](PENDING.md) for sources not yet active, with notes on status and blockers.
