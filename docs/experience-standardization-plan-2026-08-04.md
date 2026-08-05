# Experience field standardization plan

## Current audit

The live `job_details` corpus contains 9,048 jobs, 4,229 jobs with Experience data, and 6,099 stored entries.

The current field is valid JSON, but the wording is inconsistent:

- 1,706 entries begin with `Minimum`.
- 199 begin with `At least`.
- 163 use numeric ranges.
- 68 use months instead of years.
- 2,304 have no explicit duration and are domain-only experience statements.
- 612 are longer than 160 characters; 60 are longer than 240.
- 39 end with an unmatched opening parenthesis, showing that the stored text was cut off.

The existing formatter improves some prefixes, but it does not define one complete format and it cannot repair source text that was already truncated.

## Canonical format

Keep `experience_requirements` as a JSON array of strings. Each item must represent one requirement and must preserve the source meaning.

Use these forms:

| Source meaning | Stored/display form |
| --- | --- |
| Minimum or at-least threshold | `N+ years — domain` |
| Bounded range | `N–M years — domain` |
| Month threshold | `N+ months — domain` |
| Recent experience | `Recent — domain` or `Recent (within past N years) — domain` |
| Qualitative duration | `Several years — domain` |
| Domain-only requirement | `Experience with domain` |
| Alternatives | Keep one item with `or`; do not collapse alternatives into one threshold |

Normalization rules:

1. Convert number words to numerals.
2. Convert `minimum`, `a minimum of`, and `at least` to `+` only when the requirement is a threshold.
3. Use an en dash for ranges.
4. Put the duration or recency first, followed by ` — ` and the domain.
5. Remove shells such as `experience in`, `experience with`, and repeated `experience` wording without removing the domain.
6. Remove trailing punctuation and collapse whitespace.
7. Preserve named systems, locations, credentials, alternatives, and qualifying conditions.
8. Never invent a duration. Domain-only entries remain domain-only.

Multiple independent requirements remain separate array items. The UI should join them with `; `, not a comma, so separate requirements remain visually distinct.

## Recovery rules

The 39 unmatched-parenthesis entries must not be normalized as if they were complete.

1. Re-extract each affected requirement from the cleaned description.
2. If the description is incomplete, retry against the stored raw source text.
3. Keep the recovered complete requirement only when the source contains a complete clause.
4. If neither source contains a complete clause, remove the damaged fragment rather than inventing its ending.
5. Add regression fixtures for the recovered and removed cases.

Long entries are not truncated to meet an arbitrary character limit. Instead, split clearly independent clauses into separate items. Keep a long single requirement intact when splitting would lose meaning.

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
