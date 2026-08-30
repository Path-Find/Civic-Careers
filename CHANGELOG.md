# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Ontario’s Radware challenge is now recognized after search as well as on initial load, so a blocked board is reported as blocked instead of a misleading empty scrape failure.
- Empty source boards that explicitly report no openings now complete successfully while safely retiring their old listings, so a legitimate zero-job source no longer turns the full scrape red.
- Refactored the parsing pipeline around one shared per-job flow with quality gating, recorded rule provenance, and centralized parse finalization — so normal parsing and deterministic backfills persist closing metadata and promotion state the same way — and began isolating employer-specific parser rules into their own source modules (starting with the University of Ottawa) and its backfills onto the same raw-text-aware scoped title rules used by fresh parsing, so a fix for one employer stays scoped, auditable, and consistent across both paths.
- Reorganized the filters sidebar: Location, Employer, and Area of study controls now sit below their search inputs, Area of study is its own section instead of nested under Education, the location and employer filters were simplified with aligned search controls, unrequested explanatory sentences were removed, and the saved-jobs filter explanation moved beneath the Filters heading instead of sitting below the job list.
- Standardized salary and location displays: salaries now show as a clean `$min-$max period` string in one consistent format with expanded shorthand qualifiers (`hr`, `wk`, `yr`), unnecessary `.00` decimals and stale unqualified fallbacks removed, and locations display city-first in compact form (e.g. `$52K–$67K/year`).
- Simplified public job reports into plain-language issue categories, added the live page plus current recorded details and both the internal and source job IDs to the prefilled GitHub report so duplicate reports are easier to recognize, and the dialog now explains whether GitHub opened successfully.
- Removed redundant UI copy — an unsolicited results-link control, redundant empty-results text, and the “Showing jobs closing within 14 days” sentence once the deadline control already communicates the active view.
- Kept Career stage as a sidebar filter without displaying “Student” as a job-detail metadata field.
- Limited company job-title suggestions to titles shared by at least three available jobs.
- Deadline extraction and recovery substantially improved over several passes — explicit open-until-filled jobs are publicly visible without requiring a calendar date; more application-close, expiration, competition-close, and internal/external closing labels are recognized and recovered safely; soft-parsed deadlines survive scraper refreshes instead of being erased by a temporary extractor miss; unreachable source pages (bot challenges, expired pages, non-rendering portals) can be marked blocked so they stop looping through recovery batches while staying hidden from public listings; and source-backed hidden jobs can be re-queued with recovered deadlines or Open Until Filled status, retaining their parsed data and pending-details state.
- Automated DeepSeek parsing and AI backfills are paused by default — jobs can be parsed manually in Codex without an accidental provider call.
- Migrated active/expired job storage to Neon with a tested, safe rollout: current jobs stay in the live database while expired jobs move to a separate Neon archive database (reducing Turso reads without an R2 handoff); operational backfills, archive restores, and writes all route through the Neon-aware database layer with a shared advisory lock so archive moves can’t race concurrent updates and re-scrapes can’t create duplicate copies; a dry-run-first rollback export can restore both Neon databases from Turso without deleting the existing rollback copy; archived job links and saved jobs stay readable after expiry via direct history lookups; and migration verification checks table columns as well as row parity to catch schema drift before cutover.

### Added
- Added enforced hidden, soft-parsed, and fully parsed publication states, so corrupt or unusable listings are removed from public results while safe partial parses stay visible with pending details.
- Introduced deterministic, board-specific metadata parsers (Hamilton, Toronto, Workday, Ontario Health atHome, Taleo, Dayforce, Njoyn, ADP, and SuccessFactors tenants) and extended deterministic parsing to York, Canada Post, University of Toronto, CMHC, Guelph, Vancouver, Richmond Hill, Brampton, Waterloo, Government of Canada, and further PeopleSoft tenants; registered UBC as a Workday source; promoted Algoma University, VIA Rail Canada, VIA TGF Inc., and City of Ottawa (Jobs2Web) from pending to active; and expanded validated trial-source coverage to federal, crown, provincial, and British Columbia municipal boards ahead of promotion.
- Added a range-based closing date parser (`Posting Period`) to recover deadlines from City of Toronto and similar postings.
- Added conservative, ID- and source-scoped backfill tooling that recovers missing structured fields (language, certification, vehicle, education, experience, skills, closing status, title quality) from preserved captures — with duplicate- and oversized-capture guards, without overwriting already-populated values, and safely re-runnable against just the jobs it targets without touching the rest of the parsing queue.
- Added read-only audit tooling — raw-capture replay, Playwright content checks, and a whole-corpus parser regression audit — that catches parser drift, dead or challenge pages, and nonstandard Availability/FTE/portal fragments before they can reach public listings, without spending AI credits or touching the database; a matching Availability backfill canonicalizes recognized schedule values without changing the raw source text.
- Added an automated post-scrape quality pass and a reusable publish-quality gate with its own audit script, so metadata refresh, shared and source-specific title cleanup, missing-deadline fills, and publication-state enforcement happen automatically and can be re-checked going forward.
- Added deterministic, source-scoped public-job spot checks and extended them through nine non-overlapping batches, repairing recurring salary, workload, title, course, and portal-capture errors surfaced along the way (including Ottawa, Shared Health, Canada Post, and academic metadata), plus a further pass that corrected titles, structured fields, and descriptions for 20 more listings from their live source text.
- Replaced the growing employer list with searchable suggestions and added location suggestions as users type.
- Added official careers links for Shared Health Manitoba, Canada Post, the Government of Alberta, and the University of Saskatchewan.
- Added a clear “Position has been filled” option to the public job-report flow.
- Multi-location postings now produce separate location suggestions instead of one combined pill, and location filters accept comma-separated multiple cities to combine matches while keeping the result count and shareable URL in sync.
- Human-readable job URLs can now recover missing titles safely — URL slugs are used only when their words are confirmed in the captured source text.
- **Source-confirmed worksite addresses are stored for future map features** — street addresses stay hidden from public job responses and are only saved when the posting explicitly identifies the work location.
- **Jobs can now be filtered by source-backed career stage** — explicit student, early-career, experienced, and senior signals are visible on postings while unclear roles remain uncategorized.
- **Academic postings show richer, source-backed context earlier** — course schedules (including bilingual class times), course names, class times, and short-term co-op placement lengths remain visible before full parsing; academic context is preserved from explicit source-title wording even when structured role metadata is missing, without inferring student status; and academic role coverage was expanded so faculty, teaching, research, tutor, and course-support postings consistently show course, workload, office-hours, supervisor, and appointment context using source-backed labels.
- **Job and results links can be copied directly** — shared URLs reopen the same posting or filter state without relying on local browser data.
- **Active job filters now explain themselves** — a deterministic summary states the selected criteria in plain language.
- **Company pages now support maintained organization metadata and navigation** — grouped employers such as the City of Ottawa can show child organizations like OC Transpo and their official job links without duplicating jobs or inferring relationships from titles.
- **Homepage quick filters** — ending within 14 days, added in the last 7 days, and city-based Near me with browser-location permission, manual fallback, and a matching count when a city is already known.

