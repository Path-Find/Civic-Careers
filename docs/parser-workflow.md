# Civic Careers: soft parsing and hard parsing workflow

Use this document for Civic Careers data work. Use the repository's `QUALITY.md`
for field-by-field parsing and correction guidance. Do not duplicate or replace
that document.

## The two states

### Soft-parsed

A soft-parsed job has:

- a valid source capture in `raw_jobs`;
- a shell row in `jobs` with `is_active = 1`;
- a source-backed application closing date in `raw_jobs.pending_closing_date`;
- `raw_jobs.pending_closing_date_status = 'known'`;
- `raw_jobs.parsed_at IS NULL`.

The job may have safe pending metadata such as title, location, salary text,
student status, duration, and application link. An older `job_details` row may
remain for recovery, but the API must treat `parsed_at IS NULL` as pending and
the UI must show **Details pending** instead of the parsed body.

### Hard-parsed

A hard-parsed job has:

- a complete `job_details` row;
- `raw_jobs.parsed_at IS NOT NULL`;
- structured fields and narrative reviewed against `QUALITY.md`.

Hard parsing can happen later. The job does not need to wait for every field to
be complete before it becomes visible, as long as the application closing date
and a valid title/source link are present.

## Visibility rules

The application closing date is the critical visibility field.

- No concrete application closing date: keep the job hidden, even if education,
  salary, location, or other fields are filled in.
- Concrete closing date today or later plus a valid title and source link: show
  the job.
- Soft-parsed visible job: show **Details pending**.
- Past closing date: do not show it as an active public job.
- No meaningful title or source link: keep the row hidden; never publish a
  portal-navigation shell such as `Skip to Main Content` or `Skip To Job
  Description`.

“Application closing date” means the last date to apply. It is not the job's
employment end date. If the source gives only an employment end date, follow
`QUALITY.md` and the field contract for `duration`; do not use it as
`pending_closing_date`.

## Soft-parse procedure

1. Read the current Neon database directly. Do not use a stale local SQLite
   file, and do not silently fall back to Turso.
2. Select active jobs with no effective closing date. The effective date is:
   `job_details.closing_date`, falling back to `raw_jobs.pending_closing_date`.
3. Search the stored `raw_jobs.raw_text` for source evidence near phrases such
   as `closing date`, `deadline`, `apply by`, `apply before`, `last day to
   apply`, `applications must be received by`, `expires`, `posting closes`, or
   equivalent wording.
4. Store a date only when the raw text directly ties that date to the
   application deadline. Never infer a date from scrape time, posted date,
   start date, employment end date, a generic year, or a URL.
5. Exclude past dates, invalid captures, missing titles, missing source links,
   and navigation/page-shell titles.
6. Dry-run the exact batch first. Print the count, public IDs, sources, titles,
   dates, and enough keyword evidence to audit the selection.
7. On explicit approval, write:

   - `raw_jobs.pending_closing_date = YYYY-MM-DD`;
   - `raw_jobs.pending_closing_date_status = 'known'`;
   - `raw_jobs.parsed_at = NULL`;
   - `jobs.verified_at = NULL` if the row was previously verified;
   - one `manual_review_changes` audit record per job.

   Retain any existing `job_details` row for recovery. Do not delete parsed
   data just to create the pending state.

8. Re-query the exact batch and require every row to have:

   - active status;
   - a known closing date today or later;
   - `parsed_at IS NULL`;
   - a valid title and source URL;
   - an audit record;
   - no loss of the existing `job_details` row.

## Hard-parse procedure

When parsing capacity is available:

1. Select soft-parsed rows from the normal `raw_jobs.parsed_at IS NULL` queue.
2. Use the raw source capture as evidence and follow `QUALITY.md` for every
   structured field and the description.
3. Do not call DeepSeek or another paid provider unless the user explicitly
   authorizes that provider run. Manual parsing in the conversation is valid.
4. Save the complete `job_details` record.
5. Preserve a manually confirmed closing date if the parser does not see it on
   a later scrape.
6. Set `raw_jobs.parsed_at = CURRENT_TIMESTAMP` only after the hard parse is
   saved and re-fetched successfully.
7. Verify the fields, then the job naturally leaves the **Details pending**
   state.

## Safe Neon commands

Always provide both Neon connection variables explicitly. The local
`.env` may contain Turso credentials, and an omitted Neon variable must be
treated as an error rather than a fallback.

```sh
cd scraper

NEON_CURRENT_DATABASE_URL="$(neon connection-string main \
  --project-id delicate-unit-86853096 \
  --database-name civic_careers)" \
NEON_ARCHIVE_DATABASE_URL="$(neon connection-string main \
  --project-id delicate-unit-86853096 \
  --database-name civic_careers_archive)" \
npm run backfill-hidden-pending -- --limit=100
```

Use `--apply` only after reviewing the dry-run output:

```sh
... npm run backfill-hidden-pending -- --limit=100 --apply
```

The script must refuse to run without explicit Neon connection variables.
Never run a production write through the local Turso fallback.

## Final verification checklist

Before reporting success, verify all of the following against Neon and the
deployed API:

- the requested number of jobs was processed;
- every job has a source-backed closing date today or later;
- every job is active and has a valid title and link;
- every soft-parsed job has `parsed_at IS NULL`;
- every soft-parsed job returns `details_pending = 1`;
- the public API includes every job;
- the UI shows **Details pending**;
- no past-date or no-date job became public;
- every change has an audit record;
- the parser can later hard-parse the rows without losing the confirmed date.

Do not claim the website requirement is complete until the deployed API/UI has
been checked. A local commit or database query alone is not live-site proof.
