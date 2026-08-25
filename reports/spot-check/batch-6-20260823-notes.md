# Batch 6 notes

- Reviewed 50 current public jobs; confirmed errors, so the audit continued.
- Shared Health Manitoba daily values such as `11.625` were being truncated to `625 hours` because the generic hours normalizer only accepted two decimal places. The source-specific path now preserves the full value and shift availability; 456 rows were rechecked/backfilled.
- The sample also confirmed the need to keep source-specific decimal handling separate from the shared workload normalizer.
