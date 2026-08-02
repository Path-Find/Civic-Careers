# Pending Sources

Sources that have been identified but are not yet scraped, with notes on why.

Last synced with scraper/scraper.ts: 2026-07-06  
Names-only backlog expanded: 2026-07-12 (no URL research yet). Manitoba added 2026-07-12 as the first out-of-province expansion — English-speaking, no French-parsing gap.  
Deep-dive gap research (net-new boards): 2026-08-02 — see section at end of this file.

## Needs a new engine

*(none currently)*

## Engine ready, URL needed

Grouped by platform, same convention as `SOURCES.md` — that's the axis that determines how much shared engine work unlocks at once.

### PeopleSoft Fluid (engine built, 2/8 tenants working — see issue #37)

**Engine built 2026-07-12** (`scraper/engines/peoplesoft.ts`) — click-and-walk pattern (click first result, use the page's own "Next Job" control to walk the rest, since there are no real per-job URLs on this platform — every link is a `javascript:submitAction_win0(...)` postback). **City of Winnipeg confirmed working end-to-end (29/29). TransLink confirmed working end-to-end (90/90 stored in manual run 30726059105).** The other 7 tenants still need validation.

- Toronto Metropolitan University — https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U (staged in the Trial Action)
- Western University — https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U (staged in the Trial Action)
- McMaster University — https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab (staged in the Trial Action)
- City of Greater Sudbury — https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- City of Calgary — https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1 (staged in the Trial Action)
- Durham Region — https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3 (staged in the Trial Action; includes Durham Region Transit postings)
- Niagara Region — https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Siteid=1002 (staged in the Trial Action)

### HRSmart (existing engine, needs selector work)

- BC Public Service — https://bcpublicservice.hua.hrsmart.com/hr/ats/JobSearch/search (staged in the Trial Action)
- Simcoe County — https://simcoe.hua.hrsmart.com/hr/ats/JobSearch/viewAll
- University of Victoria — https://uvic.mua.hrdepartment.com/hr/ats/JobSearch/viewAll (staged in the Trial Action)

  **Tried 2026-07-12, inconclusive.** Page title loads ("Career Opportunities") but the York Region-style selector guess found 0 links — haven't confirmed the actual selector this tenant uses yet, may just need the real DOM inspected rather than guessed.

### BrassRing / Kenexa (no engine, one confirmed-clean tenant)

- Halifax Regional Municipality — https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25749&siteid=5764

  **Found 2026-07-12.** Real, clean job links confirmed (e.g. "Project Manager, Transit Infrastructure" → `.../HomeWithPreLoad?...&jobid=770720`). New portal type, no engine yet, but looks tractable — normal `<a href>` links with a `jobid` query param, not a postback-only pattern like PeopleSoft.

### Njoyn (existing engine, one confirmed-blocked tenant)

- City of Airdrie (Njoyn CLID=61430) — https://clients.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&CLID=61430 (identified 2026-08-02; previously blocked by Radware before entity name could be confirmed — retest)

### Jobs2Web (existing engine, detail-page render bug — confirmed on 3 tenants)

**Confirmed 2026-07-12 on three separate tenants**, so this is a real engine-level pattern, not a one-off: job discovery (search results page) works fine on all three, but detail pages render client-side slower than tenants like CMHC/Vancouver/Brampton — the standard ~2s post-load buffer captures a literal "Loading..." placeholder instead of the actual job text. Confirmed via direct `raw_text` inspection (searched for the string `"Loading..."` in stored content, not just eyeballing a snippet — a snippet-only check gave a false positive earlier on University of Toronto, which turned out fine on full-text inspection). Tried polling for text-length stabilization (up to 5s extra) — did not help; the content genuinely never finishes loading within a reasonable window, so this needs a different approach (a specific wait-for-selector on real content, or investigating why these particular tenants hang) rather than "wait longer."

- City of Ottawa — https://jobs-emplois.ottawa.ca/city-jobs/search/ — note: production already has a separate "City of Ottawa" source via SuccessFactors (`career47.sapsf.com`, currently broken — see issue #32) — worth confirming these are genuinely two different systems and not a portal migration, so we don't end up double-listing the same jobs under one source name once both work.
- City of Saskatoon — https://careers.saskatoon.ca/search/ (pending trial validation)
- BC Transit — https://jobs.bctransit.com/search/ — job discovery confirmed (6 real jobs), detail pages stuck on "Loading...".
- Regional Municipality of Wood Buffalo — https://jobs.rmwb.ca/search/ — job discovery confirmed (82 real jobs across 2 pages), detail pages stuck on "Loading...".
- Government of Alberta — https://jobpostings.alberta.ca/go/All-Jobs-GoA/2617217/ — 139 current public-service jobs; staged in the Trial Action using the existing Jobs2Web engine.

### Technomedia (no engine)

- York University — https://jobs-ca.technomedia.com/yorkuniversity/

### NEOGOV (engine built; Cambrian manually validated — see issue #74)

- Cambrian College — https://gjobs.neogov.ca/careers/cambriancollege (shared engine validated in manual batch `neogov-1`; still pending promotion)

### Custom, no per-job links found (harder than typical custom.ts sources)

Unlike Peterborough/Barrie/Brantford (real `<a href>` per job), these two have job data on the page but no clickable per-job URL at all — closer in shape to the PeopleSoft postback problem than a normal custom scraper.

- Conestoga College — https://employment.conestogac.on.ca/

  **Corrected 2026-08-02.** Not Workday — the real site exposes a support-jobs RSS feed at `https://employment.conestogac.on.ca/RSSFeed.aspx?category=support`, with current items and stable `ViewCompetition.aspx?id=...` detail links. The existing RSS engine needs to accept `id=` links; tracked in issue #90. Academic feed was empty during this check.

- Trent University — https://employment.trentu.ca/default

  **Tried 2026-07-12, blocked.** Real listings ARE visible after page load ("HVAC Technician (Facilities Management)", etc.) but rendered by a heavy proprietary grid widget (obfuscated auto-generated classes like `gonly lay-7 sty-1 dfs-47`) — rows have no `<a href>`, clicks are handled via JS event delegation with no exposed per-job URL. Same complexity tier as the PeopleSoft postback problem, not a quick add.

### Custom, not yet investigated

- ADP Workforce Now — https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=b3dc7fb4-546d-4c57-a2f4-0ab75313ff85&ccId=19000101_000001&lang=en_CA&selectedMenuKey=CurrentOpenings (validated in mixed-3 with the existing ADP engine; Algoma uses the same platform and remains a follow-up candidate)
- Town of Goderich — https://www.goderich.ca/town-hall/career-and-volunteer-opportunities/ (current page exposes a co-op opportunities PDF rather than machine-readable job postings; track under issue #75)
- University of Niagara Falls Canada — https://www.unfc.ca/about/careers (informational careers page; no current staff/faculty posting links in server-rendered HTML)
- St. Lawrence College — https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities (6 current server-rendered postings with stable `/jobs/<slug>` detail links; tracked in issue #76)
- Lakehead University (Administrative Staff) — https://www.lakeheadu.ca/faculty-and-staff/departments/services/hr/employment-opportunities/administrative-staff (server-rendered current postings with direct detail links; RSS is stale; candidate for the shared custom HTML work in issue #79)
- Hamilton Public Library — https://www.hpl.ca/jobs (no current machine-readable postings exposed; page provides a general application PDF and phishing warning; track with issue #75)
- Kingston Frontenac Public Library — https://www.kfpl.ca/your-library/work-and-volunteer/jobs-at-the-library (current openings are individual PDF descriptions with email applications; track with issue #75)
- Brampton Library — https://www.bramptonlibrary.ca/careers (current opening is a PDF description plus a fillable application form and email submission; track with issue #75)
- London Public Library — https://recruiting.ultipro.ca/LON5100LPLY/JobBoard/5a8bb7ac-1f7b-4aae-9db8-37f3df5b9940/?o=postedDateDesc&q= (UltiPro; staged in manual batch engine-ready-11)
- Oakville Public Library — https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?brid=ohm5hsyepJ9o6VvSF7WaYg&cws=43&org=TOWNOFOA (Taleo; staged in manual batch engine-ready-11)
- Laurentian University (Administrative Staff) — https://laurentian.ca/about/careers/administrative-vacancies (individual posting pages are server-rendered HTML with stable UUID URLs and online forms; the index can be Cloudflare-blocked; candidate for shared custom HTML investigation)
- Kitchener Public Library — https://www.kpl.org/your-library/job-opportunities (currently no vacancies; future postings use a PDF/email application workflow, track with issue #75 if postings return)
- Waterloo Public Library — https://www.wpl.ca/your-library/job-opportunities/ (currently no openings; no machine-readable job board exposed)
- Guelph Public Library — https://www.guelphpl.ca/careers/ (current opportunities are embedded in page text with email/form applications; older postings are PDFs, track with issue #75)
- Regina Public Library — https://www.reginalibrary.ca/about/current_opportunities (current postings and full descriptions are rendered directly on one Drupal page; application details are embedded in the page, so this is a custom HTML source rather than a separate job board)
- Strathcona County Library — https://sclibrary.ca/jobs/ (current openings link to server-rendered HTML detail pages with full descriptions and email applications; candidate for the shared custom HTML work in issue #79)
- Lethbridge Public Library — https://lethlib.ca/about-us/employment (the library sends applicants to the City of Lethbridge board; the linked Taleo URL currently returns 404, so do not add a separate library source until the city link is repaired)
- Red Deer Public Library — https://rdpl.org/employment/ (no open positions at audit time; page is a simple server-rendered vacancy page)
- Cape Breton Regional Municipality — https://cbrm.ns.ca/about-cbrm/employment/current-opportunities/ (checked 2026-07-12: page loads but shows only site nav, no visible job listings in the DOM — may be a JS widget that needs a longer wait, or genuinely has zero current postings)
- Vaughan Public Library — https://www.vaughanpl.info/jobs (posting details are PDF links; the Apply action opens a separate HTML application form, so the current custom scraper does not capture the actual description)
- Toronto Catholic District School Board — https://www.tcdsb.org/page/jobs (Apptegy/Nuxt-rendered page; no postings or per-job links in the initial HTML, so it needs browser-network/API inspection before choosing a scraper)
- Ville de Montréal — https://montreal.ca/en/jobs (complex site)
- Ville de Montréal (SIM) — https://simenligne.montreal.ca/OA_HTML/RF.jsp?function_id=1011530&resp_id=23350&resp_appl_id=800&security_group_id=0&lang_code=FRC&params=78Yf57C4XSZOMFAg6ESOdTqziLKxVJYVFVWXogPijaRd67sVhNa2ic-20jG1-lSI (complex Oracle EBS site)

## Ontario — names only (URL TBD)

High-value gaps not already active or listed above. Names only; portal/engine TBD when researched.

### Municipal & regional

- City of Abbotsford — https://www.abbotsford.ca/city-hall/human-resources/career-opportunities (Njoyn; 8 jobs stored in manual run 30725466168)
- Simcoe County — https://simcoe.hua.hrsmart.com/hr/ats/JobSearch/viewAll (HRSmart; confirmed from https://simcoe.ca/hr/career-opportunities/; also listed under HRSmart engine-ready above)
- City of Pickering — https://www.pickering.ca/council-city-administration/employment-opportunities/ (server-rendered job table with direct detail links, plus Pickering Public Library jobs linked from the same page; candidate for shared custom municipal HTML work in issue #86)
- Town of Newmarket — https://sire.newmarket.ca/TownGovernment/Pages/Job-Opportunities.aspx (main and recreation postings use HRSmart at https://newmarket.hua.hrsmart.com/hr/ats/JobSearch/viewAll; 14 jobs stored in manual run 30725902033)
- VIA TGF Inc. — https://carrieres-careers.altotrain.ca/search/?createNewAlert=false&q= (VIA HFR / VIA TGF careers site)
- VIA Rail Canada — https://careers.viarail.ca/search/?locale=en_US&previewLink=true&referrerSave=false
- Town of Halton Hills — https://www.haltonhills.ca/en/your-government/careers.aspx (server-rendered current postings and full descriptions with email/form applications; Town page also includes Halton Hills Public Library ongoing opportunities; candidate for issue #86)
- City of Orillia — https://www.orillia.ca/my-government/employment/ (public HiringPlatform board at https://orillia.hiringplatform.ca/list/careers; no matching engine yet)
- City of North Bay — https://northbay.ca/city-government/careers/ (server-rendered current-opportunities table with direct posting pages; candidate for issue #86)
- City of Sault Ste. Marie — https://saultstemarie.ca/work/employment/ (current jobs are server-rendered listings whose descriptions are individual PDFs; applications are by email; track with issue #75)
- City of Timmins — https://timmins.hosted.civiclive.com/our_services/news_and_alerts/current_career_opportunities (current postings link to PDF job descriptions and separate application instructions; track with issue #75)
- City of Kawartha Lakes — https://www.kawarthalakes.ca/government-administration/career-opportunities/ (external candidates go to a Taleo board with 14 positions; use the existing Taleo engine)
- Municipality of Chatham-Kent — https://www.chatham-kent.ca/apply/jobs (current municipal postings use an UltiPro board at `recruiting.ultipro.ca`; use the existing UltiPro engine)
- City of Stratford — no current municipal job board was exposed during this pass; the indexed official career posting was a PDF, so track with issue #75 if recurring postings remain PDF-only
- City of Woodstock — https://www.cityofwoodstock.ca/your-government/employment/ (current postings use a JazzHR/ApplyToJob board at `cityofwoodstock.applytojob.com`; use the existing JazzHR engine)
- Norfolk County — https://www.norfolkcounty.ca/council-administration-and-government/careers/ (current postings use Workable at `apply.workable.com/norfolkcounty`; tracked in issue #93)
- County of Brant — https://countyofbrant.applytojob.com/apply/ (JazzHR/ApplyToJob; 4 postings stored successfully in manual run 30724286120)
- County of Wellington — https://careers.wellington.ca/ (Jobs2Web; 8 jobs stored in manual run 30725902033)
- Essex County — https://www.countyofessex.ca/county-government/careers-and-volunteering/career-opportunities/ (JazzHR; 6 jobs stored in manual run 30725244395)
- Haldimand County — https://www.haldimandcounty.ca/government-administration/careers-and-volunteering/current-opportunities/ (Govstack news/detail pages with current postings; shared municipal custom investigation in issue #86)
- Lambton County — https://recruiting.ultipro.ca/COR5004CLMB/JobBoard/6b014206-1003-40c3-98a0-b2340f1971da/?o=postedDateDesc&q= (UltiPro; 15 jobs stored in manual run 30724917303)
- Grey County — https://jobs.dayforcehcm.com/en-CA/greycounty/CANDIDATEPORTAL (Dayforce; 5 jobs stored in manual run 30724917303)
- Bruce County — https://brucecounty.myavanti.ca/careers (Avanti Career Connector; dynamic jobs page with department/location filters; new scraper issue #95)
- Renfrew County — https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC (Workzoom/CUROS; new scraper issue #98)
- City of Quinte West — https://canr58.dayforcehcm.com/CandidatePortal/en-CA/quintewest (Dayforce; 8 discovered and 4 stored successfully in manual run 30724458815)
- Town of Collingwood — https://www.collingwood.ca/governance-engagement/careers-employment (Drupal page with 5 current job detail links and email applications; shared municipal custom investigation in issue #86)
- Town of Bradford West Gwillimbury — https://bwg.njoyn.com/CL/xweb/xweb.asp?CLID=124493&page=joblisting (Njoyn; official board exposes postings but Actions stored 0; browser-specific investigation in issue #94)
- Town of East Gwillimbury — https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?ccId=19000101_000001&cid=f5060f66-1f92-430e-b67b-c5e16cd9318f&lang=en_CA&type=JS (ADP Workforce Now; 8 postings stored successfully in manual run 30724595666; official page links separately to EG Public Library opportunities)
- Town of Georgina — https://georgina-careers.vipcloud.ca/default (VIP Cloud; shared-platform investigation in issue #96)
- Town of Whitchurch-Stouffville — https://townofws-careers.vipcloud.ca/default (VIP Cloud; shared-platform investigation in issue #96)
- Township of King — https://www.king.ca/employment (current postings are direct PDF files with email applications; tracked in issue #75)
- City of Port Colborne — https://portcolborne.wd10.myworkdayjobs.com/en-US/CPC (Workday shell is blocked by a Cloudflare challenge in Actions; manual run 30724817613; tracked in issue #97)
- City of Thorold — https://www.thorold.ca/council-administration/jobs/ (current postings are direct PDF files, including firefighter and crossing-guard postings; tracked in issue #75)
- Town of Grimsby — https://www.grimsby.ca/town-hall/careers/current-opportunities/ (current postings are direct PDF files; tracked in issue #75)
- Town of Fort Erie — https://forterie.hiringplatform.com/list/Internalcareers (HiringPlatform; tracked in issue #87)

### Colleges

- Niagara College — https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=38&org=NIAGARACOLLEGE (staged in the Trial Action)
- Georgian College — https://aa165.taleo.net/careersection/gc_external_career_site/jobsearch.ftl?lang=en&portal=8216760849 (staged in the Trial Action)
- Fleming College — https://rsprd.flemingc.on.ca/psc/RSPRD/EMPLOYEE/RSMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant (staged in the Trial Action)
- Loyalist College — https://gjobs.neogov.ca/careers/loyalistcollege (NEOGOV; the official careers page links to this shared portal; use the NEOGOV engine tracked in issue #74)
- St. Clair College — https://www.stclaircollege.ca/careers/current-opportunities (current full-time/term postings are direct PDFs; tracked in issue #75)
- Lambton College — https://lambtoncollege.njoyn.com/CL4/xweb/Xweb.asp?CLID=72351&page=joblisting (Njoyn; the official careers page links to this tenant; use the existing Njoyn engine)
- Confederation College — https://confederationcollege.peopleadmin.ca/postings/search (PeopleAdmin; 21 open postings with stable `/postings/<id>` detail links; use the PeopleAdmin work tracked in issue #77)
- Sault College — https://saultcollege.njoyn.com/cl3/xweb/Xweb.asp?CLID=56877&page=joblisting (Njoyn; currently blocked by Radware CAPTCHA before job links load; tracked in issue #94)
- Canadore College — https://www.canadorecollege.ca/careers (official careers page currently returns a client-challenge page; no staff job-board URL confirmed; student employment is a separate seasonal portal)
- Northern College — https://www.northerncollege.ca/careers/ (8 current postings with stable `/careers/jobs/<slug>` detail links and HTML descriptions; shared custom implementation candidate in issue #79)
- Collège Boréal — https://collegeboreal.wd3.myworkdayjobs.com/en-US/CB (Workday; 7 postings stored successfully in manual run 30724286120)
- La Cité collégiale — https://www.collegelacite.ca/ressources-humaines (official page points to `jobs.glowinthecloud.com/college-la-cite`, which currently returns a not-found page; no live staff board confirmed)

### Universities

- University of Manitoba — https://viprecprod.ad.umanitoba.ca/ (official UM Careers portal with separate academic, staff, student, and trades posting categories)
- University of Saskatchewan — https://usask.csod.com/ux/ats/careersite/14/home?c=usask (CSOD staff/faculty careers board linked from the official careers page; 93 jobs stored in diagnostic validation; staged in the Trial Action)
- University of Regina — https://urcareers.uregina.ca/postings/search (e-Recruit postings board with 12 current postings during verification)
- University of Calgary — https://careers.ucalgary.ca/jobs/search (official careers board with 151 current opportunities during verification)
- University of New Brunswick — support staff: https://www.unb.ca/hr/careers/support-staff.php; academic: https://www.unb.ca/hr/careers/academic.php (support page injects an Alongside/CareerBeacon widget with current detail URLs; academic postings are direct PDFs; tracked in issues #78 and #75)
- Dalhousie University — https://dal.peopleadmin.ca/postings/search (PeopleAdmin; stable `/postings/<id>` links and Atom feed; tracked in issue #77)
- McGill University — https://mcgill.wd3.myworkdayjobs.com/mcgill_careers (Workday; 173 jobs currently visible; staged in manual batch engine-ready-10)
- University of Lethbridge — https://uleth.peopleadmin.ca/postings/search (PeopleAdmin; stable `/postings/<id>` links and Atom feed; tracked in issue #77)
- University of Fredericton — https://jobs.careerbeacon.com/employer-profile/university-of-fredericton (CareerBeacon; current detail pages are indexed, but the employer profile is Cloudflare-blocked; tracked in issue #80)
- Saint Mary's University — faculty: https://www.smu.ca/about/faculty-employment-opportunities.html; staff: https://www.smu.ca/about/staff-employment-opportunities.html (separate CareerBeacon staff/faculty profiles with current detail pages; tracked in issue #80)
- Wilfrid Laurier University — https://careers.wlu.ca/ (SuccessFactors; manual run 30725674862 stored 0 jobs because its result layout is not handled by the current engine; tracked in issue #100)
- University of Windsor — https://efhc.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1 (Oracle Cloud; the university's current-employment link resolves to this portal; use the existing Oracle engine)
- University of Waterloo — https://uwaterloo.wd3.myworkdayjobs.com/uw_careers (staged in the Trial Action)
- University of British Columbia — https://ubc.wd10.myworkdayjobs.com/ubcstaffjobs (staged in the Trial Action)
- University of Alberta — https://iaejup.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/UOA-Careers/jobs (staged in the Trial Action)
- University of the Fraser Valley — https://ufv.njoyn.com/CL3/xweb/Xweb.asp?page=joblisting&CLID=56144&lang=1 (staged in the Trial Action)
- Langara College — https://langara.wd10.myworkdayjobs.com/External_Employment_Opportunities (staged in the Trial Action)
- Nipissing University — https://www.nipissingu.ca/careers/employment-postings (12 current staff postings with stable `/careers/employment-postings/<slug>` detail links and HTML descriptions; shared custom implementation candidate in issue #79)
- Algoma University — https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=325cbdb8-d490-4480-ae8d-d332911ec006&ccId=19000101_000001&lang=en_CA (ADP Workforce Now; 1 job stored in manual run 30725301492)
- Royal Military College of Canada — https://www.rmc-cmr.ca/en/faculty-services/employment-opportunities-royal-military-college-canada (faculty and term links point to the existing GC Jobs portal; non-teaching roles point to CFMWS; do not create a separate RMC scraper until source attribution is available)

### Libraries

- Toronto Public Library (re-enable; previously disabled for Radware bot protection) — former Njoyn board; re-confirm live URL before re-enabling
- BWG Public Library — https://bwg.njoyn.com/CL/xweb/Xweb.asp?CLID=126454&page=joblisting (separate Njoyn board linked from the Town careers page; Actions stored 0; browser-specific investigation in issue #94)
- Ottawa Public Library — https://about.biblioottawalibrary.ca/en/jobs-ottawa-public-library (links into the City of Ottawa Jobs2Web board; do not create a separate portal engine)
- Mississauga Library System — https://www.mississauga.ca/library/library-jobs-and-volunteer/ (links into the existing City of Mississauga Jobs2Web board; city source should be labelled as including library jobs)
- London Public Library — https://recruiting.ultipro.ca/LON5100LPLY/JobBoard/5a8bb7ac-1f7b-4aae-9db8-37f3df5b9940/?o=postedDateDesc&q= (UltiPro; staged in manual batch engine-ready-11)
- Markham Public Library — https://markhampubliclibrary.ca/employment/ (current postings are direct PDFs; tracked with the PDF/form sources in issue #75)
- Oakville Public Library — https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?brid=ohm5hsyepJ9o6VvSF7WaYg&cws=43&org=TOWNOFOA (Taleo; Town of Oakville board — label city source as including library; staged engine-ready-11)
- Burlington Public Library — https://www.bpl.on.ca/about/careers (no current posting links found in the page HTML; needs a current source URL)
- Richmond Hill Public Library — via City of Richmond Hill https://jobs.richmondhill.ca/go/Richmond-Hill-Public-Library/2617617/ (do not create a separate library source)
- Kitchener Public Library — https://www.kpl.org/your-library/job-opportunities (PDF/email when open; also listed under custom not-yet-investigated)
- Waterloo Public Library — https://www.wpl.ca/your-library/job-opportunities/ (no openings at last audit)
- Guelph Public Library — https://www.guelphpl.ca/careers/ (page text + email/form; also listed above)

### Additional Canadian public libraries — names only

#### British Columbia

- Vancouver Public Library — https://www.vpl.ca/get-involved/careers (current postings are included in the existing City of Vancouver Jobs2Web board; do not create a separate portal source)
- Surrey Libraries — https://www.surreylibraries.ca/about-us/careers (career-alert form is present, but no current machine-readable postings were exposed)
- Burnaby Public Library — https://bpl.bc.ca/careers-opportunities (current postings and application forms are direct PDFs; tracked in issue #75)
- Richmond Public Library — https://www.yourlibrary.ca/careers-at-rpl/ (Taleo; 2 jobs stored in manual run 30725466168)
- Coquitlam Public Library — https://coqlibrary.ca/careers/ (no current openings; future applications are by email, with posting PDFs when jobs are advertised)
- Greater Victoria Public Library — https://www.gvpl.ca/ (careers link is not exposed in the current site navigation; needs manual follow-up)
- Kelowna Regional Library — https://www.orl.bc.ca/about-us/careers (currently directs applicants to jobs@orl.bc.ca; no machine-readable posting list exposed)
- Abbotsford Public Library — https://www.abbotsfordlibrary.ca/about-us/careers
- Kamloops Library — https://www.kamloops.ca/city-hall/career-opportunities (City board includes library-related municipal roles when posted)
- Nanaimo Ladysmith Public Libraries — https://virl.bc.ca/jobs/ (WordPress custom-post archive with stable `/jobs/<slug>/` detail pages and posted dates; shared custom implementation candidate in issue #79)

#### Alberta

- Calgary Public Library — https://gjobs.neogov.ca/careers/calgarypubliclibrary (NEOGOV; the official library careers page links to this portal; use the NEOGOV engine tracked in issue #74)
- Edmonton Public Library — https://www.epl.ca/careers/ (Taleo; 10 jobs stored in manual run 30725674862)
- Saskatoon Public Library — https://saskatoonlibrary.ca/about/careers/ (current openings are listed in a server-rendered table; posting descriptions are PDF links and applications open embedded HTML forms, so track with the PDF/form workflow in issue #75)
- St. Albert Public Library — https://stalbertlibrary.ca/about-us/careers/ (city careers use the City of St. Albert Njoyn portal at https://careers.stalbert.ca; the library may be included in that city board, so confirm source attribution before adding a separate library source)

#### Saskatchewan

- Prince Albert Public Library — https://princealbertlibrary.ca/about/employment (no current openings at audit time; future postings use PDFs/email applications, so track with issue #75)

#### Québec

- Bibliothèques de Montréal — https://montreal.ca/en/jobs (City board includes Montréal library roles when posted)
- Bibliothèque de Québec — https://bibliothequedequebec.qc.ca/emplois/index.aspx
- Bibliothèque de Laval — https://www.laval.ca/Pages/Fr/Citoyens/emplois.aspx
- Bibliothèque de Gatineau — https://gatineau.njoyn.com/CL2/xweb/Xweb.asp?CLID=27082 (City board includes library roles when posted)
- Bibliothèques de Sherbrooke — https://www.sherbrooke.ca/fr/emplois
- Bibliothèque de Longueuil — https://www.longueuil.quebec/fr/emplois

#### Atlantic Canada

- Halifax Public Libraries — https://www.halifaxpubliclibraries.ca/careers/jobs/ (separate WordPress jobs page; no current posting links were exposed during audit)
- Saint John Free Public Library — https://www.saintjohnlibrary.ca/about-us/careers (no current machine-readable job board confirmed; follow up through the City/NB public-library service)
- Fredericton Public Library — https://www.frederictonpubliclibrary.ca/about-us/careers (no current staff posting board confirmed; current search results point to static/volunteer notices)
- Moncton Public Library — https://monctonpubliclibrary.ca/ (current opportunity is a direct PDF from New Brunswick Public Library Services; tracked in issue #75)
- Bibliothèque publique de l'Île-du-Prince-Édouard — https://www.library.pe.ca/about/careers
- Newfoundland & Labrador Public Libraries — https://nlpl.ca/jobs-at-the-library/ (current postings are PDF links; track with issue #75)

### Conservation authorities

- Credit Valley Conservation — https://cvc.ca/jobs/ (career page says applications are made through online job postings, but no current posting links were exposed in the accessible page; needs endpoint inspection, tracked in issue #88)
- Lake Simcoe Region Conservation Authority — https://lsrca.on.ca/index.php/about-us/careers/ (no current jobs or summer jobs at audit time; future applications are likely email-based)
- Grand River Conservation Authority — https://www.grandriver.ca/who-we-are/job-opportunities/ (listing page links each posting to a PDF and applications are by email; track with issue #75)
- Niagara Peninsula Conservation Authority — https://npca.ca/careers (older official materials reference this careers path, but a current machine-readable board was not confirmed during this pass)
- Central Lake Ontario Conservation Authority — https://www.cloca.com/employment (official employment page currently says there are no job postings; recheck when a posting appears)

### Crown corps & provincial agencies

- Ontario Power Generation — https://jobs.opg.com/go/View-All-Jobs/2398117/ (Jobs2Web; mid-2026 recruitment-system transition may pause posts)
- Hydro One — https://jobs.hydroone.com/search (Jobs2Web; staged in manual batch engine-ready-10)
- Toronto Hydro — https://jobs.torontohydro.com/search/ (Jobs2Web; staged in manual batch engine-ready-10)
- Hydro Ottawa — https://hydroottawa.wd3.myworkdayjobs.com/en-US/hydro_ottawa_careersite (Workday; staged in manual batch engine-ready-10)
- LCBO — https://www.lcbo.com/content/lcbo/en/corporate-pages/careers/job-paths.html (Workday; 18 jobs stored in manual run 30725034212)
- OLG — https://about.olg.ca/working-with-us/olg-careers/ (Workday; 7 jobs stored in manual run 30725034212)
- WSIB — https://www.wsib.ca/en/careers (Oracle Cloud; 2 jobs stored in manual run 30725034212)
- Ontario Health — https://oh.wd3.myworkdayjobs.com/en-US/OH (Workday; validated in the Workday manual batch)
- Public Health Ontario — https://www.publichealthontario.ca/en/about/careers/current-job-opportunities (Workday; 3 jobs stored in manual run 30725034212)
- Ontario Health atHome — https://www.ontariohealthathome.ca/careers/ (iCIMS; 61 jobs stored in manual run 30725034212)
- IESO — https://careers.ieso.ca/go/Career-Opportunities/8924000/ (Jobs2Web; ready for the existing Jobs2Web engine)
- Ontario Energy Board — https://careers.oeb.ca/ (Jobs2Web; tested in the current manual batch)
- Ontario Clean Water Agency — https://ocwa.wd10.myworkdayjobs.com/en-US/External (Workday; validated in the Workday manual batch)

### Transit (if separate from municipal portals)

Most GTHA transit brands share the city/region board — do not create a second scraper; label the parent source as including transit.

- OC Transpo — https://jobs-emplois.ottawa.ca/city-jobs/go/OC-Transpo/8649847/ (City of Ottawa Jobs2Web/SuccessFactors filter; hub: https://www.octranspo.com/en/about-us/jobs/)
- MiWay — https://jobs.mississauga.ca/ (City of Mississauga board; hub: https://www.mississauga.ca/miway-transit/transit-jobs/)
- York Region Transit — operators often hired via contractors (e.g. Miller Transit); regional staff on York Region HRSmart https://york.hua.hrsmart.com/hr/ats/JobSearch/viewAll (already active as York Region)
- Durham Region Transit — included in Durham Region PeopleSoft https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3 (already staged under PeopleSoft)
- Brampton Transit — https://careers.brampton.ca/search/ (City of Brampton Jobs2Web; already active)
- Grand River Transit — https://careers.regionofwaterloo.ca/RoW/search/ (Region of Waterloo Jobs2Web; already active)
- Hamilton Street Railway — https://cityofhamilton.bamboohr.com/careers (City of Hamilton BambooHR; already active)

### Additional Canadian public transit agencies — names only

#### Alberta

- Calgary Transit — https://www.calgary.ca/careers/transit.html (roles are included in the City of Calgary PeopleSoft board; do not add a separate transit source)
- Edmonton Transit Service — https://recruitment.edmonton.ca/ (roles are included in the City of Edmonton Phenom People portal; tracked in issue #81)
- Strathcona Transit — https://www.strathcona.ca/council-county/careers/ (current transit posting is a server-rendered Strathcona County detail page; use the shared custom HTML investigation in issue #79, and label the source as including Strathcona Transit)
- Red Deer Transit — https://www.reddeer.ca/careers/ (city-wide careers board; original URL is stale)
- Lethbridge Transit — https://www.lethbridge.ca/careers/ (city-wide careers board; original URL is stale)
- Grande Prairie Transit — https://cityofgp.com/city-government/working-city/job-postings (city-wide careers board; original URL is stale)

#### Saskatchewan

- Saskatoon Transit — apply via City of Saskatoon Jobs2Web https://careers.saskatoon.ca/ (do not add a separate transit source)
- Regina Transit — https://jobs.regina.ca/ (roles are included in the City of Regina Jobs2Web board; do not add a separate transit source)
- Prince Albert Transit — https://www.citypa.ca/en/city-hall/careers.aspx (official site exposes a general Jobs link, but this exact careers URL was not confirmed as a live posting board; verify the current destination before choosing an engine)

#### Québec

- Société de transport de Sherbrooke — https://www.sts.qc.ca/carrieres/emplois-disponibles/ (official employment page currently says there are no postings; future jobs appear on this page, so recheck before adding an engine)
- Société de transport de l'Outaouais (STO) — https://www.sto.ca/carrieres/ (official careers page has a live “view job offers” path, but the destination/portal was not exposed in the accessible result; inspect that link before choosing an engine)
- Société de transport du Saguenay — https://stsaguenay.com/emplois/
- Société de transport de Lévis — https://www.stlevis.ca/emplois

#### Atlantic Canada

- Halifax Transit — https://www.halifax.ca/about-halifax/employment (city-wide careers board; original URL is stale)
- Saint John Transit — apply via City of Saint John Njoyn https://clients.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&CLID=51331 (city-wide; do not split transit)
- Fredericton Transit — City of Fredericton Oracle Cloud https://eihe.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs (hub: https://www.fredericton.ca/city-government/careers)
- Codiac Transpo — https://www.moncton.ca/en/city-hall/careers
- Charlottetown Transit — https://www.charlottetown.ca/city_hall/careers
- Metrobus St. John's — https://www.stjohns.ca/your-government/careers/ (city-wide careers board; original URL redirects here)

#### Northern Canada

- Whitehorse Transit — https://www.whitehorse.ca/city-hall/careers/ (currently redirects to a careers event page, not a job listing)
- Yellowknife Transit — https://www.yellowknife.ca/jobs (city-wide careers board; original URL is stale)

### Police services (if separate from municipal portals)

- Toronto Police Service — PeopleSoft Fluid: uniform https://careers.torontopolice.on.ca/psc/ERCRT92/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteID=1000 · civilian https://careers.torontopolice.on.ca/psc/ERCRT92/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteID=2000 (hub: https://www.tps.ca/careers/)
- Ontario Provincial Police — constable recruitment https://recruitment.opp.ca · civilian roles post on active OPS https://www.gojobs.gov.on.ca/ (do not split civilian as a second OPP source)
- Peel Regional Police — PeopleSoft: officer SiteID=3000 https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteID=3000 · civilian SiteID=2000 https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteID=2000 (hub: https://www.peelpolice.ca/careers/)
- York Regional Police — Jobs2Web: uniform https://jobs.yrp.ca/go/Uniform-Career-Opportunities/8666547/ · civilian https://jobs.yrp.ca/go/Civilian-Career-Opportunities/8666447/ (hub: https://jobs.yrp.ca/)
- Ottawa Police Service — https://jobs-emplois.ottawa.ca/OttawaPolice/search (City of Ottawa Jobs2Web stack, OPS-branded site)

### School boards (major boards only)

- Toronto District School Board — already active: https://www.tdsb.on.ca/jobpostings/list.html
- Toronto Catholic District School Board — ApplyToEducation https://tcdsb.simplication.com/ (hub https://www.tcdsb.org/page/jobs also Apptegy; prefer ATE for applications — issue #89)
- York Region District School Board — ApplyToEducation https://yrdsb.simplication.com/ (hub: https://www2.yrdsb.ca/about-us/working-yrdsb/careers)
- Peel District School Board — https://www.peelschools.org/careers/list (Lumesse/TalentLink-style in-house board; hub: https://www.peelschools.org/careers)
- Halton District School Board — ApplyToEducation https://hdsb.simplication.com/ (hub: https://www.hdsb.ca/our-board/careers/)
- Ottawa-Carleton District School Board — ApplyToEducation https://ocdsb.simplication.com/ (hub: https://www.ocdsb.ca/careers)
- Hamilton-Wentworth District School Board — ApplyToEducation https://hwdsb.simplication.com/ (hub: https://www.hwdsb.on.ca/careers)
- Thames Valley District School Board — Knighthunter support https://tvdsb.knighthunter.com/ · teaching https://tvdsb.knighthunter.com/TeachingList.aspx (hub: https://www.tvdsb.ca/en/our-board/employment-opportunities.aspx)
- Waterloo Region District School Board — ApplyToEducation https://wrdsb.simplication.com/ (hub: https://www.wrdsb.ca/careers/)
- Durham District School Board — ApplyToEducation https://ddsb.simplication.com/ (hub: https://www.ddsb.ca/about-ddsb/careers-at-the-ddsb/)

## Quebec — names only (URL TBD)

Starter expansion set. **Ville de Montréal** and **Ville de Montréal (SIM)** already listed above with URLs.

### Provincial & large cities

- Gouvernement du Québec (fonction publique) — https://emplois.carrieres.gouv.qc.ca/plateforme-emploi (custom Emplois en ligne; hub: https://www.quebec.ca/gouvernement/travailler-gouvernement/emplois-fonction-publique)
- Ville de Québec — https://recrutement.ville.quebec.qc.ca/default.aspx (custom; hub: https://www.ville.quebec.qc.ca/apropos/emplois/)
- Ville de Laval — https://carriere.laval.ca/search/ (SuccessFactors; hub: https://www.laval.ca/organisation-municipale/emplois/)
- Ville de Gatineau — https://clients.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&CLID=27082&lang=2 (Njoyn CLID=27082; also listed under libraries as including library roles)
- Ville de Longueuil — Manitou https://app.manitousolution.com/libreservice/index.html?customer=120053&lang=fr (hub: https://www.longueuil.quebec/fr/emplois)
- Ville de Sherbrooke — https://www.sherbrooke.ca/fr/emplois (custom hub/portail)
- Ville de Lévis — https://levisrecrute.com/emploi/ (Workland; hub: https://levisrecrute.com/)
- Ville de Trois-Rivières — https://www.v3r.net/emplois/postes-disponibles (custom on-site)
- Ville de Saguenay — https://carriere.saguenay.ca/jobs (custom)
- Ville de Terrebonne — https://clients.njoyn.com/cl4/xweb/Xweb.asp?page=joblisting&lang=2&CLID=71764 (Njoyn CLID=71764)
- Ville de Brossard — https://atlas.workland.com/careers/brossard/jobs (Workland; hub: https://brossard.ca/emplois/)
- Ville de Repentigny — https://atlas.workland.com/careers/ville-de-repentigny/jobs (Workland)
- Ville de Saint-Jérôme — https://www.vsj.ca/emplois/ (custom per-job pages)
- Ville de Drummondville — https://www.drummondville.ca/emplois/ (custom WordPress board)
- Ville de Granby — https://www.granby.ca/fr/emplois-disponibles (custom on-site list)
- Ville de Shawinigan — https://www.shawinigan.ca/ville/offres-demploi/ (custom)
- Ville de Saint-Hyacinthe — https://app.st-hyacinthe.ca/Portail_Emplois (custom municipal portal)
- Ville de Blainville — https://emplois.blainville.ca/default (custom ATS)
- Ville de Dollard-des-Ormeaux — https://ville.ddo.qc.ca/travailler/offres-demploi/ (custom)
- Ville de Mirabel — https://clients.njoyn.com/cl4/xweb/Xweb.asp?page=joblisting&lang=2&CLID=71754 (Njoyn CLID=71754)

### Crown / agencies / transit

- Hydro-Québec — https://emploi.hydroquebec.com/go/Tous-les-emplois/2665017/ (SuccessFactors/Jobs2Web)
- SAQ — https://emploi.saq.com/search/ (SuccessFactors; retail sometimes AppyHere https://apply.appyhere.com/saq-com)
- Loto-Québec — https://carrieres.lotoquebec.com/tous-les-emplois (custom)
- STM (Société de transport de Montréal) — https://emplois.stm.info/ (hub: https://www.stm.info/fr/emploi)
- Société de transport de Laval — https://lavaltransit.njoyn.com/CL2/xweb/xweb.asp?clid=60406&page=joblisting (Njoyn CLID=60406)
- Réseau de transport de Longueuil — https://rtl.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&clid=24153&lang=2 (Njoyn CLID=24153)
- Réseau de transport de la Capitale — https://clients.njoyn.com/CGI/xweb/Xweb.asp?CLID=23009&page=joblisting&lang=2 (Njoyn CLID=23009)
- Sûreté du Québec — police https://recrutement.sq.gouv.qc.ca/ · civils via provincial Emplois en ligne https://emplois.carrieres.gouv.qc.ca/ (filter SQ)
- Bibliothèque et Archives nationales du Québec — https://banq.cvmanager.com/ (CVManager; list: https://www.banq.qc.ca/emploi/emplois-disponibles/)
- Investissement Québec — https://investquebec.wd10.myworkdayjobs.com/fr-CA/ext (Workday)
- Société des traversiers du Québec — https://atlas.workland.com/careers/stq (Workland)
- Revenu Québec — https://www.revenuquebec.ca/emplois/rechercher-un-emploi/ (often routes via provincial Emplois en ligne)

### Universities

- Université de Montréal — PeopleSoft Fluid https://rh-carriere-dmz.synchro.umontreal.ca/psc/rhprpr9_car/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteId=1
- Concordia University — SuccessFactors https://career17.sapsf.com/career?company=universitc (hub: https://www.concordia.ca/hr/jobs/openings.html)
- Université Laval — https://www.rh.ulaval.ca/emplois-disponibles (custom RH/HCM)
- UQAM — Workland staff (hub: https://rh.uqam.ca/emplois/); student board https://emplois.uqam.ca/
- Université de Sherbrooke — https://www.usherbrooke.ca/emplois/offres
- École de technologie supérieure — Taleo https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=ETS&cws=37
- HEC Montréal — https://emplois-admin.hec.ca/ (some tracks Taleo)
- Polytechnique Montréal — https://www.polymtl.ca/carriere/offres-demploi
- Université du Québec à Trois-Rivières — Oracle portal https://oraprdnt.uqtr.uquebec.ca/portail/gscw030?owa_no_site=728
- Université du Québec à Chicoutimi — https://www.uqac.ca/emploi/
- Université du Québec en Outaouais — Workland https://atlas.workland.com/careers/uqo/jobs (faculty separate on uqo.ca)
- Bishop's University — https://working.ubishops.ca/

### Cégeps (sample — high enrollment)

- Cégep du Vieux Montréal — Workland https://atlas.workland.com/careers/cvm/jobs
- Collège Ahuntsic — Workland https://atlas.workland.com/careers/collegeahuntsic
- Collège de Maisonneuve — Manitou https://app.manitousolution.com/libreservice/index.html?customer=120049&lang=fr (hub: https://www.cmaisonneuve.qc.ca/emploi/)
- Dawson College — Workland https://atlas.workland.com/careers/dawsoncollege/jobs
- Vanier College — https://careers.vaniercollege.qc.ca/en/annonces
- Cégep de Sainte-Foy — Workland https://atlas.workland.com/careers/csfoy
- Cégep de Limoilou — TalentSoft https://cegeplimoilou-career.talent-soft.com/offre-de-emploi/liste-offres.aspx
- Cégep de Sherbrooke — Workland https://atlas.workland.com/careers/cegepsherbrooke

## Canada — additional public universities and colleges (names only)

### British Columbia

- Simon Fraser University — https://www.sfu.ca/human-resources/join-SFU.html (Taleo; 32 jobs stored in manual run 30725902033)
- University of Northern British Columbia — https://unbc.njoyn.com/CL/xweb/Xweb.asp?clid=125926&page=joblisting (Njoyn; faculty, staff, and executive links use this tenant; staged in manual batch engine-ready-11)
- Thompson Rivers University — https://tru.hua.hrsmart.com/hr/ats/JobSearch/viewAll (HRSmart; the university's careers page sends faculty/staff applicants to this portal; staged in manual batch engine-ready-11)
- Royal Roads University — https://royalroads.mua.hrdepartment.com/hr/ats/JobSearch/viewAll (HRSmart; seven current postings; staged in manual batch engine-ready-11)
- Vancouver Island University — https://careers.viu.ca/vacancies.html (custom vacancy page with filters; no per-job links were exposed in the accessible page text; needs custom inspection)
- Kwantlen Polytechnic University — https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?cws=37&org=JT63GS (Taleo; 47 jobs stored from 49 discovered in manual run 30725674862)
- British Columbia Institute of Technology — https://careers.bcit.ca/postings/search (PeopleAdmin-style board with 46 current postings; tracked in issue #77)
- Douglas College — https://www.douglascollegecareers.ca/postings/search (PeopleAdmin-style board with 3 current postings; tracked in issue #77)
- Camosun College — https://camosun.ca/about/working-camosun (PeopleAdmin board at https://camosun.peopleadmin.ca/postings/search; use issue #77)
- Okanagan College — https://www.okanagancollege.ca/people-services (staff postings use a public Lever board at https://jobs.lever.co/okanagan; no Lever engine yet; student jobs are also mixed into the board)
- College of New Caledonia — https://cnc.bc.ca/jobs (PeopleAdmin board at https://cnc.peopleadmin.ca/postings/search; use issue #77)
- College of the Rockies — https://cotr.bc.ca/about-us/careers (public postings use PrevueAPS at https://cotr.prevueaps.ca; no matching engine yet)
- Selkirk College — https://selkirk.ca/about-selkirk/careers (external postings use a custom portal at https://careers.selkirk.ca/vacancies.html with filters and client-rendered results; no matching engine yet)
- North Island College — https://www.nic.bc.ca/about-us/employment-opportunities/ (PeopleAdmin-style board at https://careers.nic.bc.ca/postings/search; use issue #77)
- North Island College — https://www.nic.bc.ca/about-us/careers/
- Nicola Valley Institute of Technology — https://www.nvit.bc.ca/careers/

### Alberta

- Athabasca University — https://www.athabascau.ca/about-au/careers.html
- Mount Royal University — https://www.mtroyal.ca/AboutMountRoyal/Careers/
- MacEwan University — https://www.macewan.ca/about-macewan/careers/
- SAIT — https://www.sait.ca/about-sait/careers
- NAIT — https://www.nait.ca/nait/about/careers
- Bow Valley College — https://bowvalleycollege.ca/about-us/careers
- NorQuest College — https://www.norquest.ca/about-us/careers
- Red Deer Polytechnic — https://rdpolytech.ca/careers
- Lethbridge Polytechnic — https://lethpolytech.ca/careers
- Medicine Hat College — https://www.mhc.ca/about-us/careers
- Keyano College — https://www.keyano.ca/about-us/careers/
- Northern Lakes College — https://www.northernlakescollege.ca/careers
- Northwestern Polytechnic — https://www.nwpolytech.ca/careers

### Saskatchewan

- Saskatchewan Polytechnic — https://saskpolytech.ca/about/careers.aspx
- Saskatchewan Indian Institute of Technologies — https://siit.ca/about-us/careers/

### Atlantic Canada

- Memorial University of Newfoundland — https://www.mun.ca/hr/careers/
- University of Prince Edward Island — https://www.upei.ca/careers
- Mount Allison University — https://mta.ca/about/working-at-mta
- St. Francis Xavier University — https://www.stfx.ca/about/offices/human-resources/careers
- Acadia University — https://www2.acadiau.ca/about-acadia/employment.html
- Cape Breton University — https://www.cbu.ca/about-cbu/careers/
- Nova Scotia Community College — https://www.nscc.ca/about-us/careers/
- New Brunswick Community College — https://www.nbcc.ca/about-us/careers
- Holland College — https://www.hollandcollege.com/about/employment-opportunities.html
- College of the North Atlantic — https://www.cna.nl.ca/careers/

### Northern Canada

- Yukon University — https://www.yukonu.ca/about/careers
- Aurora College — https://www.auroracollege.nt.ca/about/careers
- Nunavut Arctic College — https://www.arcticcollege.ca/careers

## Manitoba — names only (URL TBD)

English-speaking, so no translation-handling gap like the Quebec set above — prioritize this province before deeper Quebec work.

### Provincial & municipal

- Government of Manitoba — https://jobsearch.gov.mb.ca/search.action (legacy e-recruit; structure closer to OPS custom than Jobs2Web)
- City of Winnipeg — moved to "Engine ready" above (PeopleSoft Fluid, URL confirmed 2026-07-12)
- City of Brandon — promoted to active 2026-07-12 (Dayforce)
- City of Steinbach — https://www.steinbach.ca/departments-and-services/careers-with-the-city-of-steinbach/ (PDF/email application only; no public ATS)
- City of Portage la Prairie — https://www.city-plap.com/council-administration/careers/ (CMS + PDF/email; no ATS)
- City of Thompson — https://cityofthompson.applytojobs.ca/ (ApplyToJobs; hub: https://www.thompson.ca/p/job-opportunities)
- City of Selkirk — https://cityofselkirk.myavanti.ca/careers (Avanti; use existing engine)
- City of Winkler — https://www.cityofwinkler.ca/p/employment (CMS/email; site fragile)
- City of Morden — https://morden.ca/employment (CMS/email)

### Crown corporations & agencies

- Manitoba Hydro — https://www.hydro.mb.ca/careers/ (current postings link to `careers.hydro.mb.ca`, an SAP Web Dynpro board rather than the supported SuccessFactors layout; tracked in issue #99)
- Manitoba Public Insurance (MPI) — https://www.mpi.mb.ca/careers/ (current openings link to `careers-mpi.icims.com`; use the existing iCIMS engine)
- Manitoba Liquor & Lotteries — https://gjobs.neogov.ca/careers/mbll/ (NEOGOV; use engine from issue #74)
- Shared Health Manitoba (provincial health authority) — https://careers.wrha.mb.ca/ (shared SuccessFactors board; 25 jobs stored in manual run 30725674862; source attribution still needs confirmation across the shared Manitoba health employers)
- Manitoba Housing — https://www.gov.mb.ca/housing/careers/job_opportunities.html (currently no openings; page points other roles to the Government of Manitoba portal, so do not create a separate source until a Manitoba Housing posting appears)
- CentreVenture (Winnipeg downtown development corp) — no standing careers board; ad-hoc LinkedIn/news posts only

### Universities & colleges

- University of Winnipeg — https://www.uwinnipeg.ca/hr/employment.html (official page links to the NorthStar ATS board at https://www.northstarats.com/University-of-Winnipeg; stable popup detail URLs, tracked in issue #91)
- Brandon University — https://www.brandonu.ca/jobs/ (server-rendered grouped listings with direct detail links and separate student/support/faculty categories; candidate for the shared custom HTML work in issue #79)
- Université de Saint-Boniface — https://carrieres.ustboniface.ca/ (Dayforce board at `jobs.dayforcehcm.com`; the board exposes 9 unique postings—the prior 18-count included duplicate title/“Learn more” links; detail handling fixed in issue #92)
- Canadian Mennonite University — https://www.cmu.ca/about/employment (CMS/email per posting)
- Red River College Polytechnic — https://careers.rrc.ca/ (VIP Cloud; hub: https://www.rrc.ca/hr/work/employment-opportunities/ — issue #96 VIP investigation)
- Assiniboine Community College — https://assiniboine.net/community/employment/working-assiniboine/career-opportunities (CMS/email)
- University College of the North — https://ucn.ca/careers/ (CMS/email + forms)

### Transit, police & libraries

- Winnipeg Transit — apply via City of Winnipeg PeopleSoft (already active); hub https://info.winnipegtransit.com/en/careers/careers-with-winnipeg-transit — do not create a separate transit source
- Winnipeg Police Service — recruitment hub https://www.winnipeg.ca/police/recruitment · applications via City of Winnipeg PeopleSoft (already active)
- Winnipeg Public Library — directs to City of Winnipeg Careers (already active)

### School divisions (major only)

- Winnipeg School Division — ApplyToEducation https://winnipegsd.simplication.com/ (hub: https://www.winnipegsd.ca/careers)
- Pembina Trails School Division — https://pembinatrails.tedk12.ca/hire/index.aspx (PowerSchool/AppliTrack; hub: https://www.pembinatrails.ca/careers)
- Louis Riel School Division — external https://www.lrsd.net/job-postings-for-external-candidates
- Seven Oaks School Division — ApplyToEducation https://7oaks.simplication.com/ (hub: https://www.7oaks.org/careers)
- River East Transcona School Division — CIMS JobConnect https://retsd.cims-epic.ca/JobConnect/JobList.aspx (hub: https://www.retsd.mb.ca/careers)
- St. James-Assiniboia School Division — https://www.sjasd.ca/Employment/Pages/default.aspx (Formsite/CMS split teaching vs non-teaching)

---

## Deep-dive research — net-new boards (2026-08-02)

Gap research against active `SOURCES.md` + existing PENDING entries. **Only sources that were missing or names-only without a usable apply URL.** Skipped: Alberta GoA Jobs2Web (already staged), BC Public Service HRSmart (already staged), Calgary/Sudbury/Halifax/Saskatoon/TransLink/BC Transit PeopleSoft-Jobs2Web tenants already listed above, Edmonton Phenom (issue #81 via ETS line), VIA Rail / most ON mid-size munis already in the Ontario section.

Platform guesses are from public URL patterns, not verified scrapes.

### Provincial & territorial public service portals

Highest-value white space — full civil-service boards outside OPS/GC Jobs.

- **Government of Saskatchewan** — https://careers.saskatchewan.ca/?sortBy=POSTING_DATES_DESC#en/sites/CX_1/ (Oracle HCM Cloud CX; ~12k public service). Hub: https://www.saskatchewan.ca/residents/jobs-working-and-training/careers-in-the-saskatchewan-public-service/find-and-apply-for-jobs
- **Government of Nova Scotia** — https://jobs.novascotia.ca/go/All-Opportunities/502817/ (Jobs2Web / SuccessFactors-style; 70+ public postings typical). Hub: https://jobs.novascotia.ca/
- **Government of New Brunswick** — https://emgi.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs (Oracle HCM Cloud; new primary board). Legacy list still at https://www.ere.gnb.ca/competition.aspx — prefer Oracle once confirmed complete.
- **Government of Newfoundland and Labrador** — https://www.hiring.gov.nl.ca/public-jobs (custom Strategic Staffing / e-recruit portal)
- **Government of Prince Edward Island** — PeopleSoft Fluid external: https://psgateway.gov.pe.ca/psc/PSPROD92/EXTERNAL/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&SiteId=4 · public hub JobsPEI: https://jobspei.ca/ (also routes health + Public Schools Branch)
- **Government of Yukon** — https://yukongovernment.hua.hrsmart.com/hr/ats/JobSearch/viewAll (HRSmart; use existing engine). Hub: https://yukon.ca/en/view-all-current-job-postings
- **Government of Northwest Territories (GNWT)** — https://www.gov.nt.ca/careers/en/search/job (custom Drupal-fronted board; ~100 concurrent posts typical)
- **Government of Nunavut** — https://www.gov.nu.ca/en/careers/jobs (custom territorial board; EN + Inuktitut)
- **Government of Manitoba** *(was names-only)* — https://jobsearch.gov.mb.ca/search.action (legacy e-recruit; structure closer to OPS custom than Jobs2Web)

*Already staged elsewhere in this file (do not re-add as new work): BC Public Service HRSmart, Alberta Jobs2Web (`jobpostings.alberta.ca`), Québec fonction publique names-only section, OPS + GC Jobs active.*

### Large municipalities (not already detailed)

- **City of Surrey** — https://careers.surrey.ca/psc/CAREERS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant (PeopleSoft Fluid; BC’s 2nd-largest city, ~27 concurrent jobs observed). Engine already built.
- **City of Burnaby** — https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=CITYBURNABY&cws=37 (Taleo; 40+ posts typical). Use existing Taleo engine.
- **City of Regina** — https://jobs.regina.ca/ (Jobs2Web; was only referenced under Regina Transit). Label source as City of Regina (includes transit when posted).
- **City of Lethbridge** — Taleo live: https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=COLBRIDGE&cws=37 (hub: https://www.lethbridge.ca/careers/; secondary board also at https://careers.lethbridge.ca/). Do not add a separate library source.
- **City of Medicine Hat** — https://medicinehat.prevueaps.ca/jobs/ (Prevue APS; same family as College of the Rockies — issue #84)
- **City of Coquitlam** — hub https://www.coquitlam.ca/414/Career-Opportunities → external Cegid/TalentSoft apply (sessionized from hub); internal https://internalcareers.coquitlam.ca/
- **City of Kelowna** — https://careeropportunities.kelowna.ca/postings/search (PeopleAdmin-style `/postings/<id>`; use issue #77)
- **City of Chilliwack** — https://jobs.chilliwack.com/ (custom municipal board)
- **City of Moncton** — https://www.moncton.ca/en/careers (ADP Workforce Now career centre; Codiac Transpo is city-board only — do not split transit)
- **City of Edmonton** — already tracked as Phenom People in issue #81 (`https://recruitment.edmonton.ca/`); elevating here so it is not only under the ETS transit bullet. Residual Taleo: `edmonton.taleo.net` may still appear in older links.
- **City of Airdrie** — Njoyn https://clients.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&CLID=61430 (was the “unidentified” CLID=61430)
- **City of Grande Prairie** — https://cityofgp.startdate.ca/ (StartDate; hub: https://cityofgp.com/city-government/working-city/career-opportunities)
- **City of Nanaimo** — https://www.nanaimo.ca/your-government/careers (PDF + email only; no ATS)
- **City of Kamloops** — HRSmart https://kamloops.hua.hrsmart.com/hr/ats/JobSearch/index (hub: https://www.kamloops.ca/city-hall/career-opportunities)
- **City of Prince George** — Prevue APS https://princegeorgejobs.prevueaps.ca/jobs/ (hub: https://www.princegeorge.ca/city-hall/careers)
- **Township of Langley** — Njoyn https://tol.njoyn.com/CL3/xweb/xweb.asp?page=joblisting&CLID=56677 (main Langley-area board; City of Langley itself is thin CMS)
- **City of Maple Ridge** — HiringPlatform https://mapleridge.hiringplatform.ca/list/external (same family as Orillia — issue #87)
- **City of Delta** — Taleo https://tre.tbe.taleo.net/tre01/ats/careers/v2/jobSearch?org=XNZ8Q7&cws=37
- **City of Richmond (BC)** — Taleo https://tre.tbe.taleo.net/tre01/ats/careers/v2/searchResults?org=TRQS8M&cws=37 (brand hub: https://chooserichmond.ca/)
- **City of St. John's** — Njoyn https://cityofstjohns.njoyn.com/CL4/xweb/Xweb.asp?CLID=73617&page=joblisting&lang=1
- **City of Saint John** — Njoyn https://clients.njoyn.com/CL2/xweb/xweb.asp?page=joblisting&CLID=51331
- **City of Fredericton** — Oracle Cloud https://eihe.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs
- **City of Charlottetown** — https://www.charlottetown.ca/employment (PDF + email; no ATS)
- **City of Whitehorse** — HRDepartment https://whitehorse.mua.hrdepartment.com/hr/ats/JobSearch/viewAll (HRSmart-family)
- **City of Yellowknife** — Prevue APS https://yellowknife.prevueaps.ca/

*Already in PENDING/ACTIVE: Calgary PeopleSoft, Winnipeg PeopleSoft, Vancouver Jobs2Web, Victoria iCIMS, Halifax BrassRing, Saskatoon Jobs2Web, Greater Sudbury PeopleSoft, Abbotsford Njoyn, Montréal complex, most GTHA munis.*

### Federal crowns & agencies outside GC Jobs

GC Jobs covers most departments; these run **separate** boards at scale.

- **Canada Post** — https://jobs.canadapost.ca/go/Canada-Post-All-Current-Opportunities/2319117/ (Jobs2Web; often 500–1000+ open roles nationwide)
- **Bank of Canada** — https://careers.bankofcanada.ca/go/All-Job-Opportunities/2400817/ (Jobs2Web)
- **NAV CANADA** — https://navcanada.wd10.myworkdayjobs.com/NAV_Careers (Workday; air navigation — not Transport Canada / GC Jobs)
- **CBC / Radio-Canada** — hub https://cbc.radio-canada.ca/en/working-with-us/jobs · Workday https://cbcrc.wd3.myworkdayjobs.com/CBC_Radio-Canada_Jobs (confirm tenant still live; crown corporation, not GC Jobs)
- **Export Development Canada (EDC)** — https://apply.workable.com/export-development-canada/?lng=en (Workable; confirmed; same family as Norfolk County issue #93)
- **Farm Credit Canada (FCC)** — Workday https://fccfac.wd3.myworkdayjobs.com/en-US/careers-carrieres (hub: https://www.fcc-fac.ca/en/about-fcc/careers)
- **CFMWS (Canadian Forces Morale and Welfare Services)** — https://cfmws.recruitmentplatform.com/ (hub: https://cfmws.ca/about-us/cfmws-careers)
- **House of Commons (admin/staff)** — SmartRecruiters https://careers.smartrecruiters.com/HouseOfCommonsCanadaChambreDesCommunesCanada (hub: https://www.ourcommons.ca/en/employment/current-opportunities; MP office roles are separate email postings)

### Western / Atlantic crown utilities & agencies

- **BC Hydro** — SAP e-Recruit Web Dynpro: https://app.bchydro.com/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search?sap-wd-configId=ZHRRCF_A_UNREG_JOB_SEARCH&sap-theme=sap_belize&saml2=disabled# (same hard platform class as Manitoba Hydro issue #99)
- **ICBC** — https://careers.icbc.com/go/All-Current-Job-Opportunities/2681517/ (Jobs2Web)
- **SaskPower** — https://jobs.saskpower.com/search/?q (Jobs2Web)
- **SaskTel** — https://jobs.sasktel.com/go/Current-Opportunities/2684517/ (Jobs2Web; SuccessFactors alerts also referenced)
- **SGI (Saskatchewan Government Insurance)** — https://sgico.wd10.myworkdayjobs.com/en-US/sgi (Workday)
- **NB Power** — https://www.careers.nbpower.com/psc/prod/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=2 (PeopleSoft Fluid; engine ready)
- **Ontario Power Generation** *(was names-only)* — https://jobs.opg.com/go/View-All-Jobs/2398117/ (Jobs2Web; note mid-2026 recruitment-system transition may pause posts)
- **Bruce Power** — https://brucepower.wd3.myworkdayjobs.com/BrucePower (Workday; major ON nuclear operator, not OPS)

*Already staged: Hydro One, Toronto Hydro, Hydro Ottawa, LCBO, OLG, WSIB, Ontario Health, PHO, IESO, OEB, OCWA, Manitoba Hydro (SAP), MPI (iCIMS), Shared Health MB.*

### Provincial health authorities (public boards)

Large volume; separate from municipal/provincial civil service. Scope call if/when health is in product scope.

- **Alberta Health Services (AHS)** — https://careers.albertahealthservices.ca/ (Taleo historically; very high volume province-wide)
- **Fraser Health** — https://jobs.fraserhealth.ca/ · iCIMS pattern `jd-fraserhealth.icims.com` (use existing iCIMS engine if confirmed)
- **Vancouver Coastal Health** — https://careers-vch.icims.com/jobs/intro (iCIMS)
- **Island Health** — https://islandhealth.hua.hrsmart.com/hr/ats/JobSearch/index (HRSmart; hub https://careers.islandhealth.ca/)
- **Interior Health** — https://jobs.interiorhealth.ca/ (custom modern portal)
- **PHSA (Provincial Health Services Authority)** — https://jobs.phsa.ca/ (BC specialty / provincial services)
- **Nova Scotia Health** — https://jobs.nshealth.ca/ (paired with NS public service above)

### Ontario — URL upgrades for names-only + mid-tier gaps

#### Police / school boards / libraries

Moved full URLs into the Ontario “Police services” and “School boards” sections above (2026-08-02). Summary: TPS/Peel PeopleSoft, YRP Jobs2Web, Ottawa Police City Jobs2Web, OPP constable custom + civilian OPS; most DSBs are ApplyToEducation `*.simplication.com` (TVDSB = Knighthunter; PDSB = in-house careers/list).

- **Richmond Hill Public Library** — apply via City of Richmond Hill Jobs2Web library category https://jobs.richmondhill.ca/go/Richmond-Hill-Public-Library/2617617/ (city source already active; label as including library)

#### Municipal / regional gaps (Ontario mid-tier)

- **District of Muskoka** — https://www.muskoka.on.ca/en/careers-and-volunteering/career-oportunities.aspx (confirm live ATS from district page)
- **Oxford County** — https://www.oxfordcounty.ca/your-government/career-opportunities (server-rendered / county board; candidate for shared municipal custom issue #86)

### Platform patterns unlocked by this pass

| Platform | New candidates | Engine status |
|---|---|---|
| **Oracle HCM Cloud** | SK public service, NB public service | Existing Oracle engine (validate CX site paths) |
| **PeopleSoft Fluid** | Surrey, NB Power, PEI | Engine built (Winnipeg/TransLink proven) |
| **Jobs2Web** | Canada Post, Bank of Canada, ICBC, SaskPower, SaskTel, NS, OPG | Engine ready |
| **Workday** | NAV CANADA, SGI, Bruce Power, CBC (confirm) | Engine ready |
| **Taleo** | Burnaby, AHS, Lethbridge (confirm) | Engine ready |
| **HRSmart** | Yukon, Island Health | Engine ready (selector work still open on some tenants) |
| **iCIMS** | Fraser Health, VCH | Engine ready |
| **Prevue APS** | Medicine Hat (+ College of the Rockies) | Issue #84 |
| **PeopleAdmin** | Kelowna | Issue #77 |
| **Workable** | EDC (+ Norfolk) | Issue #93 |
| **SAP e-Recruit / Web Dynpro** | BC Hydro (+ Manitoba Hydro) | Issue #99 |
| **ApplyToEducation / Simplication** | YRDSB + most ON school boards | **No engine yet** |
| **Custom / Drupal** | NL hiring.gov.nl.ca, GNWT, Nunavut, Chilliwack, Muskoka | Custom / new investigation |

### Suggested priority order (scrape-ready first)

1. **Jobs2Web batch:** Canada Post, Bank of Canada, ICBC, SaskPower, SaskTel, NS public service, OPG  
2. **PeopleSoft batch:** City of Surrey, NB Power, PEI public service  
3. **Workday batch:** NAV CANADA, SGI, Bruce Power  
4. **Oracle HCM:** Saskatchewan + New Brunswick public service  
5. **Taleo:** City of Burnaby (+ AHS if health is in scope)  
6. **HRSmart:** Yukon (+ Island Health if health is in scope)  
7. **New engines only when needed:** ApplyToEducation (school boards), Phenom (Edmonton #81), Prevue, SAP Web Dynpro  

### Explicitly not re-listed

Alberta GoA, BC Public Service, Calgary, Winnipeg, Vancouver, Victoria, Halifax BrassRing, TransLink, BC Transit, Saskatoon Jobs2Web, Greater Sudbury, most GTHA/Ontario PENDING munis-colleges-unis, Québec names-only section, Manitoba city names, Edmonton Phenom (issue #81).
