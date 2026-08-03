# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
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