### Fixed
- Removed confirmed employer-portal, institutional, and application-footer boilerplate from thousands of current and archived descriptions across dozens of sources — including generic tail-anchored application footers, OCAD, Waterloo, Oakville, Kitchener, Ottawa Public Library, Metrolinx, Dalhousie, University of Toronto, Western University, UBC, Canada Post (including repeated values blocks), York University, Government of Canada, Shared Health Manitoba, and portal alert-setting text in job hours — with source-scoped, idempotent rules that keep the same boilerplate from returning. Audited CMHC, University of Waterloo, Government of Alberta, Ontario Health atHome, Brock University, TransLink, City of Toronto, City of Ottawa, and 86 additional low-volume sources with no further safe cleanup candidates found.
- Repaired thousands of missing or malformed location values recovered from stored captures across dozens of sources — including Halton Region (also fixing glued department labels), Caledon, Conservation Halton, VIA Rail, Queen’s, Alberta, Calgary, Shared Health Manitoba (475 facility-based locations corrected to source-listed cities), Chatham-Kent (glued multi-arena addresses), and Region of Waterloo — without needing to re-scrape. Added a source-text fallback for compact job-board layouts that previously left a known workplace blank (e.g. Hamilton’s `Location...Department` block), and pending Workday listings now show a safe source-derived city/province instead of leaving the location empty.
- Cleaned up job titles across dozens of sources by moving embedded metadata into its own structured field instead of leaving it in the title text — employment-status suffixes (Kitchener, Burlington), Government of Canada bilingual markers and classification prefixes (e.g. `PM-01`), annual recruitment-year and requisition-ID text (Queen’s, uOttawa ATPUO), internal posting IDs and hiring-pool/part-time metadata (UNBC), “Expression of Interest”/“Appendix D” labels and FTE workload prefixes (Algonquin), Workday page-load wrapper headers, BambooHR internal Job ID prefixes (Hamilton), department/employment-status metadata (Humber, Waterloo), parenthetical union markers, and bundled terms/union prefixes/course codes now shown as separate badges next to a cleaned title. Also corrected malformed titles, including Northumberland County’s `registered nurse rn`, two malformed Shared Health Manitoba titles, two archived Metrolinx titles, one Saint-Boniface title, and fixed-term contract wording left in public titles instead of duration metadata.
- Stopped non-title text from being published as a job’s title — an academic-strike banner (Sheridan), “View Job Details” and similar portal button labels (including on jobs not yet promoted), navigation headings lacking a space before sign-in options (8 McMaster listings), and fake portal headings all now fall back to a real source title or stay hidden until one is captured; PeopleSoft detail-page title recovery was also extended across different tenant layouts (Fleming, TransLink).
- Hardened salary parsing and filtering: incidental allowances can no longer become the salary, ranges keep both bounds, and pay periods are taken only from the salary capture; a decimal-truncation bug that turned “$33.83” into “$33” was fixed, and precision was extended to 4 decimal places to preserve paramedic and specialized collective-agreement wage rates; source-specific pay-period corrections are only applied when their bounds match the stored salary, without importing unrelated dollar amounts; salary filters now compare pay using approximate yearly equivalents so hourly, monthly, and flat compensation are never misrepresented as an annual salary; and pending salary ranges correctly retain bi-weekly pay periods instead of showing an unexplained duplicate amount.
- Fixed a systemic field-gluing bug across every mechanical and Workday parser (SuccessFactors, City of Toronto, ADP, Dayforce, Njoyn, Hamilton, Government of Canada, University of Ottawa, Brock, and other Workday/PeopleSoft tenants) where department, salary, hours, licence, and closing-date captures ran on into unrelated following text instead of stopping at the next known field label — including Algonquin Hours values swallowing the following Anticipated Start Date, Workday department captures gluing an FT marker and Campus header together, and a truncated George Brown licence capture (`College of E`, corrected to `RECE (CECE)`). Added a length backstop and Workday field-boundary checks as a final safety net, and removed about 1,193 corrupted listings this class of bug had already produced across current and archived data.
- Fixed `normalizeDepartment` truncating real department names at any hyphen, even inside a single hyphenated word (“On-Site Team” was becoming “On”, “Office of Equity and Anti-Racism” was becoming “...and Anti”); since this function is shared by nearly every mechanical parser, the fix applies broadly.
- Fixed the root cause of union-field corruption on PeopleSoft sources (Calgary, TMU, TransLink, Western, Winnipeg, McMaster, Durham/Niagara Region, Fleming), where a capture bounded only by a newline swallowed every field after it since these sources render pay/position info as one unbroken line; also fixed “Exempt” being wrongly stored as a real union name, and extended the publish-quality gate to catch the same corruption pattern, removing 10 live jobs it had already reached.
- Hardened publish-quality and parsing guards against false positives: a narrow licence-parser guard stops job duties that merely mention licence registration from being misclassified as applicant requirements; the “student” badge now checks only the title instead of the whole posting (previously matching department names like “Student Systems” and roles that merely supervise students — 615 of 700 flagged jobs had no “student” wording in the title at all); legitimate PascalCase departments, multi-course academic appointments, camelCase product names (“ServiceNow”, “PeopleSoft”), and colons in legitimate academic department names (“UTM: Anthropology”) no longer get incorrectly rejected; and glued Ottawa office-hours captures are cleaned before publication.
- Fixed false rejections and blocks during scraping: static robot-check/hCaptcha widgets on SuccessFactors and Njoyn detail pages were causing false-positive bot-challenge rejections (restoring TTC and Carleton University listings), Radware anti-bot blocks on Njoyn and SuccessFactors search pages were resolved by disabling automated browser flags and isolating browser contexts per task, and a cookie-consent popup blocking every job click on the City of Markham’s ADP page was fixed.
- Repeatedly reconciled publication status against the shared quality gate, hiding several thousand invalid or incomplete current and archived rows from public view over multiple passes, while preserving every raw capture for future repair.
- Added deterministic replay tooling that promotes soft-parsed current and archived jobs to fully parsed using only stored captures — no re-scraping or AI calls needed — publishing several thousand previously-pending jobs once they pass the quality gate (including a full TransLink batch and an early verified batch of 50). Pending source captures with portal-specific headings now promote automatically, recovering titles, descriptions, salary, hours, and employment type, while expired talent-pool and cookie shells are discarded instead of promoted. Also recovered current listings that had been incorrectly archived (including 55 Njoyn postings stored as bot-page captures), corrected a metadata backfill that was marking jobs parsed prematurely (reverting 3,258 jobs it had wrongly promoted back to “Details pending”), and restored source-backed titles and deadlines for hidden pending jobs (PeopleSoft, Conservation Halton, and others) so valid postings are no longer left invisible.
- Added guards so unusable source captures can no longer reach public listings or corrupt existing data: non-job captures (expired pages, bot challenges, portal errors, search-result shells, PeopleSoft default-search dialogs and redundant resubmissions, glued requirement headings, and empty detail captures) are rejected before a pending listing is created; current University of Northern British Columbia listings blocked by the source CAPTCHA are now soft-parsed instead of presented as fully parsed; a zero-result source scrape can no longer archive every existing posting for that employer; archived listings are only restored after their individual source URL is verified live; newer source-captured closing dates now take priority over stale parsed ones so valid jobs aren’t hidden as expired; active listings without a source closing date are marked until-filled instead of being blocked from the recovery queue; empty trial boards no longer count toward the 3-run source-promotion gate; trial source scrapes preserve missing optional locations as database nulls instead of failing the run; and 6 stale City of Hamilton records whose pages no longer contained postings were archived.
- Extended the publish-quality gate to catch duplicated and contaminated structured fields — required-skills/software and responsibility/qualification values that exactly repeated each other or repeated education requirements, structured lists containing portal/page prose instead of real content, and compensation/schedule sections repeating the same pay, hours, term, or workload details already shown elsewhere — across current and archived jobs, with shared prose-detection rules added to catch the same contamination in skills and tags fields.
- Repaired academic-specific data across the catalogue: cleared academic context/panels from several hundred non-academic current and archive rows across three passes (119, 102, and 645 rows) while preserving legitimate research and course-backed roles and tightening the Academic roles filter/detail card to confirmed academic roles; moved University of Toronto term/course metadata out of 15 archived titles/fields; reconciled uOttawa raw and parsed titles so Professor/Student Professor titles stay consistent without re-scraping; added course-code and term normalization for Brock, TMU, uOttawa, University of Toronto, and York without treating requisition IDs as courses; repaired archived title, academic-metadata, hours, and union artifacts while keeping unverifiable historical rows hidden; and stopped academic metadata backfills from repeatedly proposing detail-field writes for raw-only archived captures that can’t be safely completed.
- Repaired Ottawa, Western, and Government of Canada captures for glued hours, canonical locations, academic course/term metadata, confusable Workday labels, portal-contaminated faculty descriptions, and structured pay/location/application-instruction/Similar-Jobs content bleeding into descriptions — recovered from stored or freshly-fetched captures without full re-scraping — and added matching engine guards (glued locations, Western campus defaults, missing-detail rows, GC portal shells, oversized/truncated course captures) so the same corruption can’t recur. Recovered raw course codes, titles, session terms, and campus locations for uOttawa’s academic replay parsing, repaired current uOttawa ATPUO pending titles into role titles with course and term metadata, and distinguished course-tied teaching roles from faculty/research roles that legitimately have no course term.
- Fixed several data-quality edge cases: a Milton salary value that had been stored in the department field (with Workday/publication checks added against future source-label contamination), non-canonical values appearing in location autocomplete, employer suggestions incorrectly appearing under the Location filter, unnormalized employment-type values (`FULL-TIME`/`Full Time`), inconsistent Education values (now concise Bachelor’s/Master’s labels while keeping currently-enrolled requirements separate from Student/Co-op classification), and long or oversized Responsibilities/Qualifications sections that either failed to trigger the “Details pending” state or risked rendering corrupted text.
- Search filters, and area-of-study, employer, education, and location suggestions, now query the full public job catalogue instead of only the currently loaded page — so filters, suggestions, and shareable filtered URLs cover every matching job (e.g. subjects like Science or cities like Toronto remain discoverable even when the first loaded batch doesn’t include them), and employer labels stay consistent across job cards, details, and the company directory.
- **Pending and public listings now show consistent, source-backed deadline and status information** — a public listing requires a concrete closing date to display (an exact date or the “Until filled” fallback for active listings; parsed or soft-parsed rows without one stay hidden until known), pending listings distinguish a known deadline, no deadline listed, open until filled, and not-yet-checked source data, and expose hiring-pool, candidate-inventory, and fixed-term status the same way without hiding the job. Direct job links respect this same deadline visibility, public deadline checks use Toronto’s calendar date so same-day Canadian postings stay visible until the local date ends, and pending job pages show a neutral “Details pending” card (with recruitment/student labels in the standard grey treatment) instead of a list-style warning badge.
- **Government of Canada postings delegated to another employer’s application system now keep their official destination link** — the National Arts Centre, CSIS, Bank of Canada, Defence Construction Canada, and other delegated employers no longer send applicants to a generic or session-bound GC listing page.
- **Recruitment and eligibility classifications were corrected from official source text** — candidate inventories, hiring pools, explicit standing-posting/eligibility-list postings, and ordinary open-until-filled jobs now stay in the right listing category instead of appearing as ordinary single-job vacancies, generic ongoing-recruitment wording no longer creates a false closing date, and “open until filled” remains a genuine deadline state rather than turning a specific job into a recruitment pool.
- **Jobs2Web and SuccessFactors sources now follow each board’s actual result-page size** — sources with ten, 25, or other results per page, and larger SuccessFactors boards with more than ten pages, no longer stop early.
- **Scheduled scrapes now handle externally blocked sources cleanly** — CAPTCHA challenges, provider outages, and non-rendering OPS/Workday boards are recorded as blocked or access-failure sources instead of failing the entire feed run, hanging, or looking like an ordinary zero-result change, while genuine scraper errors still fail normally.
- **Ontario Health atHome postings now retain their full source-backed job facts** — location, salary, employment status, hours, benefits, and requirements display correctly (e.g. the reported Care Coordinator listing), and benefit labels use the public vocabulary instead of exposing legacy lowercase pension, health, and dental values.
- **Job detail requirement and metadata fields now render correctly** — benefits, licences, skills, and other requirements stay as plain text instead of rendering as unsolicited bubbles, and previously flattened requirement lists (licences, skills, benefits, certifications, software, language) now display as visibly separated fields.
- **Transit and library filtering now cover more sources** — VIA Rail Canada, BC Transit, and TransLink link to their maintained official career boards, and Pickering Public Library’s current or empty job state is visible alongside the other public-library sources.
- **Jobs list pagination and scrolling behave more predictably** — paginated results use a stable tie-breaker so jobs with matching timestamps no longer repeat across “load more” pages, and the page no longer loses its scroll position when appending another page of results.
- Canonicalized Ottawa Jobs2Web records — and future scraper runs — to `City of Ottawa`, removing the duplicate company label across current and archived data and from the public employer display.
- Repaired syndicated Defence Construction Canada postings so their salary, employer name, and application links no longer inherit Government of Canada metadata.
- Fixed company pages failing to load their job results in Postgres (VIA TGF and other source-scoped pages no longer fail on title suggestions), and fixed the grouped company API output for Vercel’s supported TypeScript target.
- Company directory rows are now real links, so they support right-click, middle-click, and modifier-click opening while preserving in-app navigation for ordinary clicks.
- Fixed a Postgres query ambiguity bug in the `recordParseFailure` helper.
- **Concurrent Workday refreshes no longer deadlock Neon archive routing** — Workday scrapes no longer leave a Neon transaction open while waiting for an archive connection, so scheduled runs can finish without an idle-transaction timeout.
- The web build now uses the patched nanoid release, removing its open high-severity development dependency alert.
- Fixed parameter boundary unescaping for Kingston RSS feed URLs, restoring 18 active jobs.
- **Company-page status and location states are now consistent** — Candidate Inventory uses the shared status-pill treatment, while exact, area-only, and unavailable workplace locations are shown without implying a precise address where the source does not provide one.
- **Job pages no longer show a workplace map card** — location mapping is reserved for a future Jobs near me view instead of appearing on every posting.
- **Pending PeopleSoft listings now explain how to find the source posting** — the official board opens without a misleading fragment deep link and includes the source job ID to search.
- **Jobs filters now work on narrow screens** — the filter controls remain reachable without forcing a second scrolling panel, and Saved clearly keeps its filters separate from Recently viewed.
- **PDF postings no longer rely on fragile text extraction** — listings keep their original PDF link and show a clear details-pending state instead of risking misleading parsed content.
- Fixed the quality-gate purge (`audit-mechanical-publish.ts`) permanently stranding removed listings — deleting a corrupted `jobs`/`job_details` row left `raw_jobs.parsed_at` set, so the row silently dropped out of the parse queue forever unless the scraper happened to revisit that exact posting; the purge now clears `parsed_at` so removed listings re-enter the normal queue for a fresh parse. Requeued 525 rows already stranded this way by the August field-gluing cleanup.
- Bot-challenge and non-rendering source pages (e.g. Workday's "Security Check" interstitial, seen on UBC and University of Ottawa) were slipping past capture-quality checks and getting saved as if they were real postings, sitting invisibly mixed into the normal parse backlog with nothing to show they'd need attention. These are now recognized and marked `blocked` — hidden from public listings, excluded from automatic retries, and visible as an actual review queue (`blocked-jobs-report.ts`) instead of silently vanishing or masquerading as ordinary unparsed jobs.
- Fixed the deterministic metadata backfill's `hours` extraction treating a bare "FTE" mention as a labeled field — an inline aside like "(1.0 FTE) Maintenance Mechanic" was captured as if it were an hours-of-work value, publishing garbled text (confirmed live on 2 BCIT postings). A bare "FTE" no longer triggers extraction; only an actually labeled one ("FTE: 1.0") does.
- Fixed PeopleSoft postings (Calgary, Winnipeg, TMU, Western, McMaster, Fleming, TransLink) publishing a building/street address as their public location instead of a city — confirmed live on 23 active City of Winnipeg postings (e.g. "1120 Waverley Street, Hybrid with designated work location" shown instead of "Winnipeg, MB"). The address is kept (in `workplace_address`, for future map features) instead of discarded, and the public location now falls back to the employer's home city for these single-city tenants; multi-city regional employers (Durham Region, Niagara Region) are left alone rather than guessed.
- Fixed the same address-as-location bug in City of Toronto's parser — confirmed live on 25 active postings (e.g. "1530 Markham Road, 5100 Yonge St, 850 Coxwell Ave" shown as the location). Same fix: keep the worksite address in `workplace_address`, public location falls back to "Toronto, ON".
- Closed a gap in the mechanical parser's publish-quality gate: a scalar field (hours, department, salary, location, etc.) containing a raw newline is always a capture that ran across an unrelated field or section boundary — found live spanning a dozen sources (an "hours" value containing "Posting Closing Date:", unrelated portal text like "resetting your password", even a different field's salary figures). Verified safe against every already-published row in the dataset before adding (zero legitimate newline-containing value found for any of these fields), then used it to catch and requeue 149 already-live corrupted listings for reparsing (142 of them this exact bug).
- **Job headers no longer repeat title-like role categories as departments** — Canada Post delivery roles no longer show the same role twice.

