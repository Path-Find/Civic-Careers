# Pending Sources

Sources that have been identified but are not yet scraped, with notes on why.

Last synced with scraper/scraper.ts: 2026-07-06  
Names-only backlog expanded: 2026-07-12 (no URL research yet). Manitoba added 2026-07-12 as the first out-of-province expansion — English-speaking, no French-parsing gap.

## Needs a new engine

*(none currently)*

## Engine ready, URL needed

Grouped by platform, same convention as `SOURCES.md` — that's the axis that determines how much shared engine work unlocks at once.

### PeopleSoft Fluid (7 sources, no engine yet — highest-leverage new build)

**Investigated 2026-07-12 (City of Winnipeg).** Earlier notes on this platform said the job list was "virtualized/scroll-loaded" — that was wrong, corrected after deeper digging on Winnipeg's tenant. All rows (confirmed 29/29) are actually present in the DOM at once; the real blocker is that each row's "View Details" link is `javascript:submitAction_win0(...)` — a stateful form postback, not a real navigable URL, so there's no per-job link to hand to `scrapeRawAndStage` directly. However: clicking one row's "View Details" lands on a detail view that has working **"Previous Job" / "Next Job"** controls and a "Search Results" breadcrumb back link — meaning the whole list is walkable from a single click without ever returning to the search page. Buildable, but needs a bespoke click-and-walk loop (not the standard collect-links-then-visit-each pattern every other engine uses) plus a synthetic `id`/`url` per job (real per-job identifier is the "Job ID" field shown on each detail view, e.g. `127144` for Winnipeg's first result — use that for `urlId`/dedup since the browser URL never changes). Calgary and TransLink (Metro Vancouver transit) found 2026-07-12 as more tenants on the same platform — didn't re-verify the postback pattern on those two individually, but same URL shape (`psc/.../HRS_HRAM_FL...`) as the others.

- Toronto Metropolitan University — https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- Western University — https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- McMaster University — https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab
- City of Greater Sudbury — https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- City of Winnipeg — https://careers.winnipeg.ca/psc/cgext/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U (found via Google search for "City of Winnipeg jobs", not guessed — an earlier guess at `winnipeg.ca/hr/JobOpportunities/` 404'd)
- City of Calgary — https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1
- TransLink (Metro Vancouver transit) — https://careersconnect.translink.ca/psc/EXT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U&FOCUS=Applicant&SiteId=2

### Taleo (existing engine, blocked)

- Humber College — https://humber.taleo.net/careersection/hbr_ex/jobsearch.ftl?lang=en

  **Tried 2026-07-12, blocked.** Page shows "Job Openings 1-12 of 12" and real facet counts, but this tenant's template renders zero `<a href>` job links anywhere on the page (checked broadly, not just the `h4 a[href*="viewRequisition"]` selector used for Oakville/St. Catharines) — likely a different/newer Taleo Career Section template using JS click handlers instead of hrefs. Needs deeper DOM investigation before the existing Taleo engine can be reused.

### HRSmart (existing engine, needs selector work)

- Simcoe County — https://simcoe.hua.hrsmart.com/hr/ats/JobSearch/viewAll

  **Tried 2026-07-12, inconclusive.** Page title loads ("Career Opportunities") but the York Region-style selector guess found 0 links — haven't confirmed the actual selector this tenant uses yet, may just need the real DOM inspected rather than guessed.

### BrassRing / Kenexa (no engine, one confirmed-clean tenant)

- Halifax Regional Municipality — https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25749&siteid=5764

  **Found 2026-07-12.** Real, clean job links confirmed (e.g. "Project Manager, Transit Infrastructure" → `.../HomeWithPreLoad?...&jobid=770720`). New portal type, no engine yet, but looks tractable — normal `<a href>` links with a `jobid` query param, not a postback-only pattern like PeopleSoft.

### Njoyn (existing engine, one confirmed-blocked tenant)

- Unidentified Njoyn tenant (CLID=61430) — blocked by Radware bot-protection captcha before the entity name could even be confirmed. Same dead-end as Toronto Public Library — not fixable without CAPTCHA bypass, which is out of scope.

### Jobs2Web (existing engine, partial)

- City of Ottawa — https://jobs-emplois.ottawa.ca/city-jobs/search/

  **Tried 2026-07-12, partial.** Job discovery works fine (found 74 real, correctly-titled postings). But detail pages render client-side and are slower than other Jobs2Web tenants — the standard 2s post-load buffer captures a "Loading..." placeholder instead of the actual job text, which would poison the AI parser with junk. Needs a longer/selector-based wait specifically for this tenant's detail pages before promoting. Note: production already has a separate "City of Ottawa" source via SuccessFactors (`career47.sapsf.com`, currently broken — see issue #32) — worth confirming these are genuinely two different systems (e.g. corporate vs. union postings) and not a portal migration, so we don't end up double-listing the same jobs under one source name once both work.

### Technomedia (no engine)

- York University — https://jobs-ca.technomedia.com/yorkuniversity/

### NEOGOV (no engine)

- Cambrian College — https://gjobs.neogov.ca/careers/cambriancollege

### Custom, no per-job links found (harder than typical custom.ts sources)

Unlike Peterborough/Barrie/Brantford (real `<a href>` per job), these two have job data on the page but no clickable per-job URL at all — closer in shape to the PeopleSoft postback problem than a normal custom scraper.

- Conestoga College — https://employment.conestogac.on.ca/

  **Corrected 2026-07-12.** Not Workday — a previously-staged `conestoga.wd3.myworkdayjobs.com` guess redirected straight to Workday's maintenance page (invalid tenant, not a temp outage). Real site is a bespoke page with a plain HTML table (Requisition Number / Job Title / Location / Closing) — real data, but zero hrefs on any row. There's an "RSS feed" link for "Current Academic Openings" mentioned in the page text (distinct from the site's general news RSS at `blogs1.conestogac.on.ca/news/index.xml`, which is NOT job postings) — worth checking if that job-specific feed URL can be extracted and fed through `scrapeRSS` instead of a custom DOM scraper.

- Trent University — https://employment.trentu.ca/default

  **Tried 2026-07-12, blocked.** Real listings ARE visible after page load ("HVAC Technician (Facilities Management)", etc.) but rendered by a heavy proprietary grid widget (obfuscated auto-generated classes like `gonly lay-7 sty-1 dfs-47`) — rows have no `<a href>`, clicks are handled via JS event delegation with no exposed per-job URL. Same complexity tier as the PeopleSoft postback problem, not a quick add.

### Custom, staged in test-new-sources.ts, verification pending (2026-07-12)

- Toronto District School Board — https://www.tdsb.on.ca/jobpostings/list.html — new `scrapeTDSB()` built, clean per-job links confirmed by hand (`jobpostings/details.html?jobId=N`), 6 jobs visible, no pagination hit yet.
- Northumberland County — https://northumberland.ca/county-government/careers/ — new `scrapeNorthumberland()` built, WordPress-style `/job/{slug}/` links confirmed by hand.

### Custom, not yet investigated

- University of Niagara Falls Canada — https://www.unfc.ca/about/careers
- St. Lawrence College — https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities
- Lakehead University (Administrative Staff) — https://www.lakeheadu.ca/faculty-and-staff/departments/services/hr/employment-opportunities/administrative-staff
- Hamilton Public Library — https://www.hpl.ca/jobs
- Kingston Frontenac Public Library — https://www.kfpl.ca/your-library/work-and-volunteer/jobs-at-the-library
- Brampton Library — https://www.bramptonlibrary.ca/careers
- Laurentian University (Administrative Staff) — https://laurentian.ca/about/careers/administrative-vacancies
- Cape Breton Regional Municipality — https://cbrm.ns.ca/about-cbrm/employment/current-opportunities/ (checked 2026-07-12: page loads but shows only site nav, no visible job listings in the DOM — may be a JS widget that needs a longer wait, or genuinely has zero current postings)
- Toronto Catholic District School Board — real job-listing URL not yet found; `tcdsb.org/page/jobs` is a nav landing page with no postings, same "wrong URL" issue Winnipeg's first guess had
- Ville de Montréal — https://montreal.ca/en/jobs (complex site)
- Ville de Montréal (SIM) — https://simenligne.montreal.ca/OA_HTML/RF.jsp?function_id=1011530&resp_id=23350&resp_appl_id=800&security_group_id=0&lang_code=FRC&params=78Yf57C4XSZOMFAg6ESOdTqziLKxVJYVFVWXogPijaRd67sVhNa2ic-20jG1-lSI (complex Oracle EBS site)

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
- City of Winnipeg — moved to "Engine ready" above (PeopleSoft Fluid, URL confirmed 2026-07-12)
- City of Brandon — promoted to active 2026-07-12 (Dayforce)
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
