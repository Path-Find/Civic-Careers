# Language field normalization — 2026-08-04

Ran `scraper/backfill-normalize-languages.ts --apply` against Turso `job_details.language_requirements`.

Scanned: 2020 filled fields (all jobs).
Updated: 1.
Cleared to empty: 0.

## Rules applied

- Canonical tokens via `normalizeLanguageRequirements()` in `requirements.ts`
- Plain names only: English | French | Bilingual | named other
- Drop Essential / needed / required / proficiency fluff and PSC profiles (BBB/BBB, CBC/CBC)
- Stable sort: English, French, other named languages, Bilingual last

## Updated job IDs

| ID | Source | Title | From | To |
|---|---|---|---|---|
| `2435876` | Government of Canada | Veterinarian – Animal Health | `["French Essential","Bilingual (BBB/BBB)"]` | `["French","Bilingual"]` |

## IDs only

```
2435876
```
