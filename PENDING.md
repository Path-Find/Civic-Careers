# Pending Sources

Sources that have been identified but are not yet scraped, with notes on why.

## Needs a new engine

*(none currently)*

## Engine ready, URL needed

- Region of Waterloo (Jobs2Web) — https://careers.regionofwaterloo.ca/RoW/search/?createNewAlert=false&q=

  Note: base path `/RoW/search/` (Jobs2Web engine currently assumes `/search/` from origin in scraper/engines/jobs2web.ts — may need URL handling fix). Not yet in SOURCES.md active list.

- City of Guelph (iCIMS) — https://careers-guelph.icims.com/jobs/search?ss=1&hashed=-435770267&mobile=false&width=1440&height=500&bga=true&needsRedirect=false&jan1offset=-300&jun1offset=-240

  (iCIMS engine exists and used for Peel; similar structure. Not in current active list.)

- Toronto Metropolitan University (PeopleSoft Fluid) — https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  (Similar to Durham Region scraper; may adapt scrapeDurhamRegion or needs dedicated engine. Not yet implemented.)

- University of Toronto (Jobs2Web) — https://jobs.utoronto.ca/search/?q=&utm_source=CSSearchWidget&startrow=1

  (Jobs2Web engine ready; similar to other /search/ portals like CMHC, London, etc.)

- Seneca College (Taleo) — https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=SENECOLL4&cws=42

  (Taleo engine exists; similar to Oakville and St. Catharines.)

- George Brown College (Cornerstone/CSOD) — https://georgebrown.csod.com/ux/ats/careersite/4/home?c=georgebrown&lang=en-US

  (New portal type; no existing CSOD engine. May need dedicated scraper.)

- York University (Technomedia) — https://jobs-ca.technomedia.com/yorkuniversity/?_4x1F8B08000000000000FF7590BD6E83301446DFC66364F367183CD018AA6C91226664E036716A6CEBDAA8E5ED5B12C664BBC33947FAEE60ECE5E67ECE0EA33267750511710112BE61FD042B572B58555439E759D2B38231969679CFBABCA72C292869D1CDF794D2A7E5D18D10C229C22CFCA378B8BBC1BB10B5BD1E368EA053935DE601F07538D9C308232E3A02D6E396145FCA04200EA74D24A332067059F4F4BAC2F6CAA483376A7DAEDB97FDDF4236972379AF67D5EE6BAB63D79DE41B6CA7C2EF283C6A1B337C3C4EB4BCE465D356AD64755236F551E645CD69937EE432294AFA07C2520D1D75010000

  (New portal type; no existing Technomedia engine. May need dedicated scraper.)

- Humber College (Taleo) — https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en

  (Taleo engine exists; similar to Oakville and St. Catharines.)

- Centennial College (Njoyn) — https://centennial.njoyn.com/CL3/xweb/Xweb.asp?tbtoken=ZVtfSx5cDVBzZXR3NV0nFE9NcmMsaVVfdCRMIit6CnkrUEVqLEsechQDd0AYGhBUQXJjF3U%3D&chk=ZVpaShM%3D&page=joblisting&CLID=56827

  (Njoyn engine exists; similar to Vaughan and Oshawa.)

- Western University (PeopleSoft Fluid) — https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  (Similar to Durham Region scraper; may adapt scrapeDurhamRegion or needs dedicated engine. Not yet implemented.)

- Fanshawe College (Workday) — https://fanshawec.wd3.myworkdayjobs.com/fanshawecareers?_gl=1*8d8f9b*_gcl_au*MTU3MzMwMzUzNi4xNzgzMzU1MDk5*_ga*MTU4MjUwNDQ4MS4xNzgzMzU1MDk5*_ga_VVLLFESQ6F*czE3ODMzNTUwOTgkbzEkZzAkdDE3ODMzNTUwOTgkajYwJGwwJGg0NzI3NjQ4OTc.

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- University of Waterloo (Workday) — https://uwaterloo.wd3.myworkdayjobs.com/uw_careers

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- University of Guelph (Jobs2Web) — https://careers.uoguelph.ca/search/?createNewAlert=false&q=&optionsFacetsDD_facility=&optionsFacetsDD_dept=&optionsFacetsDD_customfield1=

  (Jobs2Web engine ready; similar to other /search/ portals like CMHC, London, etc.)

- University of Niagara Falls Canada — https://www.unfc.ca/about/careers

  (New portal type; no existing engine. May need dedicated scraper.)

- McMaster University (PeopleSoft) — https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab

  (Similar to Durham Region scraper; may adapt scrapeDurhamRegion or needs dedicated engine. Not yet implemented.)

- Brock University (Workday) — https://brocku.wd3.myworkdayjobs.com/brocku_careers

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- Mohawk College (Cornerstone/CSOD) — https://talent-mohawkcollege.csod.com/ux/ats/careersite/2/home?c=talent-mohawkcollege

  (New portal type; no existing CSOD engine. May need dedicated scraper.)

