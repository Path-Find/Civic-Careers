# Roadmap

Civic Careers is building a dependable public-sector job discovery feed: collect postings from fragmented official portals, normalize them into useful fields, and make them easier to find and revisit.

## Product direction

- **Coverage:** Bring more Canadian public-sector employers into one searchable feed, prioritizing sources that add meaningful new opportunities.
- **Trust:** Keep official job links, dates, source context, and structured requirements accurate enough to support real applications.
- **Discovery:** Make salary, work model, employment type, requirements, organization, and freshness useful search and filter dimensions.
- **Continuity:** Preserve job history and saved-work workflows even as postings expire or sources change.

## Now — Make the feed dependable

- Stabilize extraction quality and restore scheduled parsing when the prompt and validation checks are ready.
- Correct malformed, incomplete, or employer-heavy job descriptions and backfill reliable structured fields.
- Preserve official posted dates, closing dates, and direct application links wherever a source provides them.
- Monitor scheduled and trial source runs so failures are visible and successful sources can be promoted safely.

## Next — Expand useful coverage

- Add high-value Canadian public-sector portals in batches using the existing scraping engines where possible.
- Improve handling for sources with slow, blocked, or unusual job-detail pages without weakening data-quality checks.
- Extend Jobs and Companies discovery around organization type, location, freshness, and the requirements people actually use to decide whether to apply.

## Later — Build the habit of using it

- Make saved jobs, recently viewed jobs, and application follow-up more useful across changing postings.
- Add clearer coverage and freshness signals so users know what the feed includes and when each source was last checked.
- Use observed search and application behavior to guide future filters, source priorities, and product improvements.

## Current baseline

- The live scraper runs twice weekly, with a separate trial path for new sources.
- Scraping and AI parsing are separate pipeline steps; parsing is currently manually triggered while extraction quality is tuned.
- The website provides Jobs, Companies, and Saved views with filters for the fields stored in the database.

## Documentation

- [`SOURCES.md`](./SOURCES.md): active source inventory.
- [`CHANGELOG.md`](./CHANGELOG.md): released product and scraper changes.

---

[Back to Home](./README.md)
