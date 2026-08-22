# Civic Careers job field format

Working contract for manually reviewing or rewriting a job posting. The source
posting is the evidence; these rules define where each fact belongs in Civic
Careers and how it should be normalized.

## Core rules

1. Store each fact in its structured property whenever a property exists.
2. For controlled fields, select only an existing allowed value. Do not create
   a new label because the source uses different wording.
3. Do not repeat a structured fact in `description`.
4. Use an empty value when the source does not provide a fact. Do not infer it
   from the employer, title, or a nearby phrase.
5. Preserve meaningful source qualifiers such as `CAD`, `approximately`, or
   `up to` unless the property has a dedicated normalized representation.
6. A manual whole-job rewrite must be followed by a re-fetch and verification of
   every changed field. Mark `verified_at` only after the whole listing is good.

## Controlled fields: choose, do not invent

These fields behave like checkboxes or dropdowns. The values below are the
complete current vocabulary:

- `salary_period`: `yearly`, `hourly`, `monthly`, `biweekly`, `weekly`, `flat`
- `work_model`: `On-site`, `Hybrid`, `Remote`
- `employment_type`: `Full-time`, `Part-time`, `Contract`, `Permanent`,
  `Occasional`, `Seasonal`
- `listing_type`: `regular`, `ongoing_recruitment`, `inventory`
- `academic_role_type`: `faculty`, `teaching_assistant`,
  `research_assistant`, `research_associate`, `postdoctoral`,
  `academic_instructor`, `course_staff`
- Boolean fields: `is_inventory`, `is_student`, `vehicle_required`, and
  `security_check_required` use `0`, `1`, or empty when genuinely unknown;
  `is_unionized` also uses `0`, `1`, or empty when unknown
- `responsibility_tags`: choose from `Education & mentoring`, `Planning &
  evaluation`, `Client care`, `Operations & compliance`, `Research &
  improvement`, `Collaboration`, and `Equity & advocacy`
- `qualification_tags`: choose from the same list plus `Student`; `Student`
  is never a responsibility tag and means the source requires student
  eligibility, not merely that the job involves teaching or supporting
  students

When a source phrase does not exactly match a controlled value, map it to the
closest existing value according to the parser rules. If no value applies,
leave the field empty rather than adding a new category.

To check the live database for values that escaped this contract, run the
read-only structured-value report from `scraper/`:

```sh
npm run report:structured-values
```

Use `--json` for machine-readable output, `--include-inactive` to include
inactive parsed rows, or `--fail-on-invalid` for a check that should fail when
the report finds an issue. Free-text fields such as `availability`, `duration`,
and `location` are not treated as closed vocabularies; the report only flags
known placeholder fragments in those fields.

The JSON-array properties below are evidence-backed lists, not open-ended
categories. Add a short item only when the source explicitly supports it; do
not invent a taxonomy or turn a generic duty into a requirement:
`benefits`, `required_skills`, `experience_requirements`,
`education_requirements`, `license_requirements`, `language_requirements`,
`certification_requirements`, `software_requirements`, and
`medical_requirements`.

## Field contract

