# Holistic database audit: 2026-08-03

## Scope and method

This was a fresh deterministic 2% sample of the current `jobs` and `job_details` tables after the targeted description-cleanup work.

- Database rows: 5,149
- Sample size: 103 rows, exactly 2% rounded up
- Sources represented: all 70 source names
- Sampling method: stable source-balanced selection by job ID, with one row per source and additional rows allocated to larger sources
- Raw comparison: sampled rows were compared with their stored `raw_jobs.raw_text`
- No AI calls and no manual per-record edits were used for the audit

The checks looked for missing or generic URLs, empty or unusually short/long descriptions, repeated paragraphs, residual known boilerplate, missing core fields, missing dates, and possible gaps or mismatches in deterministic structured fields.

## Results

| Signal | Rows |
| --- | ---: |
| Empty description | 0 |
| Description under 250 characters | 1 |
| Description over 8,000 characters | 0 |
| Generic-looking URL | 2 |
| Repeated paragraphs | 0 |
| Remaining known boilerplate | 0 |
| Missing closing date | 15 |
| Missing posted date | 72 |
| Possible missing structured values | 4 |
| Possible structured-value mismatches | 30 |

## Findings

- `vaughanpl_3` (Vaughan Public Library, Circulation Assistant) is 96 characters and contains only empty section headings. The backfill refused to replace it with an empty description. This needs the separate PDF/application-form handling already tracked in Issue #75.
- `adp_1431` (Municipality of Clarington) and `adp_4720` (City of Markham) are inactive historical rows that still use generic ADP recruitment URLs without a posting identifier. Issue #150 already confirms that no active generic ADP rows remain, so no further change was made.
- The 4 possible missing structured values were false positives after inspection: three University of Ottawa course records exposed French language-of-instruction metadata rather than an employment language requirement, and one Brock compensation-rate sentence was mistaken for an education requirement.
- The 30 possible structured mismatches were mostly duplicate wording from raw text plus stored canonical values, or a specific benefit such as OMERS alongside a broader benefits list. No broad automatic rewrite is justified from this sample.
- Missing dates are source-dependent in this sample. They are not by themselves evidence that the parser dropped a date.

## Result

The 2% audit found no broad description or core-field failure. It confirmed one known short/empty-section Vaughan record and two generic ADP links for targeted follow-up. The remaining signals are review queues, not automatic backfill candidates.
