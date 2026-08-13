# Civic Careers

A Canadian public-sector job discovery feed that collects official postings into a single searchable interface. Ontario is the core coverage area, with additional employers elsewhere in Canada.

## Problem

Government job postings are scattered across dozens of incompatible portals — SuccessFactors, Oracle Cloud, Workday, Njoyn, PeopleSoft, and bespoke municipal sites. Civic Careers brings those official listings together while retaining the source organization, original posting link, and source-backed dates.

## Features

- **Multi-Portal Scraping**: Automated collection across municipal, provincial, federal, college, and university career systems.
- **Structured Job Details**: Parsing extracts useful fields such as salary, work model, employment type, location, benefits, requirements, and closing date while keeping the source description available.
- **Jobs, Companies, and Saved Views**: Browse the unified feed, discover organizations, and save listings for follow-up.
- **Source-Backed Links and Dates**: Listings link back to official employer pages and distinguish known, missing, open-ended, and pending deadline information.
- **Useful Filters**: Narrow results by organization, location, student eligibility, work model, salary, employment type, education, and other structured fields.
- **Soft-Delete Retention**: Expired postings are flagged rather than deleted, preserving a searchable history of past opportunities.
- **Scheduled Runs**: GitHub Actions runs the production scrape twice weekly (Monday and Thursday) with secure secret management. Parsing is a separate pipeline step while extraction quality is being tuned.

## Stack

- **Scraper**: Playwright, TypeScript
- **AI**: DeepSeek V4-Flash
- **Database**: Turso/libSQL (with SQLite-compatible local tooling)
- **API**: Express
- **Frontend**: React, Vite, TypeScript
- **Automation**: GitHub Actions

---

- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)

Created by [Ryan Hanna](https://github.com/ryanphanna) | [ryanisnota.pro](https://ryanisnota.pro)
