# Expired-job archive

## Decision

Move Civic Careers off Turso. Use Neon as the long-term database, keep the
live/current data small, and store expired jobs directly in a separate Neon
archive database. There is no intermediate expired-job database and no required
R2 handoff.

R2 or another object store is optional only if raw source captures eventually
need cheaper long-term blob storage. It is not part of the first migration.

Turso is migration source and rollback only. It must not receive new archive
data or become a second paid long-term database.

## Data ownership

### Current Neon database

- active jobs and jobs still being parsed;
- `raw_jobs.raw_text` for active or unverified jobs;
- saved-job state and a small expired-job tombstone while old URLs remain
  supported;
- stable `id`, `public_id`, source, URL, and archive state.

### Neon archive database (`civic_careers_archive`)

- the complete parsed `job_details` fields;
- stable identifiers, source, URLs, first/last-seen dates, closing date, and
  archived date;
- saved state if the archived-jobs view supports saved history;
- the raw capture needed for archive inspection during the retention window;
  a later blob-storage change can move only this large field without changing
  the parsed archive contract.

The archive database must not be joined into normal current-job requests. Its
data is read only by explicit history/admin paths.

## Archive lifecycle

1. Select an expired or delisted job from the current database.
2. Copy its job, parsed fields, raw capture, and related history directly into
   the Neon archive database.
3. Re-fetch both sides and verify the archive row before deleting the current
   copy.
4. Run a separate retention job if archived raw captures should eventually be
   removed while retaining parsed fields.

Every step must be idempotent. A retry must update the same archive record and
must not create duplicate objects or delete the current copy prematurely.

## Safety rules

- Never archive active, pending, unparsed, or unverified jobs.
- Never delete the current copy in the same step that first writes the archive.
- Keep a tombstone for stable URLs, saved-job references, and possible
  reactivation.
- Use bounded batches; do not run `COUNT(*)`, `ORDER BY RANDOM()`, or a full
  raw-text aggregation during the migration.
- Alert on archive database size and raw-capture retention volume.

The read-only planner in `scraper/plan-expired-job-archive.ts` is the first
stage. It reports bounded candidates and payload sizes from Turso without
mutating live data. After Neon is verified in production, keep Turso only for
the agreed rollback window, then cancel the Turso plan.
