/** QUALITY.md fixes for the first random sample selected 2026-08-13. */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const APPLY = process.argv.includes('--apply');
const j = (values: string[]) => JSON.stringify(values);
type Patch = { id: string; label: string; fields: Record<string, string | number | null>; description: string };

const patches: Patch[] = [
  {
    id: '1291432247', label: 'City of Ottawa — Business Consultant, Housing',
    fields: {
      job_title: 'Business Consultant, Housing', department: 'Housing Services', location: 'Ottawa, ON',
      salary_range: '$85,947.68 - $104,577.20 (yearly)', salary_min: 85947.68, salary_max: 104577.20, salary_period: 'yearly',
      employment_type: 'Full-time', duration: 'Up to 12 months', hours: '35 hours per week', availability: 'Weekdays',
      education_requirements: j(['Four-year university degree in business administration, business or financial analysis, information systems, computer science, or a related field']),
      experience_requirements: j(['At least 5 years of experience in business analysis, financial administration, information-systems administration or support, or coordination']),
      required_skills: j(['Business analysis and requirements gathering', 'Information-systems support', 'Report writing and documentation', 'Project coordination', 'Problem-solving', 'Technical leadership', 'Communication and stakeholder support']),
      language_requirements: j(['English']), is_unionized: 1, union_name: 'CIPP',
    },
    description: `## Overview
Provides business analysis and information-systems support for the City’s Housing Services.

## Responsibilities
- Analyze business requirements and recommend or implement improvements to business processes and information systems
- Serve as a functional source of expertise and maintain information-system functionality
- Coordinate with information-technology staff on configuration, troubleshooting, and problem resolution
- Provide training, guidance, and clarification to system users
- Develop reports, documentation, procedures, and information-system tools that support business functions`,
  },
  {
    id: 'b16ff21d4aa6', label: 'York University — Project Coordinator, Advancement',
    fields: {
      job_title: 'Project Coordinator, Advancement', department: 'Advancement and Alumni Engagement, Schulich School of Business', location: 'Toronto, ON',
      salary_range: '$80,330 (yearly)', salary_min: 80330, salary_max: 80330, salary_period: 'yearly', employment_type: 'Full-time',
      duration: '2026-07-01 to 2027-06-30', hours: '35 hours per week', availability: 'Weekdays',
      education_requirements: j(['University degree or equivalent recent York University experience']),
      experience_requirements: j(['At least 2 years of related fundraising experience', 'Experience developing, planning, and coordinating fundraising campaigns', 'Experience cultivating and maintaining donor, sponsor, and alumni relationships']),
      required_skills: j(['Fundraising campaign coordination', 'Donor and sponsor relationship management', 'Written and verbal communication', 'Project planning and coordination']),
      is_unionized: 1, union_name: 'YUSA 1',
    },
    description: `## Overview
Coordinates advancement projects and programs for the Schulich School of Business.

## Responsibilities
- Support the design, development, implementation, and evaluation of advancement projects and programs
- Plan and coordinate multiple fundraising programs in collaboration with internal and external partners
- Communicate with donors, sponsors, and partners to develop and maintain relationships
- Support campaign planning, implementation, and related advancement activities`,
  },
  {
    id: 'psft_44219', label: 'Western University — Program Manager',
    fields: {
      job_title: 'Program Manager', department: 'Arthur Labatt Family School of Nursing', location: 'London, ON',
      salary_range: '$60.00 (hourly)', salary_min: 60, salary_max: 60, salary_period: 'hourly', employment_type: 'Part-time',
      duration: '2026-09-01 to 2026-12-31', hours: 'Up to 24 hours per week', education_requirements: j(['Graduate degree in nursing']),
      experience_requirements: j(['Research experience in nursing']),
      required_skills: j(['Project management', 'Group facilitation and consensus building', 'Organization and communication', 'Nursing curriculum and program knowledge', 'Program approval and accreditation support']),
      is_unionized: 0, union_name: '',
    },
    description: `## Overview
Supports program development, evaluation, and approval activities for the School of Nursing.

## Responsibilities
- Support integration of RN Prescribing into undergraduate programs
- Support program-quality-assurance reporting and program refresh activities
- Support review of the post-RN primary-care evaluation model
- Support modifications to the Nurse Practitioner program
- Coordinate project activities, facilitate groups, and bring projects to completion`,
  },
  {
    id: '604049117', label: 'Shared Health Manitoba — LPN Rock Lake Hospital',
    fields: {
      job_title: 'LPN Rock Lake Hospital', department: 'Nursing', location: 'Crystal City, MB',
      salary_range: '$34.573 - $43.534 (hourly)', salary_min: 34.573, salary_max: 43.534, salary_period: 'hourly', work_model: 'On-site', employment_type: 'Part-time',
      hours: '7.75 hours', availability: 'Days; Nights; Weekends', education_requirements: j(['Approved Licensed Practical Nursing education program']),
      experience_requirements: j(['Recent acute-care experience is preferred']), license_requirements: j(['Current active registration with the College of Licensed Practical Nurses of Manitoba']),
      certification_requirements: j(['Basic Life Support (BLS)', 'Advanced Cardiac Life Support (ACLS)', 'Canadian Triage and Acuity Scale (CTAS)', 'Trauma Nursing Care Course (TNCC)']),
      required_skills: j(['Nursing-process application', 'Interdisciplinary collaboration', 'Conflict resolution', 'Problem-solving', 'Autonomous decision-making', 'Organization and flexibility', 'Confidentiality']),
      security_check_required: 1, is_unionized: 1, union_name: 'MNU',
    },
    description: `## Overview
Provides Licensed Practical Nursing care in an acute hospital and emergency-department setting.

## Responsibilities
- Apply the nursing process to support patients in achieving and maintaining their optimum level of health
- Work to the full scope of practice and maintain competency with professional standards and organizational policies
- Set work priorities and exercise independent judgment when responding to unusual matters
- Foster collaborative interdisciplinary relationships and contribute to quality improvement
- Protect confidential information and support patient care in a fast-paced environment`,
  },
  {
    id: '604829717', label: 'Region of Waterloo — Human Resources Assistant',
    fields: {
      job_title: 'Human Resources Assistant', department: 'Human Resources', location: 'Cambridge, ON',
      salary_range: '$36.38 (hourly)', salary_min: 36.38, salary_max: 36.38, salary_period: 'hourly', work_model: 'On-site', employment_type: 'Full-time', duration: 'Term',
      hours: '40 hours per week', availability: 'Weekdays', education_requirements: j(['Two-year college diploma in business studies or a related field']),
      experience_requirements: j(['At least 1 year of administrative experience', 'Experience with human-resources office procedures and processes']),
      required_skills: j(['Administrative support', 'Human-resources records and correspondence', 'Data entry and file management', 'Interview and scheduling coordination', 'Report preparation', 'Confidentiality and organization']),
      software_requirements: j(['Fingerprint scheduling software']), is_unionized: 1, union_name: 'Waterloo Regional Police Association',
    },
    description: `## Overview
Provides administrative support to the Human Resources branch and its business partners.

## Responsibilities
- Prepare and process correspondence, documents, presentations, reports, and meeting minutes
- Respond to routine human-resources inquiries and direct complex matters to the appropriate unit
- Track human-resources files, milestones, documentation, contracts, extensions, and follow-ups
- Maintain records, databases, tracking tools, templates, and intranet content
- Schedule interviews and fingerprint appointments and support recruitment activities
- Prepare dashboard reports, support reimbursements and purchasing, and coordinate meetings and travel`,
  },
  {
    id: '604740317', label: 'Canada Post — Post Office Assistant',
    fields: {
      job_title: 'Post Office Assistant', department: 'Retail', location: 'Vilna, AB', salary_range: '$20.54 (hourly)', salary_min: 20.54, salary_max: 20.54, salary_period: 'hourly',
      employment_type: 'Occasional', duration: 'Term', hours: '', availability: 'On-call',
      education_requirements: j(['High school or provincial equivalency, or business-administration experience']),
      experience_requirements: j(['Training or experience interacting with the public in a retail or service environment, including sales and cash transactions']),
      required_skills: j(['Postal product sales', 'Customer service', 'Mail sorting and processing', 'Cash transactions', 'Post-office accounting']),
      language_requirements: j(['English']), medical_requirements: j(['Ability to lift mail containers up to 50 lb and stand for extended periods']),
    },
    description: `## Overview
Provides counter-service and mail-processing support at a Canada Post retail location.

## Responsibilities
- Sell postal products and services to the public and business customers
- Sort, distribute, and process mail into the appropriate classifications
- Provide customers with information and forms
- Address delivery and service difficulties and resolve customer problems
- Process sales and cash transactions and support routine post-office operations`,
  },
  {
    id: 'psft_315073', label: 'City of Calgary — Human Resources Analyst',
    fields: {
      job_title: 'Calgary Police Service - Human Resources Analyst', department: 'Calgary Police Service, Business Partnership Unit', location: 'Calgary, AB',
      salary_range: '$91,229 - $114,036 (yearly)', salary_min: 91229, salary_max: 114036, salary_period: 'yearly', employment_type: 'Full-time', duration: 'Up to 12 months',
      hours: '35 hours per week', availability: 'Weekdays', education_requirements: j(['Degree in human resources, commerce, business, social sciences, or a related field']),
      experience_requirements: j(['At least 4 years of related human-resources experience', 'Experience with human-resources information systems or service delivery', 'Experience with labour relations, process mapping, workflow improvement, project coordination, or change management']),
      required_skills: j(['Human-resources consultation', 'Policy and collective-agreement interpretation', 'Coaching and conflict support', 'Process mapping and workflow analysis', 'Project coordination', 'Stakeholder engagement', 'Research and problem-solving']),
      is_unionized: 0, union_name: '',
    },
    description: `## Overview
Supports strategic human-resources initiatives and projects for the Calgary Police Service Business Partnership Unit.

## Responsibilities
- Consult with clients on organizational effectiveness, talent acquisition, labour relations, and human-resources service delivery
- Coach leaders and employees on career development, performance reviews, engagement, and workplace issues
- Analyze policies, collective agreements, and legislation and recommend appropriate actions
- Research practices and create tools and resources for human-resources initiatives
- Coordinate projects, process mapping, workflow analysis, stakeholder engagement, testing, and implementation
- Document human-resources processes and standard operating procedures`,
  },
  {
    id: '605111517', label: 'Shared Health Manitoba — Nurse 2 - Surgical Day Care',
    fields: {
      job_title: 'Nurse 2 - Surgical Day Care', department: 'Surgical Day Care - GGH', location: 'Winnipeg, MB', salary_range: '$42.985 - $52.732 (hourly)', salary_min: 42.985, salary_max: 52.732, salary_period: 'hourly', work_model: 'On-site', employment_type: 'Part-time',
      duration: '2026-09-01 to 2027-02-11', hours: '7.75 hours', availability: 'Days; Nights; Weekends', education_requirements: j(['Approved Registered Nursing education program']),
      experience_requirements: j(['Outpatient or pre-admission experience is preferred']), license_requirements: j(['Registration with the College of Registered Nurses of Manitoba']),
      certification_requirements: j(['Cardiopulmonary Resuscitation (CPR)']), required_skills: j(['Professional nursing care', 'Patient-care coordination', 'Delegation', 'Critical thinking and problem-solving', 'Prioritization', 'Independent and team-based practice', 'Communication']),
      security_check_required: 1, is_unionized: 1, union_name: 'MNU',
    },
    description: `## Overview
Provides professional registered nursing services in a surgical day-care setting.

## Responsibilities
- Provide independent nursing services and prescribed medical treatments
- Coordinate patient care and discharge as part of the health-care team
- Prioritize care for individual patients and groups of patients
- Delegate care appropriately and monitor outcomes
- Adapt to changing situations and work effectively under pressure
- Apply nursing standards, policies, protocols, and legislation in daily practice`,
  },
  {
    id: '605105417', label: 'Shared Health Manitoba — Nursing Assistant',
    fields: {
      job_title: 'Nursing Assistant', department: 'GD3 Trauma/Acute', location: 'Winnipeg, MB', salary_range: '$23.577 - $28.062 (hourly)', salary_min: 23.577, salary_max: 28.062, salary_period: 'hourly', work_model: 'On-site', employment_type: 'Part-time',
      hours: '7.75 hours', availability: 'Evenings; Weekends', education_requirements: j(['Complete high school education', 'Successful completion of a Nursing Assistant program or equivalent Health Care Aide and Unit Clerk programs', 'Medical terminology with a 75% pass mark']),
      required_skills: j(['Clerical support', 'Patient care and comfort', 'Routine domestic tasks', 'Basic keyboarding', 'Communication', 'Workload organization and prioritization', 'Teamwork']),
      security_check_required: 1, is_unionized: 1, union_name: 'CUPE',
    },
    description: `## Overview
Supports patient care, unit communication, and clerical operations as part of a multidisciplinary health-care team.

## Responsibilities
- Perform clerical tasks and act as a communication link for the unit
- Support patient care and comfort
- Complete routine domestic tasks that maintain a clean care environment
- Operate common information-technology equipment and provide administrative support
- Organize and prioritize assigned work and respond to simultaneous demands
- Assist with lifting, transferring, and transporting patients and equipment`,
  },
  {
    id: 'J0626-0721', label: "Queen's University — Group Administration Assistant",
    fields: {
      job_title: 'Group Administration Assistant', department: 'Canadian Cancer Trials Group', location: 'Kingston, ON', salary_range: '$48,325 - $58,930 (yearly)', salary_min: 48325, salary_max: 58930, salary_period: 'yearly', work_model: 'On-site', employment_type: 'Permanent', duration: 'Permanent',
      hours: '35 hours per week', availability: 'Weekdays', education_requirements: j(['Two-year post-secondary program in office administration, management, or a related field']),
      experience_requirements: j(['At least 2 years of office-administration experience in a medical or research environment']),
      required_skills: j(['Meeting and event administration', 'Budget and procurement coordination', 'Membership administration', 'Human-resources administration', 'Records and documentation management', 'Financial administration', 'Organization and problem-solving']),
      software_requirements: j(['Microsoft Office', 'Oracle', 'CareerQ', 'PeopleSoft']),
    },
    description: `## Overview
Provides administrative coordination for the Canadian Cancer Trials Group.

## Responsibilities
- Plan and coordinate national and international meetings, workshops, and retreats
- Support meeting budgets, vendor procurement, contracts, correspondence, and materials
- Coordinate membership processes, renewals, requirements, and compliance records
- Provide administrative support for recruitment, onboarding, human-resources, and financial processes
- Maintain files, manuals, training materials, and operational documentation
- Support reception, patient registration, sample processes, and other group operations as assigned`,
  },
];

async function main() {
  const db = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  console.log(APPLY ? 'APPLY mode' : 'DRY-RUN mode');
  for (const patch of patches) {
    const before = await db.execute({ sql: 'SELECT id, job_title, length(description) AS description_length FROM job_details WHERE id = ?', args: [patch.id] });
    if (!before.rows.length) throw new Error(`Missing job: ${patch.id}`);
    console.log(`${patch.id} ${patch.label}: ${before.rows[0]?.job_title} -> ${patch.fields.job_title}; description ${before.rows[0]?.description_length} -> ${patch.description.length}`);
    if (!APPLY) continue;
    const columns = Object.keys(patch.fields);
    await db.execute({ sql: `UPDATE job_details SET ${columns.map(column => `${column} = ?`).join(', ')}, description = ? WHERE id = ?`, args: [...columns.map(column => patch.fields[column]), patch.description, patch.id] });
    await db.execute({ sql: 'UPDATE jobs SET verified_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1', args: [patch.id] });
  }
  if (APPLY) console.log(`Applied and verified ${patches.length} source-backed corrections.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