## [1.9.10] - 2026-08-10

### Added
- **New postings appear before full details are parsed** — titles, employers, links, dates, and obvious salary or student signals are shown while the full body remains pending.
- **Homepage filters are shareable and count the full result set** — searches can be reloaded or bookmarked, and recent and closing-soon totals cover all matching jobs.

### Fixed
- **Portal metadata no longer leaks into public listings** — cookie text, portal labels, and other source-site UI are excluded from job titles and employer information.
- **Active job counts stay reliable** — partial scrapes no longer remove unaffected jobs, unreadable postings stay out of the feed, and expired listings leave it automatically.
- **Job details are organized by information type** — medical and fitness requirements, compensation, benefits, education, and other structured fields stay in consistent sections, while descriptions retain role-specific content instead of repeating them or boilerplate.
- **Job freshness uses official posting dates** — recent and newly added lists use validated source dates instead of scrape time, while expected start dates appear separately when provided.
- **Ambiguous language options no longer create false filter matches** — postings with different requirements by location or stream are not incorrectly marked as English, French, and Bilingual simultaneously.
- **Recruitment pools are classified correctly** — applicant pools and future-vacancy inventories no longer appear as ordinary jobs.
- **Job terms now display as Term** — fixed-term lengths and end-date ranges no longer appear under the ambiguous `Duration` field.
- **Direct job links load correctly** — stable numeric public IDs resolve to the posting, and the browser title uses Civic Careers.
- **Company pages load only that employer’s jobs** — opening an employer no longer loads the entire job catalogue first.
- **Public job feeds avoid repeated database reads** — read-only results cache for 24 hours, matching the scrape cadence.

