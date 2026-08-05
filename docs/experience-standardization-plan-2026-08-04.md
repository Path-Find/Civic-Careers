# Experience field standardization plan

## Current audit

The live `job_details` corpus contains 9,048 jobs, 3,269 jobs with Experience data, and 3,471 stored entries after the duration-only migration.

The migrated field remains valid JSON with one duration format:

- All populated Experience values are numeric duration labels (`N years`, `N+ years`, `N–M years`, or month equivalents).
- Domain-only, recent, qualitative, and alternative detail is preserved in Qualifications bullets.
- 4,163 rows were rewritten; the repeat dry run reports zero changes.

The existing formatter improves some prefixes, but it does not define one complete format and it cannot repair source text that was already truncated.

## Canonical format

Keep `experience_requirements` as a JSON array of strings. Each item stores only a numeric duration; domain detail and non-numeric experience requirements belong in Qualifications.

Use these forms:

| Source meaning | Stored/display form |
| --- | --- |
| Minimum or at-least threshold | `N+ years` |
| Bounded range | `N–M years` |
| Month threshold | `N+ months` |
| Exact duration | `N years` or `N months` |
| Recent / qualitative / domain-only requirement | Preserve the requirement in Qualifications; do not store it in Experience |
| Alternatives | Keep the complete source bullet in Qualifications; store the leading numeric duration when one exists |

Normalization rules:

1. Convert number words to numerals.
2. Convert `minimum`, `a minimum of`, and `at least` to `+` only when the requirement is a threshold.
3. Use an en dash for ranges.
4. Store the duration alone; keep domain and condition detail in Qualifications.
5. Remove shells such as `experience in`, `experience with`, and repeated `experience` wording from the structured duration value; preserve the full requirement in Qualifications.
6. Remove trailing punctuation and collapse whitespace.
7. Preserve named systems, locations, credentials, alternatives, and qualifying conditions.
8. Never invent a duration. Domain-only, recent, and qualitative entries remain in Qualifications only.

Multiple independent requirements remain separate array items. The UI should join them with `; `, not a comma, so separate requirements remain visually distinct.

## Recovery rules

The 39 unmatched-parenthesis entries must not be normalized as if they were complete.

1. Re-extract each affected requirement from the cleaned description.
2. If the description is incomplete, retry against the stored raw source text.
3. Keep the recovered complete requirement only when the source contains a complete clause.
4. If neither source contains a complete clause, remove the damaged fragment rather than inventing its ending.
5. Add regression fixtures for the recovered and removed cases.

Long entries are not truncated to meet an arbitrary character limit. Instead, store the numeric duration only and preserve the complete source requirement in Qualifications. Keep alternatives intact when splitting would lose meaning.

## Implementation sequence

1. Make the scraper normalizer the single source of truth for parse-time validation, reconciliation, and backfill.
2. Add fixtures covering thresholds, ranges, months, recent/qualitative wording, domain-only wording, alternatives, multi-item lists, and source recovery.
3. Make the web formatter presentation-only: it should display the canonical stored form and avoid a second competing normalization policy.
4. Run a dry-run over all 9,048 jobs and produce counts plus a sample diff for human review.
5. Apply the backfill in batches, preserving `verified_at` and writing one audit report.
6. Run the backfill a second time; the required result is zero changes.

## Completion checks

- Every populated value is a valid JSON array of non-empty strings.
- No value begins with an unnormalized threshold shell (`Minimum`, `At least`, `A minimum of`).
- Numeric ranges use an en dash.
- No value has an unmatched opening parenthesis.
- No duplicate entries remain within a job.
- Alternatives remain explicit.
- The dry-run backfill reports zero changes after application.
- Full scraper tests, web build, and web lint pass.
