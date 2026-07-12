# Pending Sources

Sources that have been identified but are not yet scraped, with notes on why.

Last synced with scraper/scraper.ts: 2026-07-06  
Names-only backlog expanded: 2026-07-12 (no URL research yet). Manitoba added 2026-07-12 as the first out-of-province expansion — English-speaking, no French-parsing gap.

## Needs a new engine

*(none currently)*

## Engine ready, URL needed

- City of Guelph (iCIMS) — https://careers-guelph.icims.com/jobs/search?ss=1

  **Tried 2026-07-12, blocked.** URL loads an iCIMS-branded iframe wrapping the City of Guelph's own site chrome, but the actual job table doesn't render within the frame the standard selector finds — same "needs interaction/search submission" symptom as issues #32 (SuccessFactors) and #35 (Njoyn). Not a quick selector swap; needs the same investigation as those.

- Toronto Metropolitan University (PeopleSoft Fluid) — https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  **Investigated 2026-07-12.** Job list is virtualized/scroll-loaded (only 1 of ~77 job elements in the DOM at once) — needs real new-engine work (scroll-to-load handling), not a quick add. See also Western, McMaster, Greater Sudbury below — same PeopleSoft Fluid platform, likely one shared engine covers all four.

- York University (Technomedia) — https://jobs-ca.technomedia.com/yorkuniversity/

  (New portal type; no existing Technomedia engine. May need dedicated scraper.)

- Humber College (Taleo) — https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en

  **Tried 2026-07-12, blocked.** Page shows "Job Openings 1-12 of 12" and real facet counts, but this tenant's template renders zero `<a href>` job links anywhere on the page (checked broadly, not just the `h4 a[href*="viewRequisition"]` selector used for Oakville/St. Catharines) — likely a different/newer Taleo Career Section template using JS click handlers instead of hrefs. Needs deeper DOM investigation before the existing Taleo engine can be reused.

- Western University (PeopleSoft Fluid) — https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  (Same PeopleSoft Fluid platform as TMU above — bundle into one engine build.)

- University of Niagara Falls Canada — https://www.unfc.ca/about/careers

  (New portal type; no existing engine. May need dedicated scraper.)

- McMaster University (PeopleSoft) — https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab

  (Same PeopleSoft Fluid platform as TMU above — bundle into one engine build.)

- St. Lawrence College — https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities

  (New portal type; no existing engine. May need dedicated scraper.)

- Lakehead University (Administrative Staff) — https://www.lakeheadu.ca/faculty-and-staff/departments/services/hr/employment-opportunities/administrative-staff

  (New portal type; no existing engine. May need dedicated scraper.)

- Hamilton Public Library — https://www.hpl.ca/jobs

  (New portal type; no existing engine. May need dedicated scraper.)

- City of Ottawa (Jobs2Web) — https://jobs-emplois.ottawa.ca/city-jobs/search/

  **Tried 2026-07-12, partial.** Job discovery works fine (found 74 real, correctly-titled postings). But detail pages render client-side and are slower than other Jobs2Web tenants — the standard 2s post-load buffer captures a "Loading..." placeholder instead of the actual job text, which would poison the AI parser with junk. Needs a longer/selector-based wait specifically for this tenant's detail pages before promoting. Note: production already has a separate "City of Ottawa" source via SuccessFactors (`career47.sapsf.com`, currently broken — see issue #32) — worth confirming these are genuinely two different systems (e.g. corporate vs. union postings) and not a portal migration, so we don't end up double-listing the same jobs under one source name once both work.

- Kingston Frontenac Public Library — https://www.kfpl.ca/your-library/work-and-volunteer/jobs-at-the-library

  (New portal type; no existing engine. May need dedicated scraper.)

- Brampton Library — https://www.bramptonlibrary.ca/careers

  (New portal type; no existing engine. May need dedicated scraper.)

- Cambrian College (NEOGOV) — https://gjobs.neogov.ca/careers/cambriancollege

  (New portal type; no existing NEOGOV engine. May need dedicated scraper.)

- Ville de Montréal — https://montreal.ca/en/jobs

  (Complex site; new portal type; no existing engine. May need dedicated scraper.)

- Ville de Montréal (SIM) — https://simenligne.montreal.ca/OA_HTML/RF.jsp?function_id=1011530&resp_id=23350&resp_appl_id=800&security_group_id=0&lang_code=FRC&params=78Yf57C4XSZOMFAg6ESOdTqziLKxVJYVFVWXogPijaRd67sVhNa2ic-20jG1-lSI

  (Complex Oracle EBS site; new portal type; no existing engine. May need dedicated scraper.)

- Conestoga College — https://employment.conestogac.on.ca/

  **Corrected 2026-07-12.** Not Workday — a previously-staged `conestoga.wd3.myworkdayjobs.com` guess redirected straight to Workday's maintenance page (invalid tenant, not a temp outage). The real site above is a bespoke page with no obvious ATS backend — needs a custom scraper (`scraper/engines/custom.ts` pattern), same as Peterborough/Barrie/Brantford.

- Laurentian University (Administrative Staff) — https://laurentian.ca/about/careers/administrative-vacancies

  (New portal type; no existing engine. May need dedicated scraper.)

- Trent University — https://employment.trentu.ca/default

  (New portal type; no existing engine. May need dedicated scraper.)

- City of Greater Sudbury (PeopleSoft Fluid) — https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U

  (Similar to Durham Region scraper; may adapt scrapeDurhamRegion or needs dedicated engine.)

## Ontario — names only (URL TBD)

High-value gaps not already active or listed above. Names only; portal/engine TBD when researched.

### Municipal & regional