## [1.9.9] - 2026-08-04

### Fixed
- **Retired Government of Canada postings could remain active**: moved or unavailable detail pages now deactivate their existing row and are excluded from parsing, including previously parsed records.
- **Empty placeholder sections could survive parsing**: deterministic cleanup now removes sections containing only values such as “None” or “N/A”, while backfills skip changes that would erase an entire stored description.
- **Recurring source boilerplate could remain in job descriptions**: confirmed Metrolinx variants, Government of Canada, Brock University, City of Brantford, University of Waterloo, City of Barrie, and City of St. Catharines employer/application blocks are now removed deterministically while role-specific requirements and eligibility remain intact.
- **Structured criteria were stored but hidden on job pages**: languages, vehicle requirements, certifications, and software now appear alongside education, licences, benefits, and skills.
- **Recruitment classification treated ordinary annual language as a hiring pool**: explicit standing-posting and candidate-pool signals now drive listing types, while generic “throughout the year,” “year-round,” and procurement language stays regular.
- **Report form had a redundant Other checkbox**: details-only reports now classify themselves as Other, while extra details can still clarify any selected reason.
- **Responsibilities and Qualifications opened inconsistently**: both sections now start expanded, while optional Nice to Have details remain collapsible.
- **Report form controls could use an unreadable dark browser style**: the reason checkboxes and optional details field now keep a readable light background with explicit contrast.
- **Job reports required manual issue-writing**: Report a problem now asks for all applicable reasons, includes both internal and source job IDs, and opens a prefilled GitHub issue.
- **Reported-job issues were not consistently identifiable**: new reports now receive the `user-reported` GitHub label automatically.
- **Recruitment programs were mixed with ordinary postings**: ongoing recruitment and candidate inventory now have separate listing types, filters, badges, and deterministic backfills; confirmed House of Commons and RCMP records use their source application links and concise source descriptions.
- **Job rows could not be opened in another tab**: active rows now use real links while preserving the in-app detail navigation for ordinary clicks.
- **Language and vehicle requirements were not filterable**: explicit non-AI extraction now backfills those fields and Jobs filters can find English, French, bilingual, and vehicle-required roles without treating optional or generic wording as requirements.
- **Saved jobs could disappear after refresh**: Saved now loads the current saved set without the catalogue cache.
- **Saved page headings were inconsistent**: Recently viewed now uses the same heading treatment as the saved-job count.
- **Listing controls disappeared while scrolling**: Job and company counts and sort controls now stay visible at the top of their results.
- **Filter and results labels used different type treatments**: Sidebar labels now match the listing controls in font and color.
- **Filter controls and page navigation could lose context**: sidebars now fit within the viewport with Reset kept reachable, English and French can be selected together, and opening jobs or views returns to the top.
- **Recently viewed jobs disappeared after switching views**: Saved now retrieves viewed jobs that are not in the currently loaded catalogue batch.
- **Company-filtered Jobs pages repeated the match count and sort controls**: the shared toolbar now renders them once.
- **Homepage job context was missing**: available jobs and jobs added in the last 7 days now sit left-aligned with the homepage sort controls in one consistent type style.
- **The homepage preview had no direct catalogue link**: a `See all jobs` control now opens the full Jobs page.
- **Jobs and Companies could show a blank loading screen**: layout-preserving loading rows now appear while data loads, and Jobs waits until the bottom before fetching another batch.
- **Jobs showed historical rows in its total and could stop after the first batch**: the catalogue count now matches active, non-expired jobs, and additional results load automatically as you scroll, including company-filtered views.
- **Concurrent page refreshes could duplicate the same API request**: matching in-flight requests are now shared.
- **Recently viewed jobs could only expire naturally**: Saved now includes a direct way to clear that local history.
- **Qualification details could be hidden behind generic category chips**: full qualification bullets now appear by default, including education, experience, and language requirements.
- **Long “Nice to Have” requirements were shown as truncated pills**: optional requirements now display as readable full bullets.
- **Important requirements were only searchable inside descriptions**: education, licences, vehicle needs, languages, security checks, certifications, and software are now stored separately for future filters.
- **Education, licence, and pension details could be misclassified**: deterministic reconciliation now separates those fields from skills and shows them independently on job pages, including for existing parsed jobs.
- **Freshness lists were based on scrape timing**: validated official posting dates now drive “Newly added” and recent sorting, with first-seen fallback; scrape time remains “Last checked.”
- **Software backfills could stop short or leave parser corrections unapplied**: the backfill now scans all eligible jobs and reconciles existing values before selecting each batch.
- **Labelled language metadata and screening text could be misread**: deterministic backfills now capture explicit raw language requirements and fluent or language-of-instruction cases, fill only empty language and vehicle fields, and ignore standalone driver-abstract checks as vehicle requirements.
- **Some Government of Canada records used a generic destination**: CRA recruitment postings now keep their official application link and source-labelled pools are classified as ongoing recruitment, while the non-job Candidate profile page is excluded.
- **ADP postings all opened the employer’s generic recruitment page**: the scraper now preserves each clicked posting’s direct `jobId` URL and can backfill existing ADP records after a source refresh.
- **A Toronto posting retained its search-page URL**: the source fix now maps the legacy record to its official SuccessFactors detail page without creating a duplicate.

## [1.9.8] - 2026-08-02

