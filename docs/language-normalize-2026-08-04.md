# Language field normalization — 2026-08-04

Ran `scraper/backfill-normalize-languages.ts --apply` against Turso `job_details.language_requirements`.

Scanned: 1194 filled fields (all jobs).
Updated: 30.
Cleared to empty: 0.

## Rules applied

- Canonical tokens via `normalizeLanguageRequirements()` in `requirements.ts`
- Collapse bare `Bilingual` under more specific bilingual forms
- Drop standalone English/French when `Bilingual (English/French)` is present
- Essential supersedes plain language name
- PSC levels uppercased (`bbb/bbb` → `BBB/BBB`); `CBC level` → `CBC/CBC`
- Multi-level imperative phrases expand to one token per level
- Stable sort: Essential → plain EN/FR → other languages → Bilingual…


## Follow-up: double-paren format (same day)

Nested form `Bilingual (English/French) (CBC/CBC)` read as a joke on the job page.
Canonical leveled bilingual is now a single set of parens:

- `Bilingual (English/French, CBC/CBC)`
- `Bilingual (English/French, BBB/BBB)`

30 rows rewritten (22 BBB/BBB, 6 CBC/CBC, 2 with English Essential). Zero double-paren tokens remain.

## Updated job IDs

| ID | Source | Title | From | To |
|---|---|---|---|---|
| `cornwall_81003` | City of Cornwall | Case Manager | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2263508` | Government of Canada | Environmental Public Health Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2263703` | Government of Canada | Environmental Public Health Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2263723` | Government of Canada | Environmental Public Health Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2263737` | Government of Canada | Environmental Public Health Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2263744` | Government of Canada | Environmental Public Health Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2325363` | Government of Canada | Psychologist | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2369109` | Government of Canada | Lecturer, Assistant Professor, Associate Professor, Professor | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2377747` | Government of Canada | Dentist | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2381293` | Government of Canada | Facilities and Building Maintenance Inspectors, Supervisors | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2381371` | Government of Canada | Carpenters, Lead Hands, Supervisors and more | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2382569` | Government of Canada | Marine Communications and Traffic Services (MCTS) Officer – Training Program | `["English Essential","Bilingual (English/French) (BBB/BBB)"]` | `["English Essential","Bilingual (English/French, BBB/BBB)"]` |
| `2391146` | Government of Canada | Instructor, Marine Training (Engineering) | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2392487` | Government of Canada | General Duty Medical Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2417733` | Government of Canada | Peer Support Coordinator / Family Peer Support Coordinator | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2419228` | Government of Canada | Technical Instructor | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2424454` | Government of Canada | Customer Services Representative - Housing Services | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2431398` | Government of Canada | Clinical Psychologist | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2436124` | Government of Canada | Senior Surveyor | `["English Essential","Bilingual (English/French) (BBB/BBB)"]` | `["English Essential","Bilingual (English/French, BBB/BBB)"]` |
| `2437682` | Government of Canada | Electronics Technologist Positions in the Materiel Acquisition & Support Officer Development Program | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2438059` | Government of Canada | IT Infrastructure Support Analyst (Stream 1) and IT Developer (Stream 2) | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2438422` | Government of Canada | Engineering and Scientific Support Technologist | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2440050` | Government of Canada | Shipboard Electrician Officer | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2441034` | Government of Canada | Manager, Labour Relations, Occupational Health and Safety | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2442447` | Government of Canada | Financial Analyst | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2444124` | Government of Canada | Accounting Technician | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2444128` | Government of Canada | IT Support Technician, Level 2 - Digital Environment | `["Bilingual (English/French) (CBC/CBC)"]` | `["Bilingual (English/French, CBC/CBC)"]` |
| `2444890` | Government of Canada | Technician - Support | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2445350` | Government of Canada | Registry Assistant | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |
| `2447419` | Government of Canada | Project Manager (Project Management Office) | `["Bilingual (English/French) (BBB/BBB)"]` | `["Bilingual (English/French, BBB/BBB)"]` |

## IDs only

```
cornwall_81003
2263508
2263703
2263723
2263737
2263744
2325363
2369109
2377747
2381293
2381371
2382569
2391146
2392487
2417733
2419228
2424454
2431398
2436124
2437682
2438059
2438422
2440050
2441034
2442447
2444124
2444128
2444890
2445350
2447419
```