| Property | Required format | Put here / do not put here |
| --- | --- | --- |
| `job_title` | Clean role title; remove posting IDs, employment type, duration, and inventory labels | Title only; do not repeat metadata in the title |
| `department` | Employer's department, faculty, unit, or division as named by the source | Organizational unit; not the employer name unless it is genuinely the department |
| `location` | `City, XX`; multiple locations separated by `; ` | City/province only, such as `Vancouver, BC`; remove campus, country, employer, remote-work, and commuting prose |
| `workplace_address` | Full source-stated street address or semicolon-separated addresses, or empty | Hidden map-only property; use only an explicit job worksite address, never a mailing/contact/application address, and do not expose it in the public job response |
| `salary_min` | Number with no currency symbol or commas | Lower compensation bound |
| `salary_max` | Number with no currency symbol or commas | Upper compensation bound |
| `salary_period` | One of `hourly`, `yearly`, `monthly`, `biweekly`, `weekly`, or `flat` | Choose an existing pay-interval value; never put the interval in the job body |
| `salary_range` | Normalized human-readable fallback matching the numeric fields | Keep consistent with min/max/period; do not use it instead of the numeric fields |
| `work_model` | One of `On-site`, `Hybrid`, or `Remote` | Choose an existing value; do not infer remote status from a location |
| `employment_type` | One of `Full-time`, `Part-time`, `Contract`, `Permanent`, `Occasional`, or `Seasonal` | Choose an existing value; temporary/term/casual source wording maps to `Contract` |
| `duration` | Canonical value: `Permanent`, `Ongoing`, `Seasonal`, `Term`, `Term ending YYYY-MM-DD`, `Term ending Month YYYY` when the source provides only the end month, `N months`, `N years`, `Up to N months`, `N-month work year`, an academic term, or `YYYY-MM-DD to YYYY-MM-DD` | Contract/assignment term or date range; the UI displays this as `Term`; do not use for application closing dates |
| `start_date` | `YYYY-MM-DD` when exact; otherwise short source-backed text such as `Fall 2026` or `Immediate` | Expected start date only |
| `closing_date` | `YYYY-MM-DD` | Application deadline (`Apply By`); never confuse with the job's end date |
| `posted_at` | `YYYY-MM-DD` | Original publication date when known; not the scrape date |
| `hours` | Short schedule quantity such as `35 hours per week` | Hours or FTE; not days of availability |
| `availability` | Short schedule qualifier such as `2 days per week`, `Weekends`, or `Shift work` | Days, shifts, weekends, evenings, or other availability requirements |
| `academic_role_type` | `faculty`, `teaching_assistant`, `research_assistant`, `research_associate`, `postdoctoral`, `academic_instructor`, `course_staff`, or empty | Clearly academic appointments only; do not classify a university employer's administrative job or a municipal recreation instructor |
| `academic_course` | Short course code and/or title, or empty | Course attached to the academic role; do not infer one from the employer |
| `academic_workload` | Short source-backed amount such as `65 total hours`, `3 hours per week`, or `0.5 FTE`, or empty | Academic workload or appointment amount; not a generic schedule restatement |
| `academic_office_hours` | Short source-backed office, consultation, lab, or student-contact hours, or empty | Explicit academic contact-hour requirement; do not infer it from teaching duties |
| `academic_supervisor` | Explicit supervisor, principal investigator, or supervising person/department, or empty | Named supervision only; do not infer a supervisor from the department |
| `academic_appointment_type` | Explicit value such as `Tenure-track`, `Limited-term`, or `Sessional`, or empty | Appointment classification; do not duplicate the employment type or term |
| `is_inventory` | `0`, `1`, or empty when unknown | Candidate/talent inventory status only |
| `listing_type` | `regular`, `ongoing_recruitment`, or `inventory` | Choose an existing listing classification |
| `is_student` | `0`, `1`, or empty when unknown | Only when the candidate must be a student or the posting is explicitly student-only; a duty involving students does not qualify |
| `is_unionized` | `0`, `1`, or empty when unknown | Union status only |
| `union_name` | Union/local name, or empty | Only a real union name; never `Non-Union` or `Unknown` |
| `benefits` | JSON array of short distinct benefit statements | Benefits only; do not repeat salary, schedule, or employer boilerplate |
| `required_skills` | JSON array of concise mandatory skills/programs | Mandatory skills, tools, and programs; not responsibilities or preferred assets |
| `experience_requirements` | JSON array; preserve mandatory experience, with duration-first values such as `3+ years of related experience` | Required experience only; preferred experience belongs in the narrative if material |
| `education_requirements` | JSON array of concise mandatory education requirements | Required education only; do not duplicate it in `description` |
| `license_requirements` | JSON array of required licences or registrations | Legal/professional licences; not general qualifications |
| `vehicle_required` | `0`, `1`, or empty when unknown | Only when a vehicle is explicitly required |
| `language_requirements` | JSON array of required languages or language levels | Language requirements only |
| `security_check_required` | `0`, `1`, or empty when unknown | Explicit background/security screening requirements |
| `certification_requirements` | JSON array of required certifications | Certifications only; do not mix with education or licences |
| `software_requirements` | JSON array of required software, systems, or platforms | Tools the candidate must use or know; not tools mentioned only in duties |
| `medical_requirements` | JSON array of explicit medical, immunization, or physical requirements | Only source-stated requirements; do not infer from the work setting |
| `responsibility_tags` | JSON array using only the responsibility labels listed above | High-level summary of duties; do not add new labels ad hoc |
| `qualification_tags` | JSON array using only the qualification labels listed above | High-level summary of qualifications; do not use it as a substitute for requirements |
| `description` | Markdown with only genuinely additional narrative | `## Overview`, `## Responsibilities`, and `## Qualifications` as needed; no repeated location, pay, dates, employment type, duration, hours, availability, or structured requirements |

## Academic role card

When `academic_role_type` is present, the detail page shows an **Academic
role** card. It is a presentation layer over the same source-backed fields; it
does not create a second copy of the job data.

- `academic_role_type` supplies the role label.
- `academic_course` appears as **Course / project**.
- `academic_workload` appears as **Workload**. If it is empty, the card may
  use the general `hours` value as the workload fallback.
- `academic_office_hours`, `academic_appointment_type`, and
  `academic_supervisor` appear under their matching labels when present.
- Salary, employment type, term, start date, availability, and other general
  metadata remain in their normal sections. Do not move a fact into an
  academic field just because the employer is a university.

## Date and end-date rule

`closing_date` is the deadline to apply. It is not the date the job ends.

The UI displays `duration` as **Term**. Use the exact date range when both start
and end dates are known; this makes a fixed-term posting readable without
confusing its end date with the `Apply By` deadline.

The current schema has `start_date` but no dedicated `end_date` property. A
known job end date must not be silently dropped or repeated in the body. For a
full start/end range, use the canonical `duration` range. When a source gives
only an end date, use `Term ending YYYY-MM-DD` in `duration` until a dedicated
`end_date` field exists; never invent a start date or treat the end date as the
application deadline.

## Compensation rule

When the source says:

```text
$31.06 - $33.86 CAD Hourly
```

store:

```text
salary_min: 31.06
salary_max: 33.86
salary_period: hourly
```

Keep the currency and source wording in `salary_range` when the schema cannot
represent currency separately. Do not leave compensation only in the body.

## Review checklist

- Every source fact has one owner: a structured property or the narrative.
- Location is canonical and contains no campus/employer prefix.
- Compensation has numeric bounds and a pay period.
- Application closing date and job end date are not conflated.
- Employment type, duration, hours, and availability are separate.
- Mandatory requirements are structured; the narrative adds context rather
  than repeating them.
- Empty properties are genuinely unknown, not placeholders such as `N/A`.
- The saved record is re-fetched after editing and visually checked before it is
  marked verified.