### Added
- **Expanded trial scraper coverage**: shared engines now cover PeopleAdmin, BrassRing, Lever, PrevueAPS, Hireserve, Phenom, Jobs2Web, ApplyToEducation, Workable, Avanti, VIP Cloud, Workzoom, SAP Web Dynpro, NEOGOV, NorthStar, RSS, and municipal HTML/PDF boards across Canada.
- **PDF postings can keep their real description separate from the Apply link**: validated sources include Vaughan Public Library, St. Clair College, Pickering, and Nanaimo.
- **Companies can be filtered by organization type**: classifications cover public libraries, transit agencies, universities and colleges, municipal governments, public agencies, and health organizations.
- **Job freshness and site context are visible**: the homepage shows active and recently added totals, the footer shows the latest check, and the About page explains the source and update process.
- **Job details now support canonical responsibility and qualification tags, Recently viewed jobs, apply-click tracking, internal-ID reports, and clean salary and employment-type display.**

### Fixed
- **Posted dates were inconsistently omitted**: official metadata or labelled dates are now captured where available across York, Toronto, Waterloo, Vancouver, London, Mississauga, CMHC, Windsor, Barrie, Brampton, Belleville, Burlington, Richmond Hill, St. Catharines, Niagara Falls, and related university boards; unavailable dates remain empty.
- **Scraper runs could lose or duplicate jobs**: detail-content waits, pagination fixes, cross-tenant IDs, direct-link handling, Workday legal-notice handling, and the CSOD, Njoyn, Taleo, Dayforce, and PeopleSoft fixes now preserve valid postings.
- **PeopleSoft coverage was incomplete**: the shared click-and-walk engine now handles Winnipeg, Durham Region, McMaster, and other Fluid tenants, with remaining unreachable tenants left out of production.
- **Job browsing was slow and inconsistent**: lightweight homepage and Companies responses, batched infinite loading, full catalogue counts, shared layouts, and consistent sorting/filter controls now work together.
- **Job detail content was noisy or misleading**: placeholder sections are hidden, mandatory eligibility moves to Qualifications, long requirement labels are compacted, locations use readable casing, and duplicate salary endpoints collapse to one value.
- **Reports, Saved, and empty states were unclear**: reports include the internal job ID, Saved says “saved jobs,” and the sidebar, footer, header, and page widths now align consistently.

## [1.9.7] - 2026-07-27

### Fixed
- **Job requirements were hidden behind an unnecessary interaction**: Responsibilities, Qualifications, and Nice to Have now stay visible as compact summaries.
- **Job requirement summaries were indented away from their headings**: summary tags and expanded details now share the same left alignment.

## [1.9.6] - 2026-07-24

### Fixed
- **Direct job links could wait for the entire jobs catalogue**: job pages now fetch their single record first instead of blocking on the full dataset.
- **Job detail summaries were visually noisy and repetitive**: requirement tags are now neutral and compact, expandable sections no longer use a plus icon, employer mission copy is omitted from Overview, and salary-only compensation text is hidden when the same value is already in the sidebar.

## [1.9.5] - 2026-07-24

### Fixed
- **Job requirement summaries were hidden until expansion**: grouped responsibility and qualification bubbles now remain visible while the full source bullets stay collapsible.

## [1.9.4] - 2026-07-24

### Fixed
- **Long job requirements were hard to scan**: Responsibilities and Qualifications now open as compact grouped summaries with the full source details available on demand.
- **Existing job overviews needed an AI rerun to remove employer boilerplate**: a read-only, paragraph-safe cleanup beta can identify removable copy without spending parser credits or changing the database.
- **Job overviews could repeat employer marketing copy**: AI extraction now limits Overview to a short, role-specific summary and removes company/facility descriptions.
- **Job descriptions were vertically bloated**: rendered bullet lists no longer insert an extra blank line between every item, making long postings much easier to scan.
- **Save controls could appear blank on the job detail page**: the button now sets its own readable text color and font instead of inheriting an invisible browser default.

## [1.9.3] - 2026-07-24

### Fixed
- **Web deployments could render a blank screen after a React update**: `react` and `react-dom` now stay on the same release so the client can mount reliably.
- **Parser retries could repeatedly spend AI credits on permanently unusable input**: source listing titles now survive into parsing, malformed responses and unrendered shells stop retrying until fresh content arrives, and failure logs identify the affected job and response shape.

## [1.9.2] - 2026-07-18

### Fixed
- **API and deployment failures were opaque**: Vercel now installs dependencies once from the lockfile, while job endpoints return clear JSON errors for missing configuration, missing jobs, and database failures.
- **Discord alerts were too technical and duplicated**: scraper and parser notifications now name the failed sites, explain that Codex should investigate, and link to the run without dumping raw errors; workflow-level duplicate alerts were removed.
- **Scrape and parse failures could still look successful to CI**: source-level failures and fatal parser errors now exit nonzero so automated alerts and workflow status reflect the actual run.
- **Stale SPA shells kept returning to the parser**: unusable detail pages are discarded during rescraping, and Workday detail-page failures now fail the source job after processing the rest of its listings.
- **Human-readable closing dates could gain a timezone-shifted time**: date-only values now stay date-only instead of becoming timestamps at local midnight.
- **Reparsed jobs could keep stale details**: corrected descriptions, salary, benefits, and classifications now replace the previous parsed values instead of updating only the closing date.
- **Job detail pages no longer waste space between bullets or clip long lines**: descriptions now wrap within the content column and use compact list spacing, so more of each posting is visible while scrolling.

### Changed
- **Companies is now a directory instead of a duplicate Jobs filter view**: company browsing uses the full content width and hiring-status grouping, while job-specific filters stay on Jobs and Saved.

### Added
- **Parse failures were invisible after the fact**: a failed batch only ever surfaced as a raw count in Discord ("346 failed"), with no record of why any individual job failed or whether it was a permanently broken source vs. a one-off. Failures are now tracked per-job with a reason (unrendered page, AI/validation error) and an attempt count; a job stops being retried after 2 failed attempts instead of burning an AI call on it forever, and the Discord summary now flags how many hit that cap. A fresh rescrape overrides the cap (new content means a scraper fix may have resolved the original cause), and failure records for jobs that stop showing up in scrapes entirely get cleaned up automatically.

## [1.9.1] - 2026-07-13

### Fixed
- **Scrape notifications didn't say which sources succeeded or failed**: a source silently erroring (bot detection, a broken selector, etc.) was invisible — the message reported a company/job count as if everything had succeeded. Notifications now list every source's pass/fail status individually (with the error for failures), and split out net-new postings found from the total touched.
- **University of Ottawa and University of Waterloo (Workday) were burning paid AI parsing calls on empty pages**: their job-detail pages were sometimes scraped before the real content had rendered, capturing just the site's nav/footer shell instead. That shell was long enough (~136 chars) to slip past the "did we actually get content" check, got saved as if it were a real posting, then silently failed AI extraction on every parse run — 812 and 23 postings respectively, indefinitely, since a failed parse never stops a row from being retried. The scraper now detects and retries an unrendered page before giving up, and the parser now rejects that shell locally (no API cost) as a second layer of defense.
- **259 fabricated job postings were live on the site**: a subset of the empty-shell pages above didn't just fail extraction — the AI, given no real content, hallucinated a plausible-sounding posting instead of returning nothing (several visibly echoed a worked example embedded in the parser's own prompt). Removed all 259 from production; the underlying rows will reparse correctly once the scraper fix above captures real content for them.

## [1.9.0] - 2026-07-13

### Added
- Added 14 new sources, including the first outside Ontario/Quebec (City of Vancouver, City of Brandon, City of Red Deer) and support for two new job-board platforms: CSOD (George Brown, Mohawk, Durham College, Ontario Tech, Fanshawe College) and PeopleSoft Fluid (City of Winnipeg — a platform where postings have no normal browsable link, so this required a different scraping approach than every other source). Also added Humber College, City of Guelph, City of Victoria, Toronto District School Board, and Northumberland County.

