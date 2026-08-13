# Civic Careers job lifecycle

This document defines the layers between a source posting and a fully parsed
Civic Careers job. It prevents “details pending,” source metadata, and parsed
job details from being treated as the same thing.

## The layers

| Layer | Stored in | Meaning | Public behavior |
| --- | --- | --- | --- |
| Source capture | `raw_jobs` | The latest source URL, source text, title, and scrape timestamps | Evidence only; not a full Civic Careers job |
| Soft-published listing | `jobs` + `raw_jobs` with `raw_jobs.parsed_at IS NULL` | A searchable job shell exists and the full parse is queued or being prepared; an older detail row may remain available for recovery | Show the title, employer, link, and safe pending metadata; keep the body as **Details pending** |
| Pending application metadata | `raw_jobs.pending_*` | High-confidence facts extracted or manually checked without full parsing | Show only facts with clear source support |
| Fully parsed listing | `job_details` and `raw_jobs.parsed_at IS NOT NULL` | The normal structured Civic Careers record exists | Show the complete parsed job |

The API exposes `details_pending = 1` when `raw_jobs.parsed_at IS NULL` or the
job has no `job_details` row. A soft-published listing is still a real public
listing; “pending” describes the depth of our processing, not whether the
source job is valid.

## Pending application-deadline statuses

These statuses apply to details-pending listings in
`raw_jobs.pending_closing_date_status`:

| Status | Meaning | Date field |
| --- | --- | --- |
| `known` | The source gives an exact last date to apply | `pending_closing_date` contains `YYYY-MM-DD` |
| `open_until_filled` | The source explicitly says the posting remains open until filled, a suitable candidate is found, or equivalent wording | Empty |
| `not_listed` | The source posting does not provide a last date to apply | Empty; do not infer that the job is ongoing |
| `invalid` | A closing-date field exists, but its value is unusable or malformed | Empty; needs review if the posting matters |
| `not_checked` | No source check has been completed yet | Empty; this is an internal review queue, not a public conclusion |
| `blocked` | A source page could not be captured after a retry, such as a bot challenge, expired page, or non-rendering portal | Empty; hidden from public listings and excluded from automatic retries until deliberately reopened |

The target after a review pass is zero `not_checked` rows among active,
details-pending listings. `blocked` is tracked separately so a known source
access problem does not create an endless retry loop.

## Which date is which

- `closing_date` / `pending_closing_date` means the last date to apply. The UI
  labels this **Apply By**.
- `duration` describes the job term. If the source gives only an employment
  end date, use `Term ending YYYY-MM-DD` until a dedicated end-date field
  exists.
- `start_date` is the expected employment start date.
- `posted_at` is the source publication date.

An employment end date must never be used as the application deadline.

## Authority and fallback order

For a fully parsed listing, `job_details.closing_date` is authoritative. For a
details-pending listing, the API falls back to
`raw_jobs.pending_closing_date`. The API exposes a pending status while
`raw_jobs.parsed_at IS NULL`; once the parser completes and sets `parsed_at`,
the listing is treated as fully parsed again.

The source URL remains available on pending listings so a person can open the
original posting when the source does not provide a deadline or when the
pending metadata needs confirmation.

## Rescrape invariant

A later scrape must not erase a manually confirmed pending status or exact
pending date merely because the current extractor failed to see the same field.
In particular, a stored `known` date must survive a blank subsequent scrape.
Source text can be refreshed, but a manual status/date correction is retained
until a new source check deliberately changes it.
