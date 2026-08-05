# Job Listing Quality Criteria

What makes a job listing correct in this database. Use this to review any listing — an existing one flagged as wrong, a new source being onboarded, or a change to `parser.ts`/`requirements.ts`/`source-description-cleanup.ts`. Every rule below was written after finding a real, live example of it being violated; the source job ID is noted where useful so the pattern can be re-checked.

A listing fails review if it violates any of these. "Looks basically right" is not a pass — check every rule.

## 0. One fact, one spelling

When a structured field has a canonical form, every listing uses that form — same token, same casing. Do not leave free-text variants that mean the same thing (`Toronto` vs `Toronto, ON` vs `Toronto, Ontario, Canada`; `English Essential` vs `English`).

**Location** (always):

- Single site: `City, XX` with a two-letter province/territory code — e.g. `Guelph, ON`
- Multiple sites: `Guelph, ON; Toronto, ON; Hamilton, ON` (semicolon + space)
- Prefer empty over inventing a city or guessing a wrong province
- Implemented by `normalizeLocation()` in `scraper/location.ts` (parse path + corpus backfill)

**Languages** (always):

- Plain names only: `English`, `French`, `Bilingual`, `Spanish`, `American Sign Language`, etc.
- No extra words: not `French needed`, `English Essential`, `Bilingual (BBB/BBB)`, PSC levels, or proficiency fluff
- Implemented by `normalizeLanguageRequirements()` in `scraper/requirements.ts` (parse/validate path + backfill)

**Work mode** (always):

- Stored tokens only: `On-site` | `Hybrid` | `Remote` (never free text)
- Synonyms map on parse: in-person/on-site/office → `On-site`; WFH/virtual/online/telework → `Remote`; blended/partial remote → `Hybrid`
- UI may display `On-site` as “In-person”; storage stays `On-site`
- Implemented by `normalizeWorkModel()` in `scraper/validate.ts` (validate + parser write path)

Other fields get the same treatment as their vocabulary lands (see GitHub issue on canonical field vocabulary).

## 1. No fact appears in two places

If a structured field holds a fact (`salary_min`/`salary_max`, `work_model`, `duration`, `location`, `hours`, `availability`, `security_check_required`, `is_unionized`/`union_name`, `medical_requirements`, etc.), that fact must not *also* sit as prose in `description`. This applies even when the structured field and the prose use different wording — "Hybrid work eligible" duplicates `work_model: "Hybrid"` just as much as a verbatim repeat.

- Examples fixed: TDSB restating salary/duration/work-mode in "Compensation & Benefits" (already in `salary_min`/`duration`/`work_model`); City of St. Catharines' and Belleville's raw Position Type/Employee Group/Salary metadata blocks; CMHC's "Position Status/Language Designation/Security Requirement" block.
- Check both directions: a field can be missing *and* the fact still sit unused in prose (e.g. `hours` was null DB-wide while dozens of postings stated "35 hours per week" in text). Extract first, then delete the prose — never just delete.

## 2. No fact appears twice within the description itself

`Overview` restating the first bullet of `Responsibilities` in different words is the same defect as #1, just prose-vs-prose instead of prose-vs-field. Verified against real examples (University of Ottawa Event Coordinator, City of Red Deer Financial Analyst) where `Overview` was a near-verbatim compression of a `Responsibilities` bullet — both sections render on the same page back to back, so this reads as repetition, not a useful summary-then-detail structure.

`Overview` earns its place only when it states something `Responsibilities`/`Qualifications` doesn't — e.g. course curriculum content on a teaching posting (what the course *covers*, distinct from the generic "prepare content, mark assignments, submit grades" duties every course posting shares). When in doubt, diff the two sections sentence by sentence before deciding `Overview` is worth keeping.

## 3. No fact appears twice within the same field category

`required_skills` and `software_requirements` were extracted independently and could both list "Microsoft Office" — including alias mismatches like "Microsoft Word" (skills) vs "Word" (software) that looked different but meant the same thing. `education_requirements` could contain the entire `experience_requirements` sentence appended via "and" ("...and seven years of experience...").

Any two fields extracted from the same source text need a de-dup pass against each other, not just against `description`.

## 4. Every section is about the job, not the employer or the city

Strip: employer mission statements, "we are an equal opportunity employer" paragraphs, city-tourism copy ("known as the Friendly City," population figures, "world-class fishing and boating"), "exciting opportunity to join us" filler, awards/rankings, land acknowledgements. None of this helps a candidate decide whether to apply or what they'd be doing — it's marketing, not job content. This applies inside `Overview` specifically, since that's the free-form section most likely to absorb it (there's no structured field pulling it out the way there is for salary or duration).

## 5. No raw scraper artifacts survive into prose

A `Label: value` metadata block copied straight from the source page (Position Type, Employee Group, File Number, Job Requisition ID, etc.) is not a description — it's un-parsed data. Every field in it must be extracted into its structured column or explicitly judged low-value and dropped; it must never just sit in `description` as a wall of colons.

## 6. Application-process instructions aren't qualifications

"Attend a career presentation," "submit your application form," "pass the skills test" describe *how to apply*, not what the candidate must already have. Don't let AI-generated descriptions (or hand-written overrides) file these under `## Qualifications` — that section is for prerequisites, not process steps. If a hand-written override merges the same process into two sections with different headings ("Qualifications" and "Selection process" both listing the same steps), that's a duplication bug, not two distinct pieces of content.

## 7. A listing built from the wrong source page is worse than an incomplete one

If a posting has no salary, no real duties, and only "how to apply" content, check whether it was built from a process/landing page rather than the site's actual job page before assuming the source has nothing more to give (verified case: an RCMP override built from `/application-process` when `/what-we-do` and `/compensation` had the real content all along). An empty field is honest; a field padded from the wrong page is not.

## 8. Structured fields must be internally consistent

`is_unionized: 1` paired with `union_name: "Non-Union"` is a contradiction, not a duplication — one of the two extractions is simply wrong. Any two fields that describe the same underlying fact (union status, employment type vs. duration, salary range vs. salary period) should be checked against each other, not just checked for existing.

## 9. Contact info and application logistics don't belong in the description

HR staff names and personal emails ("Hiring organization contact"), "Learn more about applying," "Additional links" (self-promotion, unrelated videos) are not job content. If a field exists for the application URL, that's where "how to apply" lives — not as prose the candidate has to read past.

## How to apply this to a new source

1. Pull every row for the source, not just the one flagged. A pattern found in one row is either present in most (fix generically) or genuinely one-off (fix that row only) — check before deciding which.
2. For every rule above, check whether it's violated. Don't stop at the first one found — the RCMP listing alone had violations of #1, #4, #6, and #7 stacked in a single row.
3. Verify any regex/extraction fix against the *whole* corpus before applying, not just the row that prompted it. A rule tuned to one example can silently corrupt hundreds of others (a rushed education-field regex briefly mangled 239 unrelated rows before being caught in review — always diff old-vs-new extraction output across every affected row before running `--apply`).
4. A fix that works for one source's exact template rarely generalizes to a different source's template — verify per source, not just per rule.
