# Batch 2 notes

- Reviewed 50 current public jobs; confirmed errors, so the audit continued.
- Canada Post: bare pay amounts such as `$23.81` had been stored as yearly; they are hourly and are now normalized as `$23.81 hour`.
- University of Northern British Columbia: generic `Instructor` values were incorrectly stored as academic courses; they are cleared.
- City of Oshawa: Njoyn vacancy titles such as `J0626-0167` are replaced from the labelled vacancy field.
- University of Ottawa: labelled course-posting hours and hourly rates are now extracted by the Workday tenant adapter; 300 current captures were backfilled.
- Toronto Metropolitan University: PeopleSoft compensation blocks now provide hourly salary ranges during deterministic backfill.

Confirmed findings: 5 recurring patterns; 36 TMU rows and 300 Ottawa rows were reviewed by the source-scoped backfills.
