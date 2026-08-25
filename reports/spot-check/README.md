# Public-job spot check — 2026-08-23

Seed: `20260823`  
Batch size: 50  
Batches reviewed: 9  
Jobs reviewed: 450 distinct current public jobs  
Stopping rule: stop after the requested final round; no clean batch was reached.

Each JSON file contains the deterministic sample and all captured fields. The companion notes record confirmed findings and repairs:

- Batches 1–2: source-scoped Shared Health, Canada Post, Ottawa, UNBC, Durham, Guelph, Winnipeg, Oshawa, and TMU repairs.
- Batches 3–5: Ottawa course-title/course-field repairs, academic record-ID cleanup, and empty salary-period cleanup.
- Batch 6: Shared Health three-decimal daily hours (`11.625`) and availability repair.
- Batches 7–8: Ottawa `ATPUO` handling, Saskatchewan/Confederation/Humber/OCAD academic record-ID cleanup.
- Batch 9: Queen’s internal-ID title, Canada Post pay period, Saskatchewan FTE hours, and McMaster/OCAD academic artifacts.

The samples were non-overlapping by deterministic hash order. The parser and backfill tests passed 409/409 after the final repairs.
