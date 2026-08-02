# Roadmap

Civic Careers collects public-sector job postings and presents them in a searchable feed with consistent fields and filters.

## Current state

- **Sources:** [`SOURCES.md`](./SOURCES.md) lists the active portals. [`PENDING.md`](./PENDING.md) is the private working list for sources that are not active yet.
- **Regular scraping:** The live scraper runs on Monday and Thursday.
- **Trial sources:** New sources run in the recurring trial action on the same schedule. One-off manual tests are available for focused validation. A successful source is promoted to the live scraper after the configured trial-success requirement.
- **Parsing:** Scraping and parsing are separate steps. The parser is currently manually triggered while the extraction prompt is being tuned.
- **Website:** The feed has Jobs, Companies, and Saved views, with filters for the fields currently stored in the database.

## Confirmed remaining work

- Continue reviewing and validating public Canadian job boards from `PENDING.md`.
- Capture official posted dates when a source provides them and backfill existing records when the data is available.
- Continue correcting parser output when a posting is misclassified, incomplete, or contains employer boilerplate.
- Decide when the parser prompt is stable enough to restore its scheduled workflow.

## Documentation

- [`SOURCES.md`](./SOURCES.md): active source inventory.
- [`CHANGELOG.md`](./CHANGELOG.md): released product and scraper changes.

---

[Back to Home](./README.md)
