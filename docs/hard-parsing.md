# Civic Careers: hard parsing

Use this document when the goal is to complete and verify the structured job
record after a job has been soft-parsed. Use `QUALITY.md` for every field-level
decision and correction.

## Result

A hard-parsed job has:

- a complete `job_details` row;
- structured fields and narrative reviewed against `QUALITY.md`;
- `raw_jobs.parsed_at IS NOT NULL` only after the saved record is re-fetched
  successfully.

Before hard parsing, the job can already be visible if it has a valid title,
source link, and source-backed closing date. While `parsed_at IS NULL`, it must
show **Details pending**.

## Procedure

1. Select soft-parsed rows from the normal `raw_jobs.parsed_at IS NULL` queue.
2. Read the stored raw source capture. Follow `QUALITY.md` for every structured
   field, address, duration, eligibility field, and description.
3. Fill only what the source supports. Use `null` or the documented empty value
   when the source does not provide a field; do not guess.
4. Manual parsing in the conversation is valid. Do not call DeepSeek or another
   paid provider unless the user explicitly authorizes that provider run.
5. Save the complete `job_details` record.
6. Preserve a manually confirmed closing date if a later scraper capture does
   not repeat it. A scrape miss must not erase a confirmed deadline.
7. Re-fetch the saved record and verify it against `QUALITY.md`.
8. Only then set `raw_jobs.parsed_at = CURRENT_TIMESTAMP`.
9. Re-fetch once more and confirm the job has left the **Details pending** state
   without losing its closing date or source link.

## Do not do this

- Do not mark a job hard-parsed merely because a `job_details` row exists.
- Do not use an employment end date as the application closing date.
- Do not clear a confirmed pending closing date because the latest scrape did
  not find it.
- Do not make a no-date job public by filling unrelated fields.
- Do not publish a portal-navigation shell as a job title.
- Do not claim completion from a local write alone; verify the deployed API/UI.

## Final checks

For each hard-parsed job, verify:

- the source evidence supports the structured fields and description;
- the closing date remains the application deadline and is not an employment
  end date;
- `job_details` is complete according to `QUALITY.md`;
- `raw_jobs.parsed_at IS NOT NULL` only after successful save and re-fetch;
- the API no longer reports `details_pending = 1`;
- the public page displays the completed details correctly.