### Fixed
- **City of Brampton and City of Kitchener jobs were completely missing**: Brampton had migrated off Workday to a new site entirely (scraper still pointed at their old, dead Workday tenant — fixed the URL). Both Brampton and Kitchener also use a newer card-based page layout that our jobs2web selector (which required a `<table>` wrapper) didn't match. Broadened the selector to work with both layouts. Verified: both went from 0 to real job counts.
- **City of Toronto jobs were undercounted 61 → 4**: scraper URL was a landing page, not the actual results page. Fixed the URL and added a missing row-selector variant used by some SuccessFactors tenants. Verified: 4 → 55 jobs on next scrape.
- **Dayforce sources (TRCA, Infrastructure Ontario, City of St. Thomas) found zero jobs**: page loads used a wait condition (`networkidle`) that never actually resolves on Dayforce's site (nor on Njoyn's, same fix applied there), so it timed out before finding anything — including on the individual job detail page visits used by every engine. Switched to `domcontentloaded`. Verified: TRCA 0 → 18/18 jobs saved, Infrastructure Ontario 0 → 16/16, all succeeding with no timeouts.
- **City of Oshawa, City of Vaughan, Centennial College, and Queen's University jobs were completely missing**: their scraper URLs had a hardcoded session token baked in, and those tokens had expired (Vaughan's tenant had also moved to a new subdomain and ID entirely). Switched all four to the token-free entry URL, which the site uses to issue a fresh session automatically — this also means these can't silently expire again the same way.
- **Peel Region jobs had never appeared once since the source was added**: the scraper was reading from the wrong part of the page (a hidden branding wrapper instead of the real content frame) and using a link pattern that never matched this site's actual URLs. Same fix also unblocked two pending sources, City of Guelph and City of Victoria, promoted alongside it.
- **Halton Region and Mississauga jobs were completely missing**: the scraper's job-link selector was matching an unrelated wrapper element instead of the real link on every single posting.
- **Four ADP sources (Municipality of Clarington, City of Markham, Town of Aurora, City of Sarnia) had zero jobs**: ADP's site redesign moved to a UI framework the scraper no longer recognized, and a page-size limit was silently capping results at whatever fit on one screen for tenants with more postings than that.
- **Four Taleo sources (Town of Oakville, City of St. Catharines, Seneca College, OCAD University) were silently capped at 10 jobs** regardless of how many were actually posted — OCAD alone was missing 18 additional postings.
- **Humber College jobs were completely missing**: Taleo scraper didn't recognize a newer page template used by this tenant.
- **City of Kingston jobs were completely missing**: the job feed's links required a browser session that wasn't being established first.

## [1.8.1] - 2026-07-12

### Changed
- **Workday scraper is much faster on first backfill**: new job detail pages were visited one at a time; now visits several concurrently (same pattern already used for AI parsing). Matters most for large tenants like University of Ottawa, where the pagination fix surfaced over a thousand previously-hidden postings that all needed a first visit.

## [1.8.0] - 2026-07-12

### Added
- **Skills/programs extraction**: postings now surface named tools/software (Excel, Python, AutoCAD, etc.) as a dedicated field on the job detail page.

### Fixed
- **Job description cleanup**: removed empty section headers ("Nice to Have" showing with no content), org boilerplate (land acknowledgements, employer awards/taglines), and inconsistent numbered/bulleted lists from parsed descriptions.
- **Responsibilities/Qualifications bloat**: verbose corporate and legal boilerplate (e.g. collective-agreement citations) is now stripped instead of reproduced, so postings read as tight bullets instead of dense paragraphs.
- **Work mode mislabeling**: postings described as "Online" only in the title (not the body) were incorrectly shown as In-person.
- **Salary mislabeling**: flat one-time payments (e.g. per-course academic pay) were shown as an annual salary range ("/yr") instead of a flat rate.
- **Sticky sidebar clipping**: the "Apply By" box was cut off by the header while scrolling on the job detail page.
- **Duplicate controls**: removed the redundant header Apply/Save icons and Back button (browser back and the site title already cover navigation) — Apply and Save now live once, in the sidebar.
- **Deadline wording**: "0d left" now reads "Closes today" and "1d left" reads "1 day left" instead of the odd zero/singular phrasing.
- **"Jobs" nav link ignoring stale sort state**: clicking "Jobs" in the header no longer carries over sort/filter state left behind by other actions (e.g. the homepage "See more" links) — it now always resets to the default view.
- **Workday scraper silently capped at 20 jobs per source**: the engine only knew how to load more results via an infinite-scroll "Load More" button. Tenants that instead use classic numbered pagination (Brock University, and likely University of Waterloo and University of Ottawa) were getting only their first page scraped — Brock alone was missing 442 of its 462 listed jobs. The engine now also follows numbered "next" pagination.

### Changed
- Removed the outlink icon from the Companies list rows — that page is for browsing into a company's jobs within Civic Careers, not for jumping straight to their external portal before picking a role.
- Cleaned up header nav styling (removed a stray icon, fixed off-palette colors, grouped Saved apart from Jobs/Companies) for visual consistency.

## [1.7.1] - 2026-07-11

### Changed
- **Dependency updates**: Merged 12 open Dependabot PRs — `axios` 1.17.0 → 1.18.1, `playwright` 1.60.0 → 1.61.1 (`scraper`); `@types/sqlite3` 3.1.11 → 5.1.0, `tsx` 4.22.4 → 4.23.0, `typescript` 6.0.3 → 7.0.2 (`scraper`, dev); `vite` 8.0.16 → 8.1.4, `@vitejs/plugin-react` 6.0.2 → 6.0.3, `eslint` 10.4.1 → 10.7.0, `globals` 17.6.0 → 17.7.0, `@types/node` 24.13.1 → 26.1.1 (`web`, dev); `actions/checkout` v5 → v7, `actions/setup-node` v5 → v6 (CI). One real conflict (the `eslint` bump vs. an earlier `globals` bump touching the same lockfile region) resolved by hand; Dependabot auto-rebased and re-resolved it independently before the manual fix landed.

### Fixed
- **Unused parameter flagged by the eslint 10.6+ upgrade**: `App.tsx`'s `handlePopState` took an unused `_event: PopStateEvent` parameter; removed since the handler never used it.

## [1.7.0] - 2026-07-06

### Added
- Added 13 new job sources: University of Toronto, Seneca College, Centennial College, University of Waterloo, Brock University, Sheridan College, University of Guelph, University of Ottawa, Algonquin College, Carleton University, OCAD University, Queen's University, and EFHC.
- Implemented lazy-loading for job descriptions in the API and frontend, reducing the initial JSON payload from ~3MB to ~150KB and rendering page loads instantly.
- Added official career portal URL mappings for all 40+ employers, displaying a dedicated header with direct portal links when filtering jobs by company.
- Added external website link icons next to company names in the Companies list, enabling direct portal navigation.

### Changed
- Made the filter sidebars on the jobs and companies pages sticky so they float alongside the content as you scroll.
- Grouped global navigation links (Jobs, Companies, Saved) and the permanent search input together on the right side of the header for a more cohesive, tighter layout.
- Slugified URLs for company routing to remove ugly `%20` encodings (e.g. `/companies/algonquin-college` instead of `/companies/Algonquin%20College`).
- Formatted raw ISO datetime values (like `2026-07-17T23:59:00`) in the UI to clean strings (like `Jul 17, 2026`).

### Fixed
- Fixed company name click handler on the job details view incorrectly routing to the generic Companies list rather than the filtered Jobs list for that specific employer.

## [1.6.3] - 2026-07-06