- Niagara Region
- Simcoe County
- City of Pickering
- Town of Newmarket
- Town of Halton Hills
- City of Orillia
- City of North Bay
- City of Sault Ste. Marie
- City of Timmins
- City of Kawartha Lakes
- Municipality of Chatham-Kent
- City of Stratford
- City of Woodstock
- Norfolk County
- Haldimand County
- County of Brant
- County of Wellington
- Essex County
- Lambton County
- Grey County
- Bruce County
- Renfrew County
- City of Quinte West
- Town of Collingwood
- Town of Bradford West Gwillimbury
- Town of East Gwillimbury
- Town of Georgina
- Town of Whitchurch-Stouffville
- Township of King
- City of Port Colborne
- City of Thorold
- Town of Grimsby
- Town of Fort Erie

### Colleges

- Niagara College
- Georgian College
- Fleming College
- Loyalist College
- St. Clair College
- Lambton College
- Confederation College
- Sault College
- Canadore College
- Northern College
- Collège Boréal
- La Cité collégiale

### Universities

- Wilfrid Laurier University
- University of Windsor
- Nipissing University
- Algoma University
- Royal Military College of Canada

### Libraries

- Toronto Public Library (re-enable; previously disabled for bot protection)
- Ottawa Public Library
- Mississauga Library System
- London Public Library
- Markham Public Library
- Oakville Public Library
- Burlington Public Library
- Richmond Hill Public Library
- Kitchener Public Library
- Waterloo Public Library
- Guelph Public Library

### Conservation authorities

- Credit Valley Conservation
- Lake Simcoe Region Conservation Authority
- Grand River Conservation Authority
- Niagara Peninsula Conservation Authority
- Central Lake Ontario Conservation Authority

### Crown corps & provincial agencies

- Ontario Power Generation
- Hydro One
- LCBO
- OLG
- WSIB
- Ontario Health
- IESO
- Ontario Energy Board
- Ontario Clean Water Agency

### Transit (if separate from municipal portals)

- OC Transpo
- MiWay
- York Region Transit
- Durham Region Transit
- Brampton Transit
- Grand River Transit
- Hamilton Street Railway

### Police services (if separate from municipal portals)

- Toronto Police Service
- Ontario Provincial Police
- Peel Regional Police
- York Regional Police
- Ottawa Police Service

### School boards (major boards only)

- Toronto District School Board
- Toronto Catholic District School Board
- York Region District School Board
- Peel District School Board
- Halton District School Board
- Ottawa-Carleton District School Board
- Hamilton-Wentworth District School Board
- Thames Valley District School Board
- Waterloo Region District School Board
- Durham District School Board

## Quebec — names only (URL TBD)

Starter expansion set. **Ville de Montréal** and **Ville de Montréal (SIM)** already listed above with URLs.

### Provincial & large cities

- Gouvernement du Québec (fonction publique)
- Ville de Québec
- Ville de Laval
- Ville de Gatineau
- Ville de Longueuil
- Ville de Sherbrooke
- Ville de Lévis
- Ville de Trois-Rivières
- Ville de Saguenay
- Ville de Terrebonne
- Ville de Brossard
- Ville de Repentigny
- Ville de Saint-Jérôme
- Ville de Drummondville
- Ville de Granby
- Ville de Shawinigan
- Ville de Saint-Hyacinthe
- Ville de Blainville
- Ville de Dollard-des-Ormeaux
- Ville de Mirabel

### Crown / agencies / transit

- Hydro-Québec
- SAQ
- Loto-Québec
- STM (Société de transport de Montréal)
- Société de transport de Laval
- Réseau de transport de Longueuil
- Réseau de transport de la Capitale
- Sûreté du Québec
- Bibliothèque et Archives nationales du Québec
- Investissement Québec
- Société des traversiers du Québec
- Revenu Québec

### Universities

- Université de Montréal
- McGill University
- Concordia University
- Université Laval
- UQAM
- Université de Sherbrooke
- École de technologie supérieure
- HEC Montréal
- Polytechnique Montréal
- Université du Québec à Trois-Rivières
- Université du Québec à Chicoutimi
- Université du Québec en Outaouais
- Bishop's University

### Cégeps (sample — high enrollment)

- Cégep du Vieux Montréal
- Collège Ahuntsic
- Collège de Maisonneuve
- Dawson College
- Vanier College
- Cégep de Sainte-Foy
- Cégep de Limoilou
- Cégep de Sherbrooke

## Manitoba — names only (URL TBD)

English-speaking, so no translation-handling gap like the Quebec set above — prioritize this province before deeper Quebec work.

### Provincial & municipal

- Government of Manitoba (jobsearch.gov.mb.ca — provincial portal, likely similar structure to Ontario's OPS scraper)
- City of Winnipeg
- City of Brandon
- City of Steinbach
- City of Portage la Prairie
- City of Thompson
- City of Selkirk
- City of Winkler
- City of Morden

### Crown corporations & agencies

- Manitoba Hydro
- Manitoba Public Insurance (MPI)
- Manitoba Liquor & Lotteries
- Shared Health Manitoba (provincial health authority)
- Manitoba Housing
- CentreVenture (Winnipeg downtown development corp)

### Universities & colleges

- University of Manitoba
- University of Winnipeg
- Brandon University
- Université de Saint-Boniface
- Canadian Mennonite University
- Red River College Polytechnic
- Assiniboine Community College
- University College of the North

### Transit, police & libraries

- Winnipeg Transit
- Winnipeg Police Service
- Winnipeg Public Library

### School divisions (major only)

- Winnipeg School Division
- Pembina Trails School Division
- Louis Riel School Division
- Seven Oaks School Division
- River East Transcona School Division
- St. James-Assiniboia School Division
