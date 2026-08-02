# Pending Sources

Sources that have been identified but are not yet scraped, with notes on why.

Last synced with scraper/scraper.ts: 2026-07-06  
Names-only backlog expanded: 2026-07-12 (no URL research yet). Manitoba added 2026-07-12 as the first out-of-province expansion — English-speaking, no French-parsing gap.

## Needs a new engine

*(none currently)*

## Engine ready, URL needed

Grouped by platform, same convention as `SOURCES.md` — that's the axis that determines how much shared engine work unlocks at once.

### PeopleSoft Fluid (engine built, 1/8 tenants working — see issue #37)

**Engine built 2026-07-12** (`scraper/engines/peoplesoft.ts`) — click-and-walk pattern (click first result, use the page's own "Next Job" control to walk the rest, since there are no real per-job URLs on this platform — every link is a `javascript:submitAction_win0(...)` postback). **City of Winnipeg confirmed working end-to-end (29/29). TransLink confirmed working end-to-end (90/90 stored in manual run 30726059105).** The other 7 tenants still need validation.

- Toronto Metropolitan University — https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- Western University — https://recruit.uwo.ca/psc/hrprdwebER/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U (staged in the Trial Action)
- McMaster University — https://careers.mcmaster.ca/psp/prcsprd/EMPLOYEE/HRMS/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1001&customTab=MCM_STAFF_POS&IgnoreParamTempl=customTab
- City of Greater Sudbury — https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U
- City of Calgary — https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=1
- Durham Region — https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=3 (already active in production via a broken bespoke `scrapeDurhamRegion` scraper predating this platform migration — needs the same search-click fix before it can switch over to `scrapePeopleSoft`)

### HRSmart (existing engine, needs selector work)

- BC Public Service — https://bcpublicservice.hua.hrsmart.com/hr/ats/JobSearch/search (staged in the Trial Action)
- Simcoe County — https://simcoe.hua.hrsmart.com/hr/ats/JobSearch/viewAll
- University of Victoria — https://uvic.mua.hrdepartment.com/hr/ats/JobSearch/viewAll (staged in the Trial Action)

  **Tried 2026-07-12, inconclusive.** Page title loads ("Career Opportunities") but the York Region-style selector guess found 0 links — haven't confirmed the actual selector this tenant uses yet, may just need the real DOM inspected rather than guessed.

### BrassRing / Kenexa (no engine, one confirmed-clean tenant)

- Halifax Regional Municipality — https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25749&siteid=5764

  **Found 2026-07-12.** Real, clean job links confirmed (e.g. "Project Manager, Transit Infrastructure" → `.../HomeWithPreLoad?...&jobid=770720`). New portal type, no engine yet, but looks tractable — normal `<a href>` links with a `jobid` query param, not a postback-only pattern like PeopleSoft.

### Njoyn (existing engine, one confirmed-blocked tenant)

- Unidentified Njoyn tenant (CLID=61430) — blocked by Radware bot-protection captcha before the entity name could even be confirmed. Same dead-end as Toronto Public Library — not fixable without CAPTCHA bypass, which is out of scope.

### Jobs2Web (existing engine, detail-page render bug — confirmed on 3 tenants)

**Confirmed 2026-07-12 on three separate tenants**, so this is a real engine-level pattern, not a one-off: job discovery (search results page) works fine on all three, but detail pages render client-side slower than tenants like CMHC/Vancouver/Brampton — the standard ~2s post-load buffer captures a literal "Loading..." placeholder instead of the actual job text. Confirmed via direct `raw_text` inspection (searched for the string `"Loading..."` in stored content, not just eyeballing a snippet — a snippet-only check gave a false positive earlier on University of Toronto, which turned out fine on full-text inspection). Tried polling for text-length stabilization (up to 5s extra) — did not help; the content genuinely never finishes loading within a reasonable window, so this needs a different approach (a specific wait-for-selector on real content, or investigating why these particular tenants hang) rather than "wait longer."

- City of Ottawa — https://jobs-emplois.ottawa.ca/city-jobs/search/ — note: production already has a separate "City of Ottawa" source via SuccessFactors (`career47.sapsf.com`, currently broken — see issue #32) — worth confirming these are genuinely two different systems and not a portal migration, so we don't end up double-listing the same jobs under one source name once both work.
- City of Saskatoon — https://careers.saskatoon.ca/search/ (pending trial validation)
- BC Transit — https://jobs.bctransit.com/search/ — job discovery confirmed (6 real jobs), detail pages stuck on "Loading...".
- Regional Municipality of Wood Buffalo — https://jobs.rmwb.ca/search/ — job discovery confirmed (82 real jobs across 2 pages), detail pages stuck on "Loading...".
- Government of Alberta — https://jobpostings.alberta.ca/go/All-Jobs-GoA/2617217/ — 139 current public-service jobs; staged in the Trial Action using the existing Jobs2Web engine.

### Technomedia (no engine)

- York University — https://jobs-ca.technomedia.com/yorkuniversity/

### NEOGOV (no engine)

- Cambrian College — https://gjobs.neogov.ca/careers/cambriancollege

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
- Niagara Region — https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?FOCUS=Applicant&Siteid=1002 (PeopleSoft; portal returned an upstream error during verification)
- Simcoe County
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

- Toronto Public Library (re-enable; previously disabled for bot protection)
- BWG Public Library — https://bwg.njoyn.com/CL/xweb/Xweb.asp?CLID=126454&page=joblisting (separate Njoyn board linked from the Town careers page; Actions stored 0; browser-specific investigation in issue #94)
- Ottawa Public Library — https://about.biblioottawalibrary.ca/en/jobs-ottawa-public-library (links into the City of Ottawa Jobs2Web board; do not create a separate portal engine)
- Mississauga Library System — https://www.mississauga.ca/library/library-jobs-and-volunteer/ (links into the existing City of Mississauga Jobs2Web board; city source should be labelled as including library jobs)
- London Public Library (UltiPro; staged in manual batch engine-ready-11)
- Markham Public Library — https://markhampubliclibrary.ca/employment/ (current postings are direct PDFs; tracked with the PDF/form sources in issue #75)
- Oakville Public Library (Taleo; staged in manual batch engine-ready-11)
- Burlington Public Library — https://www.bpl.on.ca/about/careers (no current posting links found in the page HTML; needs a current source URL)
- Richmond Hill Public Library
- Kitchener Public Library
- Waterloo Public Library
- Guelph Public Library

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

- Ontario Power Generation
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

- OC Transpo
- MiWay
- York Region Transit
- Durham Region Transit
- Brampton Transit
- Grand River Transit
- Hamilton Street Railway

### Additional Canadian public transit agencies — names only

#### Alberta

- Calgary Transit — https://www.calgary.ca/careers/transit.html (roles are included in the City of Calgary PeopleSoft board; do not add a separate transit source)
- Edmonton Transit Service — https://recruitment.edmonton.ca/ (roles are included in the City of Edmonton Phenom People portal; tracked in issue #81)
- Strathcona Transit — https://www.strathcona.ca/council-county/careers/ (current transit posting is a server-rendered Strathcona County detail page; use the shared custom HTML investigation in issue #79, and label the source as including Strathcona Transit)
- Red Deer Transit — https://www.reddeer.ca/careers/ (city-wide careers board; original URL is stale)
- Lethbridge Transit — https://www.lethbridge.ca/careers/ (city-wide careers board; original URL is stale)
- Grande Prairie Transit — https://cityofgp.com/city-government/working-city/job-postings (city-wide careers board; original URL is stale)

#### Saskatchewan

- Saskatoon Transit — city-wide careers board URL needs correction; the listed `/city-hall/careers` URL currently returns 404
- Regina Transit — https://jobs.regina.ca/ (roles are included in the City of Regina Jobs2Web board; do not add a separate transit source)
- Prince Albert Transit — https://www.citypa.ca/en/city-hall/careers.aspx (official site exposes a general Jobs link, but this exact careers URL was not confirmed as a live posting board; verify the current destination before choosing an engine)

#### Québec

- Société de transport de Sherbrooke — https://www.sts.qc.ca/carrieres/emplois-disponibles/ (official employment page currently says there are no postings; future jobs appear on this page, so recheck before adding an engine)
- Société de transport de l'Outaouais (STO) — https://www.sto.ca/carrieres/ (official careers page has a live “view job offers” path, but the destination/portal was not exposed in the accessible result; inspect that link before choosing an engine)
- Société de transport du Saguenay — https://stsaguenay.com/emplois/
- Société de transport de Lévis — https://www.stlevis.ca/emplois

#### Atlantic Canada

- Halifax Transit — https://www.halifax.ca/about-halifax/employment (city-wide careers board; original URL is stale)
- Saint John Transit — city-wide careers board URL needs correction; the listed careers URL currently returns 404
- Fredericton Transit — https://www.fredericton.ca/city-government/careers (city-wide careers board; original URL redirects here)
- Codiac Transpo — https://www.moncton.ca/en/city-hall/careers
- Charlottetown Transit — https://www.charlottetown.ca/city_hall/careers
- Metrobus St. John's — https://www.stjohns.ca/your-government/careers/ (city-wide careers board; original URL redirects here)

#### Northern Canada

- Whitehorse Transit — https://www.whitehorse.ca/city-hall/careers/ (currently redirects to a careers event page, not a job listing)
- Yellowknife Transit — https://www.yellowknife.ca/jobs (city-wide careers board; original URL is stale)

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

- University of Calgary — https://careers.ucalgary.ca/
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

- University of Saskatchewan — https://jobs.usask.ca/
- University of Regina — https://www.uregina.ca/career-opportunities/
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

- Manitoba Hydro — https://www.hydro.mb.ca/careers/ (current postings link to `careers.hydro.mb.ca`, an SAP Web Dynpro board rather than the supported SuccessFactors layout; tracked in issue #99)
- Manitoba Public Insurance (MPI) — https://www.mpi.mb.ca/careers/ (current openings link to `careers-mpi.icims.com`; use the existing iCIMS engine)
- Manitoba Liquor & Lotteries
- Shared Health Manitoba (provincial health authority) — https://careers.wrha.mb.ca/ (shared SuccessFactors board; 25 jobs stored in manual run 30725674862; source attribution still needs confirmation across the shared Manitoba health employers)
- Manitoba Housing — https://www.gov.mb.ca/housing/careers/job_opportunities.html (currently no openings; page points other roles to the Government of Manitoba portal, so do not create a separate source until a Manitoba Housing posting appears)
- CentreVenture (Winnipeg downtown development corp)

### Universities & colleges

- University of Manitoba — https://umanitoba.ca/careers/ (faculty, staff, student, and trades links all point to the `viprecprod.ad.umanitoba.ca` career portal; initial HTML only shows a browser-check/loading shell, so inspect its browser network/API before choosing an engine)
- University of Winnipeg — https://www.uwinnipeg.ca/hr/employment.html (official page links to the NorthStar ATS board at https://www.northstarats.com/University-of-Winnipeg; stable popup detail URLs, tracked in issue #91)
- Brandon University — https://www.brandonu.ca/jobs/ (server-rendered grouped listings with direct detail links and separate student/support/faculty categories; candidate for the shared custom HTML work in issue #79)
- Université de Saint-Boniface — https://carrieres.ustboniface.ca/ (Dayforce board at `jobs.dayforcehcm.com`; trial discovered 18 listings but stored only 5 because several detail links redirect to old or unrelated pages; tracked in issue #92)
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