### Fixed
- Added support for SuccessFactors portals using a "More Search Results" button (like City of Toronto) instead of standard next-page links, allowing the scraper to fetch all available listings.
- Fixed date format comparison in `cleanupExpiredJobs` (SQLite UTC vs ISO string) that was incorrectly deactivating all previously-scraped jobs.
- Fixed skipped/already-parsed active jobs not being marked active in the `jobs` table.
- Optimized the unparsed jobs query to skip parsing jobs that are already marked inactive, saving AI parser credits and processing time.

### Removed
- Removed deprecated duplicate GitHub Actions workflow file `scrape.yml`.

## [1.6.2] - 2026-07-06

### Fixed
- "Closing Soon" now shows results (filter window increased to 14 days; home panel shows the 5 soonest-closing active jobs to avoid empty state when no deadlines fall in the window).

## [1.6.1] - 2026-07-06

### Fixed
- Inactive/expired jobs (is_active=0 or past closing_date) now consistently hidden from main lists, "Closing Soon" filter, recent postings, and companies page counts.
- Companies position counts now match the "X jobs available" total (e.g. Gov of Canada no longer shows 490 vs 396 total).
- Improved closing_date extraction for GC Jobs and HRSmart/York by strengthening AI prompt priority and preserving more page text (helps empty "Closing Soon" and expiry data issues).

## [1.6.0] - 2026-07-06

### Added
- 19 new Ontario municipal scrapers (Kingston, Ottawa, Belleville, Cornwall, Peterborough, Windsor, Sarnia, St. Thomas, Waterloo, Thunder Bay, Smiths Falls, Burlington, Oakville, Milton, Whitby, Markham, Aurora, Richmond Hill, Vaughan PL) using engines for RSS, SuccessFactors, JazzHR, Workland, Jobs2Web, Jibe, ADP, Dayforce, Workday, Taleo, and custom CMS.
- Manual `test-new-sources.yml` GitHub Action workflow to validate new sources in isolation.

### Changed
- Switched routing from hash (`#job/123`) to clean paths (`/job/123`); added explicit Vercel rewrites for SPA refreshes.
- Primary expiry uses `closing_date` (parser now extracts times); falls back to `is_active`.
- Parser sleeps through DeepSeek peak pricing windows (1-4 AM / 6-10 AM UTC).
- Cron shifted to 10:30 AM UTC for maximum off-peak window.
- Student/Co-op badge recolored to slate grey.

### Fixed
- Parser normalizes all section headers to the five canonical headings.
- Parser preserves sections, headings, and bullets (no more compression).
- Scraper now touches `scraped_at` for seen jobs so they are not incorrectly deactivated.
- Salary filter matches on structured `salary_min` values.
- Closing date countdown and UTC parsing bugs resolved for "tomorrow" cases.

## [1.5.2] - 2026-07-03

### Fixed
- Expired jobs now hidden from all views except Saved — main job list filters to `is_active = 1` only; saved view still shows all saved jobs regardless of status.
- Fixed "Closing soon" filter including expired jobs — now requires `is_active = 1` in addition to the date check.
- Fixed company pages having no URL — clicking a company now pushes `#companies/:name` to history so the page survives a refresh.

## [1.5.1] - 2026-07-03

### Fixed
- Fixed Vercel function crashing with `ERR_MODULE_NOT_FOUND` — switched `_db.ts` to `@libsql/client/http` (HTTP-only subpackage) to avoid loading the native `libsql` sqlite3 binary for cloud connections.
- Fixed Vercel build failure — relative API imports require `.js` extension under `moduleResolution: nodenext`; package imports do not.
- Fixed frontend crash on jobs with unparsed `job_details` — `job_title`, `department`, `location`, `description`, `closing_date` typed as nullable; `renderMarkdown`, `daysUntilClose`, and `fixCasing` updated to accept `string | null`.

## [1.5.0] - 2026-06-25

### Changed
- Split `jobs` table into `jobs` (scraper-owned: id, url, source, is_active, is_saved, scraped_at) and `job_details` (AI-owned: all parsed fields). The scraper can no longer overwrite AI data by design. Added `scraper/migrate.ts` to migrate live data. Web API query updated to LEFT JOIN both tables.

### Fixed
- Fixed re-scraping and re-parsing all jobs on every run — `scrapeRawAndStage` now skips detail page visits for jobs already in `raw_jobs` with a non-null `parsed_at`; `saveRawJob` no longer resets `parsed_at` on conflict; `saveJob` no longer overwrites AI-parsed fields on conflict (only refreshes `is_active` and `scraped_at`). Only net-new jobs now cost browser time or DeepSeek credits.

## [1.4.0] - 2026-06-25

### Fixed
- Fixed AI parser blindly trusting model output — `JSON.parse(content) as ParsedJob` replaced with `validateParsedJob()` which normalizes enums, coerces types, and returns null on bad output. Added `scraper/validate.ts` and 22 unit tests in `scraper/tests/validate.test.ts` (`npm test`).
- Fixed toggle-save always returning 400 — handler was reading `?id=` query param but the client posts to `/api/jobs/{id}/toggle-save`; now extracts `id` from the URL path.
- Wired up DOMPurify to sanitize `renderMarkdown` output before it is injected via `dangerouslySetInnerHTML`.

### Added
- Activated 7 previously-commented sources: Province of Ontario (OPS), York Region, Peel Region, Halton Region, City of Mississauga, City of Brampton, and City of Vaughan.
- Added Durham Region scraper (PeopleSoft Fluid UI — two-phase list + Next Job traversal).
- Added City of St. Catharines scraper (Taleo — direct `viewRequisition` URLs).
- Added City of Welland scraper (Avanti — table with direct `/careers/Job/Details/` URLs).
- Added City of Brantford scraper (custom CMS — crawls full-time, part-time, seasonal, and student sub-pages).
- Added City of Hamilton scraper (BambooHR direct portal); added generic `scrapeBambooHR` engine for direct BambooHR portals.

### Refactored
- Split `scraper/scraper.ts` (~1250 lines) into `scraper/utils.ts` (shared helpers) and 14 engine modules under `scraper/engines/` (successfactors, workday, njoyn, oracle, dayforce, jobs2web, icims, hrsmart, ultipro, adp, taleo, avanti, bamboohr, talentpoolbuilder, custom). `scraper.ts` is now a ~95-line orchestrator with imports and `main()` only.

### Changed
- Extracted `renderMarkdown`, `formatSalary`, `daysUntilClose`, `fixCasing` from `App.tsx` into `src/utils.ts`.
- Replaced per-function `createClient()` calls in API handlers with a shared `api/_db.ts` factory.
- Removed stale root-level `vercel.json` (was a workaround before Vercel root directory was set to `web`).
- Exported `scrapeConservationHalton` and `scrapeADP` from `scraper.ts`; added `scraper/test-new-sources.ts` for one-off targeted testing of new scrapers.

## [1.3.1] - 2026-06-24

### Fixed
- Fixed Vercel git integration build failure — moved build config to a root-level `vercel.json` so Vercel correctly builds from the `web/` subdirectory instead of the repo root.

## [1.3.0] - 2026-06-23

### Fixed
- Fixed Vercel deployment failing with `vite: command not found` — root `.gitignore` had `*.json` blocking `vercel.json`; added `vercel.json` with `installCommand: npm install --include=dev` so Vercel keeps devDependencies during build.

### Added
- 16 new sources across crown corps, conservation authorities, federal, and GTHA regional portals.
- 8 new generic scraper engines: `scrapeJobs2Web`, `scrapeDayforce`, `scrapeUltiPro`, `scrapeTalentPoolBuilder`, `scrapeADP`, `scrapeBarrie`, `scrapeConservationHalton`, `scrapeCambridge`.
- Government of Canada (GC Jobs / PSC) activated — covers all public-facing federal departments including Transport Canada and Statistics Canada.

## [1.2.0] - 2026-06-23

