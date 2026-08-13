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
- `raw_jobs.raw_text` for active jobs;
- saved-job state and the live scraper/parser state;
- stable `id`, `public_id`, source, URL, and archive state.

### Neon archive database (`civic_careers_archive`)

- the complete parsed `job_details` fields;
- stable identifiers, source, URLs, first/last-seen dates, and closing date;
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
3. Verify every copied related row in the archive before deleting the current
   copy. The move code uses separate transactions because the databases cannot
   share one transaction; if deletion fails, a retry is safe and idempotent.
4. Run a separate retention job if archived raw captures should eventually be
   removed while retaining parsed fields.

Every step must be idempotent. A retry must update the same archive record and
must not create duplicate objects or delete the current copy prematurely.

## Safety rules

- Ongoing expiry moves archive only rows selected by the scraper/parser as
  expired, delisted, or discarded. The initial Turso copy preserves every
  existing row for parity, including already-inactive or unverified rows.
- Never delete the current copy in the same step that first writes the archive.
- Keep a tombstone for stable URLs, saved-job references, and possible
  reactivation.
- Use bounded batches; do not run `COUNT(*)`, `ORDER BY RANDOM()`, or a full
  raw-text aggregation during the migration.
- Alert on archive database size and raw-capture retention volume.

## Cutover and rollback

Before cutover, run the schema preparation, migration, and parity verifier on
the exact Neon production branch. Keep Turso unchanged as the rollback source.
After cutover, Neon is authoritative and Turso is stale; do not roll back by
simply redeploying the old application after Neon has received new writes.

For an emergency rollback, freeze scraper/parser/API writes, run the dry-run
`scraper/migrate-neon-to-turso.ts`, review its table totals, then rerun it with
`--apply`. Verify Turso before redeploying the previous application. The export
only upserts and never deletes Turso rows, so it can be retried safely.

The read-only planner in `scraper/plan-expired-job-archive.ts` is the first
stage. It reports bounded candidates and payload sizes from Turso without
mutating live data. After Neon is verified in production, keep Turso only for
the agreed rollback window, then cancel the Turso plan.
