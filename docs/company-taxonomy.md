# Company taxonomy

The Companies view classifies organizations from the exact source label used by
the scraper. It does not infer a category from words in a display name.

An organization may have more than one type. This is required for employers
such as Metrolinx and TTC, which are both public agencies and transit agencies,
and for employers that recruit through a shared municipal portal.

The maintained metadata lives in
[`web/src/modules/jobs/companyTypes.ts`](../web/src/modules/jobs/companyTypes.ts):

- Public libraries
- Transit agencies
- Universities and colleges
- Municipal governments
- Public agencies
- Health organizations

When a source is added or renamed, update its exact source key, organization
types, and official careers destination together. A missing destination is
shown explicitly on the company page instead of being guessed from the name.
