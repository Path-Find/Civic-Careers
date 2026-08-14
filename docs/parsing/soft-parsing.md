# Civic Careers: soft parsing

Use this document when the goal is to make hidden jobs visible by recovering a
source-backed application closing date. Use `QUALITY.md` for field-level rules.

## Result

A soft-parsed job has:

- a valid source capture in `raw_jobs`;
- an active shell row in `jobs`;
- `raw_jobs.pending_closing_date` set to the source-backed last day to apply;
- `raw_jobs.pending_closing_date_status = 'known'`;
- `raw_jobs.parsed_at IS NULL`.

An explicit source status of **Open Until Filled** is also valid pending
application metadata. It stores `pending_closing_date_status =
'open_until_filled'` with no calendar date. It is eligible for public listing;
do not replace it with an invented date.

The same soft-metadata pass must normalize titles. If a captured title is portal
navigation text such as “Skip to Main Content,” use a source title when one is
available; otherwise clear the fake title so the listing remains hidden until a
real title is captured. Existing parsed rows with the same fake heading must be
repaired during hidden-job deadline recovery as well.

For a missing title, a human-readable URL slug is acceptable only when its
words are confirmed in the captured source text. Numeric or generic portal URLs
are not title evidence.

The job may retain an older `job_details` row for recovery. Because
`parsed_at IS NULL`, the API must treat it as pending and the UI must show
**Details pending** instead of presenting the parsed body as complete.

## Eligibility

Select active jobs with no effective closing date. The effective date is
`job_details.closing_date`, falling back to `raw_jobs.pending_closing_date`.
Skip rows whose `pending_closing_date_status = 'blocked'`; those source pages
could not be captured and must be deliberately reopened before retrying.

Search `raw_jobs.raw_text` for direct evidence near phrases such as:

- `closing date` or `deadline`;
- `apply by` or `apply before`;
- `last day to apply`;
- `applications must be received by`;
- `expires` or `posting closes`.

Accept a date only when the source text directly ties it to the application
deadline. Do not infer it from scrape time, posted date, start date, employment
end date, a generic year, or a URL.

Exclude past or invalid dates, missing titles, missing source links, and portal
navigation shells such as `Skip to Main Content` or `Skip To Job Description`.

## Safe procedure

1. Read current Neon directly. Do not use stale local SQLite or silently fall
   back to Turso.
2. Dry-run the exact batch. Print the count, public IDs, source URLs, titles,
   dates, and enough keyword evidence to audit each selection.
3. After explicit approval, write:

   - `raw_jobs.pending_closing_date = YYYY-MM-DD`;
   - `raw_jobs.pending_closing_date_status = 'known'`;
   - `raw_jobs.parsed_at = NULL`;
   - `jobs.verified_at = NULL` if the row was previously verified;
   - one `manual_review_changes` record per job.

4. Retain any existing `job_details` row. Do not delete parsed data just to
   create the pending state.
5. Re-query the exact batch and confirm every row is active, has a known date
   today or later, has a valid title and URL, remains unparsed, retains its
   details row, and has an audit record.

## Neon command

Always provide both connection variables explicitly. The local `.env` may
contain Turso credentials. Missing Neon variables must be an error.

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

The script must refuse to run without explicit Neon variables. Never run a
production write through the local Turso fallback.

## Final checks

Verify against Neon and the deployed API/UI:

- every selected job has a source-backed closing date today or later;
- every selected job is active and has a title and link;
- every selected job has `parsed_at IS NULL` and API `details_pending = 1`;
- every selected job is included publicly and shows **Details pending**;
- no no-date or past-date job became public;
- blocked source captures remain excluded from recovery batches and public listings;
- every change has an audit record;
- a later hard parse can preserve the confirmed date.
