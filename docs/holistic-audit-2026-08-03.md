# Holistic database audit: 2026-08-03

## Scope and method

This was a fresh deterministic, source-balanced 2% sample of the current `jobs`/`job_details` database after the targeted source-cleanup work. The reusable audit is implemented in `scraper/audit-holistic-sample.ts`.

- Database rows: 5,149
- Sample size: 103 rows
- Sources represented: all 70 sources
- Sampling method: a stable hash-selected quota per source, with every source represented at least once
- Raw comparison: the sampled rows were compared with their stored `raw_jobs.raw_text`
- No AI calls and no manual per-record edits were used for the audit

The checks looked for missing or generic URLs, empty or unusually short/long descriptions, missing section structure, residual boilerplate, raw requirements that were not reflected in the stored structure, possible language/licence/software gaps, and missing posted dates.

The automated flags below are candidate signals, not confirmed defects. Course titles, French-language postings, platform UI text, and role-specific words such as “LinkedIn” create false positives.

| Candidate signal | Rows |
| --- | ---: |
| Missing closing date | 15 |
| Missing posted date | 72 |
| Mismatched structured values | 30 |
| Missing structured values | 4 |
| Generic-looking URL | 2 |
| Repeated paragraph | 0 |
| Short description under 250 characters | 1 |
| Empty description | 0 |
| Residual boilerplate | 0 |

## Confirmed findings

### Retired federal posting still active — Issue #160

Government of Canada row `2352259` is marked `is_active = 1`, but its latest raw page says the job has moved or is no longer available. The stored description is empty. This is a scraper state/retired-posting defect, not a description-cleanup issue.

The related row `2352273` has the same retired-page marker but is already inactive (`is_active = 0`), so it is not currently exposed as an active job.

### Existing parser-loss report — Issue #131

The Burlington `Senior Skate Patrol` record was also confirmed during the child-issue review. Its raw posting contains a minimum-age requirement and First Aid/CPR requirement, while the stored description contains only Responsibilities. This is parser completeness/data loss, not removable boilerplate.

## Reviewed non-defects and follow-up queues

- The two generic-looking URLs were ADP recruitment URLs. They require source-link review before being called wrong; the audit did not change them.
- The language candidates included three University of Ottawa rows where deterministic extraction found bilingual wording not present in the stored field, plus French-titled or course-related rows. They are candidate field-level follow-ups, not proof that every flag is a defect.
- The education, licence, benefits, and language mismatch counts include duplicate or broader deterministic matches. They require field-level review before any backfill.
- The one short description was Vaughan Public Library's `Circulation Assistant`. Its raw record is an application form with availability and upload fields but no role-description text; the backfill safety guard correctly avoids replacing its stored headings with an empty description.
- The repeated paragraph was a City of Thunder Bay posting and needs source-specific review before deletion.
- The actual shortened Metrolinx employer-introduction variant was fixed and backfilled in commit `607881f`; the final Metrolinx source-only dry run was zero.

## Result

The 2% audit is complete. It produced one new high-confidence tracked defect (#160) and confirmed one existing parser-loss defect (#131). The remaining signals are queued for targeted source/parser review rather than broad automatic edits.
