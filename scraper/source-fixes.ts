export type GovernmentOfCanadaFix = {
  applicationUrl: string;
  description?: string;
  isStudent?: number;
  educationRequirements?: string[];
  languageRequirements?: string[];
  securityCheckRequired?: number;
  medicalRequirements?: string[];
};

// This GC link is an account/profile page, not a job posting. The scraper
// excludes it from future runs and the source backfill deactivates the row.
export const EXCLUDED_GOVERNMENT_OF_CANADA_IDS = new Set(['2352259', '2445703']);

export function isRetiredGovernmentOfCanadaPage(rawText: string): boolean {
  return /This job has moved or is no longer available\. Please search our current job openings\./i.test(rawText);
}

// This legacy Toronto row was first captured from the search shell. Keep its
// existing ID when the SuccessFactors scraper sees the now-canonical detail URL.
export const APPLICATION_URL_FIXES: Record<string, string> = {
  '8bcafdef991f': 'https://jobs.toronto.ca/jobsatcity/job/TORONTO-Solid-Waste-Collection-Operator-%28DZ-Licence-Required%29-ON-M9C-2Y2/598508217/',
  // GC Jobs delegates this posting to the National Arts Centre's stable Njoyn page.
  '2451362': 'https://nac.njoyn.com/CL4/XWEB/Xweb.asp?page=jobdetails&CLID=74526&JobID=J0726-0690&lang=1',
};

export const LEGACY_JOB_IDS_BY_APPLICATION_URL: Record<string, string> = Object.fromEntries(
  Object.entries(APPLICATION_URL_FIXES).map(([id, url]) => [url.replace(/\/$/, ''), id]),
);

// These four records use the GC Jobs listing as a source, but their employer
// pages contain the stable application destination and clearer source text.
// Keep these repairs deterministic so a parser rerun does not send them back
// through an AI rewrite.
export const GOVERNMENT_OF_CANADA_FIXES: Record<string, GovernmentOfCanadaFix> = {
  '2451362': {
    applicationUrl: APPLICATION_URL_FIXES['2451362'],
  },
  '2434700': {
    applicationUrl: 'https://careers-carrieres.cra-arc.gc.ca/gol-ged/wcis/pub/rtrvjbpst.action?pi=8EB30FC0002E1FD18383F97AB53463CE',
  },
  '2387968': {
    applicationUrl: 'https://jobs.smartrecruiters.com/HouseOfCommonsCanadaChambreDesCommunesCanada/744000101043253-student-employment-program',
    description: `## Overview
The House of Commons hires students throughout the year for opportunities in Ottawa across administration, client service, accounting, procurement, policy, communications, design, architecture, engineering, computer science, data, cybersecurity, broadcasting, human resources, trades and culinary services.

## Qualifications
- Current enrolment as a student in a secondary or post-secondary accredited academic institution.
- Minimum age: 16.
- Canadian citizen, permanent resident or valid study permit.
- Proof of enrolment is required during hiring.
- Work is on-site in Ottawa.

## Nice to Have
- Fluency in English and French.`,
    isStudent: 1,
    educationRequirements: ['Current enrolment as a student in a secondary or post-secondary accredited academic institution'],
    languageRequirements: ['English', 'French'],
  },
  '2388380': {
    applicationUrl: 'https://jobs.smartrecruiters.com/HouseOfCommonsCanadaChambreDesCommunesCanada/744000101048091-co-op-students-various-positions',
    description: `## Overview
The House of Commons offers 16-week, full-time, temporary, on-site co-op placements in Ottawa across administration, accounting, communications, engineering, computer science, broadcasting, trades and related fields.

## Qualifications
- Current enrolment as a full-time student at an accredited post-secondary institution.
- Registration in a co-op program.
- Minimum age: 16.
- Canadian citizen, permanent resident or valid study permit.
- Proof of enrolment is required during hiring.
- Work is on-site in Ottawa.

## Nice to Have
- Fluency in English and French.`,
    isStudent: 1,
    educationRequirements: ['Current enrolment as a full-time student at an accredited post-secondary institution', 'Registration in a co-op program'],
    languageRequirements: ['English', 'French'],
  },
  '2393494': {
    applicationUrl: 'https://rcmp.ca/en/bc/careers/9-1-1-police-dispatchers/application-process',
    // Rebuilt from the site's actual job-content pages — /what-we-do/roles
    // (duties) and /compensation (pay/benefits) — rather than the
    // application-process page the prior override was built from.
    description: `## Responsibilities
- Answer emergency and non-emergency calls from the public, gathering location, incident details, timing, and descriptions of people and vehicles involved
- Direct and coordinate police officers responding to calls, relaying accurate, timely information to keep officers and the public safe
- Track and call in available resources such as K9 units, air services, and negotiators
- Monitor multiple radio and communication systems by headset

## Compensation & Benefits
- Shift premium of $2.25/hour for hours worked 4pm-8am, plus an additional $2.25/hour for weekend hours
- Statutory holidays paid at time and a half`,
    securityCheckRequired: 1,
    medicalRequirements: ['Normal color vision, or medical confirmation of visual acuity (Snellen format) if corrected or color blind'],
  },
  '2393495': {
    applicationUrl: 'https://rcmp.ca/en/bc/careers/9-1-1-police-dispatchers/experienced-9-1-1-police-dispatchers',
    description: `## Overview
The BC RCMP is recruiting experienced 9-1-1 Police Dispatchers from Canadian police agencies for its 9-1-1 Police Dispatch Program. The program offers on-the-job training, career development and mobility among dispatch centres in Kelowna, Prince George, Courtenay and Surrey.

## Qualifications
- Successful completion of a Canadian police call-taking and dispatching training program.
- At least two years of 9-1-1 police dispatcher experience within the last five years.
- Meet the prerequisites, security investigation, medical assessment, conditions of employment and operational requirements for a regular applicant.
- Meet the required competencies, including communication, composure, flexibility, problem solving, concern for safety and teamwork.
- Applicants with training from another police agency may need to challenge the RCMP National Telecommunications Training Program.

## Eligibility
Persons residing in Canada, Canadian citizens and permanent residents abroad.

## Compensation
Annual salary: $70,688–$86,007. The position includes the federal government benefits and pension package.`,
    securityCheckRequired: 1,
  },
};
