# Language field normalization — 2026-08-04

Ran `scraper/backfill-normalize-languages.ts --apply` against Turso `job_details.language_requirements`.

Scanned: 2020 filled fields (all jobs).
Updated: 1.
Cleared to empty: 0.

## Rules applied

- Canonical tokens via `normalizeLanguageRequirements()` in `requirements.ts`
- Collapse bare `Bilingual` under more specific bilingual forms
- Drop standalone English/French when `Bilingual (English/French)` is present
- Essential supersedes plain language name
- PSC levels uppercased (`bbb/bbb` → `BBB/BBB`); `CBC level` → `CBC/CBC`
- Multi-level imperative phrases expand to one token per level
- Stable sort: Essential → plain EN/FR → other languages → Bilingual…

## Updated job IDs

| ID | Source | Title | From | To |
|---|---|---|---|---|
| `2435876` | Government of Canada | Veterinarian – Animal Health | `["French Essential","Bilingual (BBB/BBB)"]` | `["French","Bilingual"]` |

## IDs only

```
2435876
```
