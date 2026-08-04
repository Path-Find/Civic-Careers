# Language field normalization — 2026-08-04

Canonical form for `job_details.language_requirements` is deliberately simple:

- `English`
- `French`
- `Bilingual` (when both / bilingual is required)
- Other named languages as needed (`Mandarin`, `Arabic`, …)

No PSC profiles (`CBC/CBC`), no `Essential` suffix, no `Bilingual (English/French, …)` parentheticals.

## Tools

- Normalizer: `normalizeLanguageRequirements()` in `scraper/requirements.ts`
- Backfill: `scraper/backfill-normalize-languages.ts` (`--apply` to write)

## Corpus after final pass

| Count | Value |
|---:|---|
| 551 | English |
| 408 | Bilingual |
| 113 | French |
| 45 | English, French |
| 45 | English, French, Bilingual |
| 20 | English, Bilingual |
| 4 | French, Bilingual |
| rest | named languages / small combos |

Zero legacy leftovers matching Essential / CBC / BBB / English/French parentheticals.

Inventory-style posts that list English only, French only, *or* bilingual keep all three tokens.
