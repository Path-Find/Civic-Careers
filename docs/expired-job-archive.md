# Expired-job archive

## Decision

Move Civic Careers off Turso. Use Neon as the long-term database, keep the
live/current data small, and store searchable parsed fields for expired jobs in
an archive schema or database there. Do not keep the full captured source page
in Neon indefinitely.

The full source capture belongs in compressed object storage with a retention
policy. The archive database keeps the pointer and provenance needed to find or
remove it.

Turso is migration source and rollback only. It must not receive new archive
data or become a second paid long-term database.

## Data ownership

### Current Neon database

- active jobs and jobs still being parsed;
- `raw_jobs.raw_text` for active or unverified jobs;
- saved-job state and a small expired-job tombstone while old URLs remain
  supported;
- stable `id`, `public_id`, source, URL, and archive state.

### Neon archive schema/database

- the complete parsed `job_details` fields;
- stable identifiers, source, URLs, first/last-seen dates, closing date, and
  archived date;
- saved state if the archived-jobs view supports saved history;
- raw-capture metadata: object key, SHA-256, byte size, captured-at, and
  delete-after date.

The archive database must not be joined into normal current-job requests. Its
data is read only by explicit history/admin paths.

### Object storage

Store the captured source text as compressed objects, for example:

`civic-careers/raw-jobs/<id>/<sha256>.txt.gz`

Use the content hash to avoid storing identical captures twice. Keep the raw
object for a defined period after expiry (initial recommendation: 180 days),
then delete the object while retaining the parsed fields and provenance.

## Archive lifecycle

1. Select an expired or delisted job from Turso in a bounded migration batch.
2. Write its parsed fields to Neon.
3. Compress and upload its raw capture, if present.
4. Re-fetch the archive row and object metadata.
5. Mark the Neon current row archived and remove the large raw payload from the
   Neon current database only after verification.
6. Run a separate retention job that deletes objects whose `delete_after` has
   passed.

Every step must be idempotent. A retry must update the same archive record and
must not create duplicate objects or delete the current copy prematurely.

## Safety rules

- Never archive active, pending, unparsed, or unverified jobs.
- Never delete the current copy in the same step that first writes the archive.
- Keep a tombstone for stable URLs, saved-job references, and possible
  reactivation.
- Use bounded batches; do not run `COUNT(*)`, `ORDER BY RANDOM()`, or a full
  raw-text aggregation during the migration.
- Alert on archive database size, object-storage bytes, and objects pending
  deletion.

The read-only planner in `scraper/plan-expired-job-archive.ts` is the first
stage. It reports bounded candidates and payload sizes from Turso without
mutating live data. After Neon is verified in production, keep Turso only for
the agreed rollback window, then cancel the Turso plan.
