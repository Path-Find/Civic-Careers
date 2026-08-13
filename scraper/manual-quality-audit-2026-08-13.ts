/**
 * QUALITY.md manual audit of 10 random active listings selected 2026-08-13.
 *
 * Usage: npx tsx manual-quality-audit-2026-08-13.ts [--apply]
 */
import { initDb } from './db';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const j = (values: string[]) => JSON.stringify(values);

type Patch = {
  id: string;
  label: string;
  fields: Record<string, string | number | null>;
  description: string;
  notes: string[];
};

const patches: Patch[] = [
  {
    id: '604866517',
    label: 'Canada Post — Parcel Delivery Relief',
    fields: {
      salary_range: '23.81 (hourly)',
      salary_period: 'hourly',
      license_requirements: j([]),
      vehicle_required: 1,
      language_requirements: j(['English', 'French']),
      medical_requirements: j(['Pre-employment physical assessment']),
      required_skills: j(['Safe driving', 'Parcel delivery', 'Customer service']),
      availability: 'Weekends; On-call',
      benefits: j([]),
    },
    description: `## Overview
Parcel delivery relief work serving customers from a Montréal depot, primarily outdoors and by vehicle.

## Responsibilities
- Sort and prepare the day's deliveries at the depot
- Load and drive a Canada Post vehicle and deliver packages on an assigned route
- Operate portable communication devices
- Safeguard mail items and Canada Post property
- Lift mail items weighing up to 22.7 kilograms and carry items weighing up to 15.9 kilograms
- Work safely in outdoor weather conditions`,
    notes: [
      'Corrected salary period and moved the required driver licence to vehicle_required.',
      'Removed duplicated driving text from license_requirements and generic benefits.',
      'Added the explicit physical assessment and weekend/on-call schedule.',
    ],
  },
  {
    id: '604032817',
    label: 'Shared Health Manitoba — LPN - Emergency-Urgences',
    fields: {
      department: 'ER/Medicine',
      location: 'St. Pierre-Jolys, MB',
      hours: '11.625 hours',
      availability: 'Daytime; Evenings; Nights; Weekends',
      education_requirements: j(['Graduate of an approved Licensed Practical Nursing education program']),
      experience_requirements: j([]),
      language_requirements: j([]),
      certification_requirements: j([
        'Basic Life Support (BLS)',
        'Advanced Cardiac Life Support (ACLS)',
        'Canadian Triage and Acuity Scale (CTAS)',
        'Trauma Nursing Care Course (TNCC)',
      ]),
      required_skills: j([
        'Collaborative interdisciplinary practice',
        'Conflict resolution',
        'Oral and written communication',
        'Analytical problem-solving',
        'Autonomous decision-making',
        'Organization and flexibility',
      ]),
    },
    description: `## Overview
Provides Licensed Practical Nursing care across acute, transitional, personal-care, primary-care, public-health, and home-care settings.

## Responsibilities
- Apply the nursing process to support clients, residents, and patients
- Work to the full scope of practice and maintain competency with organizational policies and professional standards
- Exercise initiative and independent judgment when setting priorities and responding to unusual matters
- Travel to other regional facilities when required

## Qualifications
- Knowledge of Manitoba practical-nursing standards, the competency profile, and the professional code of ethics
- Ability to build collaborative relationships, resolve conflict, communicate effectively, and make decisions autonomously
- Good work and attendance record`,
    notes: [
      'Recovered the explicit city, education, daily-hours amount, and shift schedule from source metadata.',
      'Removed an unsupported Bilingual value; the posting does not label the role bilingual.',
      'Shortened certification values and removed their duplicate prose from the description.',
    ],
  },
  {
    id: '57578164f73e',
    label: 'York University — Associate Director, Operations and Business Services',
    fields: {
      department: 'Athletics and Recreation',
      location: 'North York, ON',
      salary_range: '129061 - 140106 (yearly)',
      salary_min: 129061,
      salary_max: 140106,
      salary_period: 'yearly',
      work_model: 'On-site',
      employment_type: 'Full-time',
      duration: 'Permanent',
      hours: '35 hours per week',
      availability: 'Weekdays; Evenings; Weekends',
      start_date: '2026-09-01',
      education_requirements: j(["Bachelor's degree in a relevant discipline"]),
      experience_requirements: j([
        '7 years of progressively responsible experience in operations, service delivery, or business services within a complex organization',
        '5 years of management experience overseeing multiple functional areas',
        'Experience coordinating cross-functional operations including facilities, events, and service delivery',
        'Experience working with institutional partners on agreements, contracts, or operational models',
        'Experience supporting or overseeing revenue-generating programs, services, or partnerships',
      ]),
      required_skills: j([
        'Operational planning and service delivery',
        'Risk management',
        'Financial management',
        'Operational leadership and coordination',
        'Decision-making and judgment',
        'Relationship management',
        'Conflict resolution and negotiation',
        'Written and verbal communication',
        'Planning and organization',
      ]),
    },
    description: `## Overview
Leads the coordination and delivery of Athletics and Recreation's operational, service, engagement, and facilities functions.

## Responsibilities
- Lead managers responsible for event operations, client services, business development, engagement and sports information, and facilities operations
- Coordinate departmental planning, resource allocation, and decision-making as a member of the senior leadership team
- Coordinate with institutional partners on complex agreements and operating models
- Oversee service delivery, risk management, and operational effectiveness across multiple functional areas
- Support revenue-generating programs, services, and partnerships`,
    notes: [
      'Recovered department, city, salary, hours, permanent/full-time status, start date, and duration.',
      'Extracted source-labelled education, experience, and leadership requirements into structured fields.',
      'Replaced the parser-0 partial description with job duties only.',
    ],
  },
  {
    id: 'psft_396757',
    label: 'Toronto Metropolitan University — Project Engineer (Electrical)',
    fields: {
      salary_range: '86502 - 138178 (yearly)',
      salary_period: 'yearly',
      duration: '1 year',
      required_skills: j([
        'Customer service orientation',
        'Technical knowledge of building systems',
        'Consultation and technical support for facilities projects',
        'Project planning and execution',
        'Risk assessment and problem-solving',
        'Communication and collaboration',
      ]),
      software_requirements: j([]),
    },
    description: `## Overview
Assesses and improves the health and performance of Toronto Metropolitan University's building systems, equipment, and infrastructure, with a focus on high- and low-voltage electrical systems.

## Responsibilities
- Plan and execute repair, upgrade, renovation, and replacement projects
- Assess building conditions and recommend upgrades and replacements
- Support facilities planning, design, approval, construction, and alteration work
- Coordinate with internal teams, consultants, contractors, and authorities having jurisdiction
- Apply engineering judgment to building automation, electrical distribution, HVAC, plumbing, roofing, fire systems, and central utilities`,
    notes: [
      'Canonicalized the salary range and reduced the duration to the source-backed one-year term.',
      'Replaced required_skills values contaminated by the raw metadata block.',
      'Removed the non-software Building Automation Systems value from software_requirements.',
    ],
  },
  {
    id: '013bcf99fc79',
    label: 'York University — Records & Data Entry Assistant',
    fields: {
      job_title: 'Records & Data Entry Assistant',
      salary_period: 'hourly',
      employment_type: 'Contract',
      hours: 'Up to 15 hours per week',
      education_requirements: j(['Current enrolment as an undergraduate student at York University']),
      required_skills: j([
        'Knowledge of computerized records systems',
        'Information organization',
        'Attention to detail and accuracy',
        'Time management',
        'Communication',
      ]),
    },
    description: `## Overview
Maintains the accuracy and integrity of computerized records and responds to information requests and enquiries.

## Responsibilities
- Enter and maintain data in computerized records systems
- Gather and organize large amounts of information
- Respond to requests and enquiries
- Maintain accurate work and meet deadlines`,
    notes: [
      'Removed the F/W 26/27 inventory label from the job title.',
      'Recovered the explicit weekly-hours limit and student education requirement.',
      'Mapped source Casual to Contract and moved the source skill list into required_skills.',
    ],
  },
  {
    id: '104097e946a5',
    label: 'York University — Program Administration Assistant Lead',
    fields: {
      job_title: 'Program Administration Assistant Lead',
      department: 'York International',
      location: 'North York, ON',
      salary_range: '17.75 - 19.50 (hourly)',
      salary_min: 17.75,
      salary_max: 19.5,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Contract',
      duration: '2026-09-08 to 2027-04-30',
      hours: 'Up to 15 hours per week',
      start_date: '2026-09-08',
      education_requirements: j(['Current enrolment as an undergraduate student at York University']),
      required_skills: j([
        'Communication',
        'Time management and organization',
        'Instruction, guidance, and feedback',
        'Data presentation',
        'Teamwork and independent work',
      ]),
      software_requirements: j(['Word', 'Excel', 'Outlook', 'PowerPoint']),
    },
    description: `## Overview
Provides administrative support to York International programs and initiatives and acts as a lead hand to Program Administration Assistants.

## Responsibilities
- Support program administration and related initiatives
- Provide instruction, guidance, and feedback to peers
- Prepare and present data in documents and other formats
- Work independently and within a team to support program activities`,
    notes: [
      'Removed the F/W 26/27 and duplicated parenthetical labels from the title.',
      'Recovered department, city, salary, student status, hours, start date, and term.',
      'Mapped source Casual to Contract and added the named Office applications.',
    ],
  },
  {
    id: '2449754',
    label: 'Government of Canada — Manager, Global Compensation Solutions',
    fields: {
      salary_range: '116526 - 149663 (yearly)',
      hours: '37.5 hours per week',
      listing_type: 'regular',
      is_unionized: null,
      union_name: null,
      experience_requirements: j([
        '10 years of progressive experience across multiple areas of Human Resources, including significant experience in compensation and benefits',
        '5 years leading and managing a team of HR professionals',
      ]),
      required_skills: j([
        'Total rewards principles, market competitiveness, and internal equity',
        'International HR practices',
        'Interpreting market data, policies, legislation, and collective agreements',
        'Payroll operations, HR information systems, and service-provider oversight',
        'Strategic thinking and analytical decision-making',
        'Leadership and stakeholder relationship-building',
      ]),
    },
    description: `## Overview
Leads IDRC's global compensation and total rewards programs, including benefits, payroll, HR systems, job classification, and relocation services.

## Responsibilities
- Set strategic direction for global compensation and total rewards programs
- Oversee delivery and continuous improvement of compensation-related services at headquarters and overseas
- Advise senior management on global compensation trends, risk, and competitiveness
- Lead a team of HR professionals and manage priorities and performance`,
    notes: [
      'Filled the explicit 37.5-hour workweek and expanded source-backed experience and skills.',
      'Changed listing type to regular; the future candidate pool is incidental to this specific job.',
      'Cleared is_unionized=0 because the source only says unionized-environment experience is preferred.',
      'Removed IDRC employer marketing, application-process text, and duplicated qualification prose.',
    ],
  },
  {
    id: '604976617',
    label: 'Shared Health Manitoba — Health Care Aide',
    fields: {
      department: 'T6 Personal Care',
      location: 'Winnipeg, MB',
      salary_range: '23.187 - 26.800 (hourly)',
      salary_min: 23.187,
      salary_max: 26.8,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      hours: '7.75 hours',
      availability: 'Nights; Weekends',
      start_date: '2026-08-28',
      education_requirements: j(['Grade XII or equivalent', 'Health Care Aide Certificate from a recognized educational institution']),
      language_requirements: j(['English']),
      security_check_required: 1,
      medical_requirements: j(['Physical ability to stand, transfer, and transport patients, residents, and equipment']),
      required_skills: j([
        'Patient and resident care',
        'Personal, rehabilitation, dementia, and chronic care',
        'Interdisciplinary teamwork',
        'Organization and prioritization',
      ]),
      is_unionized: 1,
      union_name: 'CUPE',
    },
    description: `## Overview
Supports patients and residents as a member of the health care team at Deer Lodge Centre.

## Responsibilities
- Assist with patient and resident care and provide basic supportive care as directed
- Follow health and safety regulations, guidelines, policies, and procedures
- Report occurrences, injuries, illnesses, and safety concerns to the manager or designate
- Work collaboratively within the health care team`,
    notes: [
      'Recovered site city, department, salary, shift schedule, start date, education, English requirement, union, and security checks.',
      'Moved explicit physical demands into medical_requirements.',
      'Replaced the parser-0 partial description and removed employer and application boilerplate.',
    ],
  },
  {
    id: 'Manager--Business-Information-Systems_JR25504',
    label: 'UBC — Manager, Business Information Systems',
    fields: {
      department: 'UBC IT | Business Info Systems',
      location: 'Vancouver, BC',
      salary_range: '10155 - 15842.17 (monthly)',
      salary_min: 10155,
      salary_max: 15842.17,
      salary_period: 'monthly',
      work_model: 'On-site',
      employment_type: 'Full-time',
      duration: 'Ongoing',
      education_requirements: j(['Undergraduate degree in a relevant discipline']),
      experience_requirements: j([
        '8 years of related experience including at least 2 years of managerial experience',
      ]),
      software_requirements: j(['Microsoft Windows', 'Linux', 'Oracle', 'Microsoft SQL Server', 'Sybase', 'Microsoft Access']),
      required_skills: j([
        'Information systems and technology leadership',
        'Project management and business analysis',
        'Application lifecycle management',
        'Systems support coordination',
        'Requirements gathering and business-process analysis',
        'Staff coaching and mentoring',
        'Planning, organization, and prioritization',
        'Communication and documentation',
      ]),
      is_unionized: 0,
      union_name: '',
    },
    description: `## Overview
Provides operational management and technical leadership for UBC Business Information Systems services, applications, and infrastructure.

## Responsibilities
- Lead the design, selection, and application of information systems that meet business requirements
- Manage and mentor staff and provide technical leadership across product and service lines
- Lead concurrent projects and monitor scope, schedule, cost, quality, and risks
- Gather, analyze, document, and manage changes to business requirements
- Oversee application lifecycle management and change-management practices
- Coordinate systems support, help-desk activity, audits, procedures, standards, and security controls
- Work with university departments, external partners, and government agencies to deliver effective business solutions`,
    notes: [
      'Recovered department, Vancouver location, monthly salary, full-time status, ongoing duration, and minimum qualifications.',
      'Extracted named operating systems and database platforms into software_requirements.',
      'Used the explicit Staff - Non Union label and removed the source’s long employer/marketing and duplicated qualifications text.',
    ],
  },
  {
    id: '605062117',
    label: "Shared Health Manitoba — Residential Care Worker - Women's Treatment",
    fields: {
      department: "WRHA - Women's Treatment & Community Services",
      location: 'Winnipeg, MB',
      salary_range: '21.108 - 25.475 (hourly)',
      salary_min: 21.108,
      salary_max: 25.475,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      hours: '8 hours',
      availability: 'Daytime; Evenings; Weekends',
      start_date: '2026-08-31',
      education_requirements: j(['Complete high school education, Manitoba standards']),
      experience_requirements: j([
        'Experience working in a residential facility, addictions-related employment, or related volunteer work',
        'Experience working from a client-centred perspective',
      ]),
      language_requirements: j(['English']),
      software_requirements: j([]),
      security_check_required: 1,
      certification_requirements: j(['CPR-C with Automated External Defibrillator (AED) training', 'First Aid certification']),
      medical_requirements: j(['Suitable physical health to perform required duties']),
      required_skills: j([
        'Communication and interpersonal skills',
        'Interdisciplinary teamwork',
        'Client-centred care',
        'Cultural sensitivity',
        'Addictions knowledge',
        'Emotional regulation and composure under pressure',
      ]),
      is_unionized: 1,
      union_name: 'CUPE',
    },
    description: `## Overview
Provides client and facility support in the Women's Treatment and Community Services program.

## Responsibilities
- Support a safe, healthy, and nurturing environment for clients
- Respond to client requests in a responsible, timely, and flexible manner
- Communicate respectfully with clients and staff
- Participate in supervision, reciprocal learning, and professional development
- Maintain calm and tactful composure in challenging circumstances
- Support clients and the program while following professional ethics and organizational procedures`,
    notes: [
      'Recovered department, city, salary, part-time schedule, start date, education, experience, certification, language, and security fields.',
      'Moved physical health into medical_requirements and removed employer mission and application boilerplate.',
      'Replaced the parser-0 mixed-format description with a concise role-focused version.',
    ],
  },
];