- St. Lawrence College — https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities

  (New portal type; no existing engine. May need dedicated scraper.)

- Government of Canada External (Taleo) — https://aa165.taleo.net/careersection/gc_external_career_site/jobsearch.ftl?lang=en&portal=8216760849

  (Taleo engine exists; similar to Seneca College and Humber College.)

- Lakehead University (Administrative Staff) — https://www.lakeheadu.ca/faculty-and-staff/departments/services/hr/employment-opportunities/administrative-staff

  (New portal type; no existing engine. May need dedicated scraper.)

- Queen's University (Njoyn) — https://queensu.njoyn.com/cl4/xweb/Xweb.asp?tbtoken=ZVhfShpRDVAFFwd5TSQgFU84BhVfaVVYA1RMWysEf3lfXjUeWkYYcxN2cUwYGhJWQXJjF3U%3D&chk=ZVpaShM%3D&page=joblisting&CLID=74827

  (Njoyn engine exists; similar to Vaughan and Oshawa.)

- EFHC (Oracle Cloud) — https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=location

  (Oracle Cloud engine exists; similar to Metrolinx.)

- University of Ottawa (Workday) — https://uottawa.wd3.myworkdayjobs.com/en-US/uOttawa_External_Career_Site

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- Algonquin College (Workday) — https://algonquincollege.wd3.myworkdayjobs.com/CareerOpportunities

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- Hamilton Public Library — https://www.hpl.ca/jobs

  (New portal type; no existing engine. May need dedicated scraper.)

- City of Ottawa (Jobs2Web) — https://jobs-emplois.ottawa.ca/city-jobs/search/?createNewAlert=false&q=&optionsFacetsDD_department=&optionsFacetsDD_facility=&optionsFacetsDD_customfield1=

  (Jobs2Web engine ready; similar to other /search/ portals like CMHC, London, etc.)

- Kingston Frontenac Public Library — https://www.kfpl.ca/your-library/work-and-volunteer/jobs-at-the-library

  (New portal type; no existing engine. May need dedicated scraper.)

- Town of Oakville (Taleo) — https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=49&org=TOWNOFOA

  (Taleo engine exists; similar to St. Catharines.)

- Brampton Library — https://www.bramptonlibrary.ca/careers

  (New portal type; no existing engine. May need dedicated scraper.)

- Cambrian College (NEOGOV) — https://gjobs.neogov.ca/careers/cambriancollege

  (New portal type; no existing NEOGOV engine. May need dedicated scraper.)

- Ville de Montréal — https://montreal.ca/en/jobs

  (Complex site; new portal type; no existing engine. May need dedicated scraper.)

- Ville de Montréal (SIM) — https://simenligne.montreal.ca/OA_HTML/RF.jsp?function_id=1011530&resp_id=23350&resp_appl_id=800&security_group_id=0&lang_code=FRC&params=78Yf57C4XSZOMFAg6ESOdTqziLKxVJYVFVWXogPijaRd67sVhNa2ic-20jG1-lSI

  (Complex Oracle EBS site; new portal type; no existing engine. May need dedicated scraper.)

- Durham College (Cornerstone/CSOD) — https://durham.csod.com/ux/ats/careersite/4/home?c=durham

  (New portal type; no existing CSOD engine. May need dedicated scraper.)

- Conestoga College (Workday) — https://employment.conestogac.on.ca/#current-opportunities

  (Workday engine exists; similar to other Workday portals like Brampton, Ajax, etc.)

- Carleton University (Njoyn) — https://carleton.njoyn.com/CL2/xweb/xweb.asp?CLID=53443&page=joblisting&lang=1

  (Njoyn engine exists; similar to Vaughan and Oshawa.)

- OCAD University (Taleo) — https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=OCADU&cws=37

  (Taleo engine exists; similar to St. Catharines.)

- Laurentian University (Administrative Staff) — https://laurentian.ca/about/careers/administrative-vacancies

  (New portal type; no existing engine. May need dedicated scraper.)

- Trent University — https://employment.trentu.ca/default

  (New portal type; no existing engine. May need dedicated scraper.)

- City of Greater Sudbury (PeopleSoft Fluid) — https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  (Similar to Durham Region scraper; may adapt scrapeDurhamRegion or needs dedicated engine. Not yet implemented.)

- Ontario Tech University (Cornerstone/CSOD) — https://ontariotechu.csod.com/ux/ats/careersite/4/home?c=ontariotechu

  (New portal type; no existing CSOD engine. May need dedicated scraper.)

- Sheridan College (Njoyn) — https://sheridan.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=55117&_gl=1*12zv320*_gcl_au*Nzg1MTc3NjM1LjE3ODMzNTY5NTk.&_ga=2.216424208.78145335.1783356959-1346696375.1783356959

  (Njoyn engine exists; similar to Centennial, Queen's, etc.)
