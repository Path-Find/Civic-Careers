/**
 * QUALITY.md manual audit of 10 additional random active listings selected
 * 2026-08-13.
 *
 * Usage: npx tsx manual-quality-audit-2026-08-13-round-2.ts [--apply]
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const j = (values: string[]) => JSON.stringify(values);

type Patch = {
  id: string;
  label: string;
  fields: Record<string, string | number | null>;
  description: string;
};

const patches: Patch[] = [
  {
    id: '604416617',
    label: 'Shared Health — Registered Psychiatric Nurse',
    fields: {
      job_title: 'Registered Psychiatric Nurse (N2)',
      department: 'PY2 Psychealth GTU',
      location: 'Winnipeg, MB',
      salary_range: '42.985 - 52.732 (hourly)',
      salary_min: 42.985,
      salary_max: 52.732,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: '2026-08-11 to 2027-05-03',
      hours: '7.75 hours',
      availability: 'Daytime; Evenings; Weekends',
      education_requirements: j(['Graduate of an approved Registered Psychiatric Nursing or Registered Nursing program']),
      license_requirements: j(['Active registration with the College of Registered Psychiatric Nurses of Manitoba or College of Registered Nurses of Manitoba']),
      security_check_required: 1,
      medical_requirements: j(['Moderate to heavy physical effort']),
      required_skills: j(['Mental health nursing', 'Patient-care prioritization', 'Delegation and monitoring of delegated care', 'Critical thinking and problem-solving', 'Oral and written communication', 'Independent and team-based practice']),
      is_unionized: 1,
      union_name: 'MNU',
    },
    description: `## Overview
Provides professional psychiatric and nursing services for patients with complex and unpredictable health needs at Health Sciences Centre.

## Responsibilities
- Provide independent nursing services, interventions, and treatments
- Lead within the health-care team and coordinate patient care and discharge
- Prioritize care for individual patients and groups of patients
- Delegate care appropriately and monitor outcomes
- Adapt to changing situations and work effectively under stress`,
  },
  {
    id: 'APTPUO---Fall-2026---ESL2121---F00_JR38190',
    label: 'uOttawa — ESL2121 instructor',
    fields: {
      job_title: 'Instructor, ESL2121 - Creating Meaning: Reading to Improve Writing Skills',
      salary_range: '203.54 (hourly)',
      salary_max: 203.54,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: 'Fall 2026',
      hours: '39 hours',
      availability: 'Weekdays',
      academic_role_type: 'academic_instructor',
      academic_course: 'ESL2121 - Creating Meaning: Reading to Improve Writing Skills',
      academic_workload: '3 credits',
      academic_schedule: 'Monday 14:30-16:00; Thursday 16:00-17:30',
      education_requirements: j(['Master’s degree in teaching English as a second language or a related discipline']),
      experience_requirements: j(['2 years of university-level ESL teaching experience or equivalent']),
      language_requirements: j(['English']),
      required_skills: j(['Teaching English as a second language', 'Reading and writing instruction', 'Critical reading instruction']),
      benefits: j([]),
    },
    description: `## Overview
Teaches ESL2121, Creating Meaning: Reading to Improve Writing Skills. The course develops reading and writing strategies, critical reading, sentence structure, and vocabulary for general and academic purposes.

## Responsibilities
- Teach the course during the scheduled class periods
- Develop students' reading and writing skills through varied text types and strategies
- Manage course administration and student assessment`,
  },
  {
    id: '553a8b119e52',
    label: 'York University — Electrical Systems Manager',
    fields: {
      duration: 'Permanent',
      hours: '35 hours per week',
      availability: 'Weekdays; Evenings; Weekends',
      required_skills: j(['Electrical distribution systems', 'Preventive, corrective, and emergency maintenance', 'Electrical codes and standards', 'Technical drawing and specification interpretation', 'Analytical and problem-solving', 'Project and contractor management']),
      software_requirements: j(['Microsoft Office', 'Project management software', 'AutoCAD', 'Asset management and maintenance systems', 'Adobe']),
      license_requirements: j(['P.Eng. (PEO)']),
      vehicle_required: null,
    },
    description: `## Overview
Serves as York University's subject-matter expert for low-, medium-, and high-voltage electrical distribution and associated building systems.

## Responsibilities
- Lead planning, maintenance, renewal, and development of electrical infrastructure
- Support capital projects, renovations, maintenance activities, and operational reliability
- Act as the technical contact with Alectra Utilities, Hydro One, and the IESO
- Manage substation operations, infrastructure renewal, and asset sustainability
- Oversee design, construction, commissioning, upgrades, and replacement of electrical distribution systems
- Manage maintenance projects, contractors, procurement, budgets, and contracts`,
  },
  {
    id: '605116517',
    label: 'Shared Health — Registered Nurse - Emergency',
    fields: {
      department: 'Emergency Department',
      location: 'Steinbach, MB',
      salary_range: 'As per MNU Collective Agreement',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: 'Permanent',
      hours: '11.63 hours',
      availability: 'Daytime; Nights; Weekends',
      start_date: '2026-09-07',
      education_requirements: j(['Provincial Emergency Department Orientation or equivalent']),
      license_requirements: j(['Active registration with the College of Registered Nurses of Manitoba or College of Registered Psychiatric Nurses of Manitoba']),
      certification_requirements: j(['Basic Life Support (BLS)', 'Advanced Cardiac Life Support (ACLS)', 'Canadian Triage and Acuity Scale (CTAS)', 'Trauma Nursing Care Course (TNCC)']),
      vehicle_required: 1,
      security_check_required: 1,
      medical_requirements: j(['Ability to meet the physical and mental demands of the job']),
      required_skills: j(['Emergency nursing', 'Interdisciplinary collaboration', 'Conflict resolution', 'Oral and written communication', 'Analytical problem-solving', 'Autonomous decision-making', 'Organization and flexibility']),
      is_unionized: 1,
      union_name: 'MNU',
    },
    description: `## Overview
Provides Registered Nurse or Registered Psychiatric Nurse care in the Emergency Department at Bethesda Regional Health Centre.

## Responsibilities
- Apply the nursing process and work to the full scope of practice
- Support patients in acute and other health-care settings as required
- Maintain competency with professional standards, policies, and emergency-care protocols
- Set priorities, use independent judgment, and contribute to quality improvement
- Establish positive working relationships and support an interdisciplinary team`,
  },
  {
    id: 'brassring_771296',
    label: 'Halifax Regional Municipality — Sportsfield Technician',
    fields: {
      department: 'Parks and Recreation',
      location: 'Halifax, NS',
      workplace_address: '1721 Summer Street, Halifax, NS (Sport Fields West)',
      salary_range: '28.67 (hourly)',
      salary_min: 28.67,
      salary_max: 28.67,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Full-time',
      duration: 'Permanent',
      hours: '8 hours per day',
      availability: 'Weekdays; Weekends',
      education_requirements: j(['Grade 12 or equivalent']),
      license_requirements: j(['Valid Nova Scotia Class 5 driver’s licence']),
      vehicle_required: 1,
      is_unionized: 1,
      union_name: 'CUPE 108',
    },
    description: `## Overview
Maintains athletic fields and sports courts for Halifax Regional Municipality Parks and Recreation.

## Responsibilities
- Create and maintain turf conditions using accepted athletic-field practices
- Set up, line, groom, and maintain fields and courts
- Operate turf-maintenance tools, equipment, vehicles, and implements safely
- Recommend and carry out maintenance programs and practices
- Prepare reports and assessments, order materials, and track field activities
- Participate in the Winter Works Snow and Ice Program`,
  },
  {
    id: '602610217',
    label: 'Shared Health — Emergency Medical Responder',
    fields: {
      department: 'Killarney ERS - West Zone',
      location: 'Killarney, MB; Boissevain, MB; Cartwright, MB; Deloraine, MB; Glenboro, MB',
      salary_range: '20.095 - 25.812 (hourly)',
      salary_min: 20.095,
      salary_max: 25.812,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Full-time',
      duration: 'Term',
      hours: '12 hours',
      availability: 'Daytime; Nights; Weekends; On-call',
      education_requirements: j(['Graduate of an accredited Emergency Medical Responder program or approved equivalent']),
      license_requirements: j(['Certificate of Practice with the College of Paramedics of Manitoba at the Emergency Medical Responder level', 'Valid Class IV Manitoba driver’s licence']),
      vehicle_required: 1,
      certification_requirements: j(['Basic Life Support (BLS), level C or equivalent']),
      security_check_required: 1,
      medical_requirements: j(['Physical Fitness Assessment', 'Moderate to heavy physical effort']),
      required_skills: j(['Emergency medical response', 'Patient care', 'Patient relations', 'Clinical protocols and care maps', 'Communication across health and emergency-service teams']),
      is_unionized: 1,
      union_name: 'MAHCP',
    },
    description: `## Overview
Provides Emergency Medical Responder care from Killarney ERS across Killarney and surrounding communities.

## Responsibilities
- Provide accessible, responsive, and integrated patient care
- Work with health-care providers, emergency-service agencies, and community agencies
- Operate vehicles and emergency equipment safely under Manitoba regulations and Shared Health policy
- Apply clinical protocols and care maps
- Respond to calls in varied weather and high-stress situations`,
  },
  {
    id: 'APTPUO---CVG2507_JR7500',
    label: 'uOttawa — CVG 2507 instructor',
    fields: {
      job_title: 'Instructor, CVG 2507 - Matériaux et processus geotechniques',
      work_model: 'On-site',
      employment_type: 'Part-time',
      hours: '39 hours',
      academic_role_type: 'academic_instructor',
      academic_course: 'CVG 2507 - Matériaux et processus geotechniques',
      academic_workload: '2 credits',
      academic_schedule: 'Monday 13:00-14:30; Wednesday 11:30-13:00',
      education_requirements: j(['Ph.D. or equivalent in Civil Engineering']),
      experience_requirements: j(['Excellent experience in the field of the course and materials']),
      language_requirements: j(['French']),
      required_skills: j(['Civil engineering', 'Geotechnical materials and processes']),
      certification_requirements: j([]),
      benefits: j([]),
    },
    description: `## Overview
Teaches CVG 2507, Matériaux et processus geotechniques. The course covers the formation and alteration of earth materials, soils, physical properties, grain-size identification, consistency limits, organic composition, classification, compaction, capillarity, shrinkage, and swelling.

## Responsibilities
- Teach the course during the scheduled class periods
- Explain geotechnical materials and processes and their engineering applications
- Manage course administration and student assessment`,
  },
  {
    id: '2446297',
    label: 'Government of Canada — Capital Program Manager',
    fields: {
      location: 'Jasper, AB',
      duration: null,
      hours: null,
      availability: null,
      education_requirements: j(['Secondary school diploma or acceptable combination of education, training, and experience']),
      experience_requirements: j(['Planning, implementing, and leading large-scale infrastructure or heritage-asset projects', 'Managing and reviewing external consultants and contractors', 'Managing project financial resources', 'Supervising, coordinating, mentoring, or providing technical direction to staff and multidisciplinary teams']),
      vehicle_required: 1,
      security_check_required: 1,
      language_requirements: j(['English']),
      required_skills: j(['Project management', 'Risk management', 'Infrastructure and facility projects', 'Technical analysis', 'Contract and dispute resolution', 'Cross-functional leadership']),
    },
    description: `## Overview
Leads a portfolio of engineering design and construction projects for Parks Canada assets in Jasper National Park and Fort St. James National Historic Site.

## Responsibilities
- Manage projects from concept through construction close-out
- Develop short- and long-term capital investment plans
- Oversee project managers and coordinators
- Resolve project-management and contractual matters with contractors and consultants
- Provide technical expertise for recapitalization, rehabilitation, and repair projects
- Analyze technical information and provide direction to senior management`,
  },
  {
    id: '596864017',
    label: 'Canada Post — Post Office Assistant',
    fields: {
      job_title: 'Post Office Assistant',
      department: 'Retail',
      location: 'Chisasibi, QC',
      salary_range: '25.01 (hourly)',
      salary_min: 25.01,
      salary_max: 25.01,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Occasional',
      duration: 'Term',
      availability: 'On-call',
      education_requirements: j(['High school or provincial equivalency']),
      experience_requirements: j(['Experience in business administration', 'Experience interacting with the public in a retail or service environment, including sales and cash transactions']),
      required_skills: j(['Customer service', 'Sales', 'Cash handling', 'Postal accounting systems', 'Mail processing']),
      language_requirements: j(['Bilingual']),
      security_check_required: 1,
      medical_requirements: j(['Physical ability to lift mail containers up to 50 pounds, push or pull boxes, sort mail, and stand for extended periods']),
      benefits: j([]),
    },
    description: `## Overview
Provides on-call counter service to customers at the Chisasibi post office.

## Responsibilities
- Sell postal products and services
- Sort, distribute, and process mail
- Provide customers with information and forms
- Resolve delivery and service difficulties
- Process retail, sales, cash, and post-office accounting activities`,
  },
  {
    id: 'peopleadmin_dal_peopleadmin_ca_22004',
    label: 'Dalhousie University — Admissions Coordinator',
    fields: {
      department: 'Faculty of Management - General',
      location: 'Halifax, NS',
      salary_range: '29.18 - 36.95 (hourly)',
      salary_min: 29.18,
      salary_max: 36.95,
      salary_period: 'hourly',
      work_model: 'Hybrid',
      employment_type: 'Contract',
      duration: '2 years',
      hours: '35 hours per week',
      education_requirements: j(['Undergraduate degree in a related field']),
      experience_requirements: j(['2 years of office administration experience', 'Experience coordinating complex admissions, recruitment, or student-service processes', 'Experience maintaining confidential records, databases, and complex administrative processes']),
      required_skills: j(['Assessing academic credentials and transcripts', 'Calculating GPAs and applying admission requirements', 'Communication, interpersonal, and customer service', 'Organization and attention to detail', 'Admissions and enrolment coordination']),
      software_requirements: j(['Microsoft Office', 'Databases', 'Student information systems', 'CRM platforms']),
      benefits: j(['Defined benefit pension plan', 'Health and dental plans', 'Health spending account', 'Employee and family assistance program', 'Tuition assistance program']),
      is_unionized: 1,
      union_name: 'NSGEU Local 77',
    },
    description: `## Overview
Coordinates admissions and enrolment processes for graduate programs in Dalhousie's Faculty of Management.

## Responsibilities
- Coordinate admissions for the Master of Information and research programs
- Assess academic credentials, transcripts, references, test scores, and supporting documents
- Advise prospective and admitted students about requirements, funding, scholarships, registration, and onboarding
- Maintain admissions data, applicant databases, confidential records, and correspondence
- Prepare reports and statistics, monitor admissions trends, and administer entrance-scholarship assessments
- Support graduate-student-services events, meetings, and communications`,
  },
];

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

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
      sql: `SELECT j.is_active, d.job_title, d.description
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

  const result = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM jobs WHERE id IN (${patches.map(() => '?').join(',')}) AND verified_at IS NOT NULL`,
    args: patches.map(patch => patch.id),
  });
  console.log(`\nCorrections applied, re-fetched, and marked verified: ${result.rows[0]?.n ?? 'unknown'}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