async function main() {
  const db = await initDb();

  console.log(APPLY ? 'APPLY mode' : 'DRY-RUN mode (pass --apply to write)');
  console.log(`Patches: ${patches.length}`);

  for (const patch of patches) {
    const existing = await db.execute({
      sql: `SELECT j.is_active, j.verified_at, d.job_title, d.description, d.parser_version
            FROM jobs j JOIN job_details d ON d.id = j.id WHERE j.id = ?`,
      args: [patch.id],
    });
    if (!existing.rows.length) throw new Error(`Missing job: ${patch.id}`);
    const before = existing.rows[0];
    console.log(`\n── ${patch.label}`);
    console.log(`   ${patch.id} parser=${before.parser_version} verified=${before.verified_at ?? 'no'} description=${String(before.description ?? '').length} chars`);
    for (const note of patch.notes) console.log(`   • ${note}`);

    if (!APPLY) continue;

    const columns = Object.keys(patch.fields);
    const sets = columns.map(column => `${column} = ?`).join(', ');
    await db.execute({
      sql: `UPDATE job_details SET ${sets}, description = ? WHERE id = ?`,
      args: [...columns.map(column => patch.fields[column]), patch.description, patch.id],
    });
    console.log('   ✓ corrected');
  }

  if (!APPLY) {
    console.log('\nDry run complete.');
    return;
  }

  for (const patch of patches) {
    const check = await db.execute({
      sql: `SELECT j.is_active, j.verified_at, d.job_title, d.description
            FROM jobs j JOIN job_details d ON d.id = j.id WHERE j.id = ?`,
      args: [patch.id],
    });
    const row = check.rows[0];
    if (!row || Number(row.is_active) !== 1 || !String(row.description ?? '').trim()) {
      throw new Error(`Re-fetch verification failed: ${patch.id}`);
    }
    await db.execute({
      sql: 'UPDATE jobs SET verified_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1',
      args: [patch.id],
    });
    console.log(`Verified: ${patch.id}`);
  }

  console.log('\nCorrections applied, re-fetched, and marked verified.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