### Added
- Job detail sidebar now reads structured DB fields directly (`work_model`, `employment_type`, `duration`, `union_name`, `benefits`) instead of regex-parsing description text — fields actually populate now.
- Job detail body renders AI-cleaned description as formatted HTML (headings, bold, bullet lists) instead of raw markdown.
- Company name in job detail is clickable — navigates to Companies view filtered by that source.
- Salary displayed in `$116K – $161K / yr` format using structured `salary_min`/`salary_max`/`salary_period` DB fields.
- "See more →" under both home sections: Recent → sorted newest-first; Closing Soon → closing-soon filter active, soonest on top.
- "View Full Posting" button links to original job URL.

### Fixed
- Fixed nav bar vertical alignment — all items now center-aligned.
- Fixed sidebar text overflow — long department/location names wrap instead of being cut off.
- Fixed Saved nav item missing icon to match Search.

## [1.1.0] - 2026-06-22

### Added
- Deployed web frontend to Vercel with Vercel Functions serving `/api/jobs` and `/api/jobs/[id]/toggle-save` backed by Turso.
- Added Vercel Analytics.

### Fixed
- Fixed Metrolinx (Oracle Cloud) returning 0 jobs — title lives in `aria-labelledby` target, not the `<a>` tag text.
- Removed Toronto Public Library (Njoyn) from active scraping — blocked by Radware bot protection.

## [1.0.1] - 2026-06-22

### Fixed
- Fixed scraper silently succeeding on GitHub Actions due to `headless: false` — Chromium can't open a window on a CI server, causing an instant crash that was swallowed by `.catch(console.error)`. Browser now launches headless automatically when no `$DISPLAY` is available.
- Fixed `job_scrape.yml` missing `TURSO_URL` and `TURSO_AUTH_TOKEN` secrets — `initDb()` would have crashed after the browser fix landed.
- Fixed `job_scrape.yml` missing the Run Parser step — raw jobs were never being processed into structured job records.
- Removed useless "Upload jobs.sqlite" artifact step from `job_scrape.yml` — the DB writes to Turso, not a local file, so the artifact was always empty.
- Scraper now exits with code 1 on unhandled crash so GitHub Actions correctly reports failures instead of false success.

### Changed
- Expired jobs are no longer clickable — card stays visible in the list but detail view is disabled.
- Upgraded GitHub Actions Node.js runtime from v20 to v24 in both `scrape.yml` and `job_scrape.yml` to resolve runner deprecation warnings.

## [1.0.0] - 2026-06-17

### Added
- **DeepSeek V4-Flash Integration**: Upgraded parsing engine to the latest V4-Flash model, achieving improved extraction quality and reduced latency.
- **Dynamic Date Injection**: Prompt logic now dynamically injects the current date, ensuring 100% accurate calculation of relative closing dates (e.g., "Closing in 2 weeks").
- **Toronto Core Focus**: Concentrated scraper execution on high-priority Toronto sources: City of Toronto, TTC, Toronto Public Library, Metrolinx, and Waterfront Toronto.
- **Recursive Redirection Handling**: Robust handling for government portals (GC/OPS) that follow interstitial "Leaving site" pages up to 3 levels deep.
- **Automated Scheduling**: Configured GitHub Actions for bi-weekly scraping (Sun/Wed) with secure secret management.
- **Turso Cloud Database**: Migrated from local SQLite to Turso (libsql) so scraped data persists in the cloud and GitHub Actions runs write to a real database instead of a throwaway artifact.
- **README**: Added project README in standard format.
- **Toronto Public Library (TPL) Scraper**: New scraper for TPL jobs via the Njoyn portal.

### Changed
- Migrated from fragile CSS/Regex parsing to a unified, AI-driven architecture for structured data extraction.
- **Rich Schema Support**: Database and parser now capture numerical salary ranges, work models (Hybrid/Remote), and specific benefits.
- Updated browser stealth configuration with modern User Agent strings to bypass fake login walls.

### Fixed
- Resolved hardcoded reference date bug in AI prompts that would have degraded future data integrity.
- Fixed duplicate variable declarations in `ai_parser.ts`.
- Replaced over-sensitive "Internal Job" guards that were incorrectly blocking public government postings.

...
- New **Province of Ontario (OPS)** scraper support (provincial jobs via gojobs portal).
- New **Peel Region** scraper support (iCIMS portal).
- New **City of Burlington** scraper support (Avanti portal).
- New **Workday** scraper engine (added City of Brampton, Town of Ajax).
- New **Njoyn** scraper engine (added City of Vaughan, City of Oshawa).
- Expanded municipal coverage: Added Markham, Richmond Hill, Whitby, Milton, Guelph, and Kitchener.
- Total coverage expanded to **22 government job sources**.
- Transitioned to **Soft-Delete** data retention: stale jobs are now marked as "Expired" rather than being deleted from the database.
- Added **Inventory Job Filtering**: Ongoing recruitments and resume banks are now flagged in the database (`is_inventory`) and hidden by default in the UI to reduce feed clutter.
- Added "Ongoing/Inventory" toggle to the UI filters sidebar and an "INVENTORY" badge to associated job rows.
- New "Expired" UI status badge and dimmed styling for inactive job postings.
- Pagination support for **SuccessFactors** scrapers (now fetching 72+ City of Toronto jobs).
- Sequential scraping logic with fresh browser pages per source to eliminate network cross-talk and "interrupted navigation" errors.
- Intentional 1s delays between detail page requests to improve stability and avoid bot detection.
- Detailed per-source and per-item logging for improved debugging of extraction failures.
- Automatic "Scroll to Bottom" logic before pagination checks to reveal hidden buttons.
- Real-time progress tracking in console for long-running detail scraping tasks.
- Overhauled Federal/Provincial scrapers with multi-step "human-like" navigation to bypass session blocks.

### Changed
- Refactored Metrolinx scraper to target new **Oracle Cloud** portal (updated URL and selector strategy).
- Updated SuccessFactors scrapers for Toronto, TTC, and Mississauga to use `career17` subdomains.
- Standardized use of `textContent` and `Element` types across all scrapers for better cross-platform compatibility.
- Improved Job ID extraction logic to handle various URL formats and strip query parameters.

### Fixed
- Fixed critical "Module Not Found" errors by removing incorrect `.js` extensions from TypeScript imports.
- Fixed multiple TypeScript compilation errors (implicit 'any', possible null values in pagination).
- Fixed launch timeouts by switching to non-headless browser mode in local environment.
- Fixed Mississauga scraper picking up navigation links instead of job listings.
- Fixed York Region (HRSmart) pagination to capture all available listings across multiple pages.
- Fixed job detail rendering to support HTML descriptions (removed raw tag display).
- Fixed premature job expiration by increasing the freshness window from 10 minutes to 2 hours.
- Improved description parsing to strip hidden JSON metadata and script tags from portals like BambooHR.
- Improved Government of Canada (GC) descriptions by aggressively stripping out noisy "Share this page" social widgets and modification footers during the scraping phase.
- Fixed UI parsing bug where "Vacancies" would sometimes extract a full sentence with HTML tags; it is now strictly numeric or hidden.
- Fixed "messy" job titles by aggressively filtering out conversational preambles, marketing fluff, and internal job codes during the scraping phase.
- Removed fragile, regex-based "Qualifications" and "Responsibilities" extractions from the UI; the application now relies entirely on the beautifully rendered, clean HTML full descriptions.
- Standardized "ActionGroup" icons (Apply, Bookmark) consistent across list and detail views.

### Changed
- Moved all job metadata (Salary, Mode, Vacancies, etc.) into a focused left sidebar.
- Removed decorative icons from headers and panels for a more minimal, professional look.
- Refactored list rows to a clean, border-bottom style without boxed containers.
- Unified the "Apply" and "Bookmark" actions into a single group across the app.
- Standardized terminology to "Companies" throughout the entire application.

### Fixed
- Fixed persistent header baseline alignment for all navigation items.
- Fixed search bar clipping and "muddy" background issues.
- Fixed filter reset logic to clear filters without navigating away from the current view.
- Ensured `jobs.sqlite` is correctly ignored by git.
