/**
 * QUALITY.md manual audit of 10 additional random active listings selected
 * 2026-08-13.
 *
 * Usage: npx tsx manual-quality-audit-2026-08-13-round-3.ts [--apply]
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
};

const patches: Patch[] = [
  {
    id: '603353217',
    label: 'Shared Health Manitoba — General Duty Medical Laboratory Technologist',
    fields: {
      job_title: 'General Duty Medical Laboratory Technologist',
      department: 'Bethesda Laboratory',
      location: 'Steinbach, MB',
      salary_range: '$40.367 - $50.642 (hourly)',
      salary_min: 40.367,
      salary_max: 50.642,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: null,
      hours: '7.75 hours per day; 0.80 FTE',
      availability: 'Days; Nights; Weekends; Standby; On-call',
      start_date: 'ASAP',
      education_requirements: j(['Graduate of an approved Medical Laboratory Technology program']),
      license_requirements: j(['Current registration or eligibility for registration with the College of Medical Laboratory Technologists of Manitoba (CMLTM)']),
      security_check_required: 1,
      required_skills: j(['Clinical laboratory analysis and reporting', 'Quality assurance and accreditation standards', 'Attention to detail', 'Confidentiality', 'Independent and team-based work', 'Analytical problem-solving']),
      language_requirements: j(['English']),
      is_unionized: 1,
      union_name: 'MAHCP',
    },
    description: `## Overview
Performs clinical laboratory analysis and reporting at Bethesda Hospital in Steinbach, with travel to Ste. Anne and St. Pierre as operationally required.

## Responsibilities
- Analyze and report patient samples according to established protocols
- Assist with laboratory projects, standard operating procedures, and chemical inventories
- Maintain a safe laboratory environment and comply with quality-assurance and accreditation standards
- Rotate through workstations and participate in standby and callback coverage

## Qualifications
- Graduate of an approved Medical Laboratory Technology program
- Current registration or eligibility for registration with CMLTM
- Effective written and oral English communication
- Ability to follow instructions precisely, work under pressure, protect confidentiality, and work independently or in a team
- Previous related experience is preferred; current CSMLS membership is an asset`,
  },
  {
    id: '604706617',
    label: 'Canada Post — Postal Clerk',
    fields: {
      job_title: 'Postal Clerk - Retail and Operations',
      department: 'Retail',
      location: 'Woodstock, NB',
      salary_range: '$23.81 (hourly)',
      salary_min: 23.81,
      salary_max: 23.81,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Temporary',
      duration: 'Temporary; On-call',
      hours: 'Varied shifts',
      availability: 'Days; Evenings; Overnights; Weekends; Flexible schedule; On-call',
      education_requirements: j([]),
      experience_requirements: j(['Customer service experience in a retail environment']),
      required_skills: j(['Customer service', 'Retail sales', 'Cash and financial transactions', 'Inventory control', 'Mail sorting and processing', 'Point-of-sale operation']),
      language_requirements: j(['English or French']),
      medical_requirements: j(['Standing for up to 3.5 hours at a time', 'Handling mail up to 22.7 kg and carrying mail up to 15.9 kg']),
      benefits: j([]),
      security_check_required: null,
    },
    description: `## Overview
Provides temporary on-call retail and mail-processing support at the Canada Post office in Woodstock, New Brunswick.

## Responsibilities
- Serve customers and sell postal products and services
- Operate point-of-sale systems and process cash, cheque, debit, and credit transactions
- Maintain floor displays, inventory, and product knowledge
- Receive, sort, sequence, batch, and review mail
- Operate mail-processing equipment and move mail between work areas when required

## Qualifications and work conditions
- Customer-service experience in a retail environment
- Sales and production-environment experience are assets
- Flexible availability for day, evening, overnight, and weekend shifts
- Must stand for extended periods and handle mail items weighing up to the stated limits`,
  },
  {
    id: 'Application-Development-Manager_R26_00477',
    label: 'OLG — Software Engineering Level 3',
    fields: {
      job_title: 'Software Engineering Level 3',
      location: 'Sault Ste. Marie, ON; Toronto, ON',
      salary_range: '$78,400 - $117,600 (annual)',
      salary_min: 78400,
      salary_max: 117600,
      salary_period: 'annual',
      work_model: 'On-site',
      employment_type: 'Full-time',
      duration: null,
      benefits: j(['Employer-paid group benefits for eligible permanent employees', 'Defined benefit pension plan', 'Performance-based variable pay for eligible permanent employees', 'Paid time off', 'Learning and development programs']),
      education_requirements: j(['Bachelor’s degree in Computer Science, Engineering, or a related field, or an equivalent combination of education and experience']),
      experience_requirements: j(['6–8+ years of progressive software development experience', '3–5 years in a senior developer or technical lead capacity', 'Experience designing, building, testing, deploying, and supporting scalable applications across cloud and on-premises environments']),
      required_skills: j(['Software architecture and solution design', 'Data integration and ETL', 'Application development and support', 'Agile and DevOps practices', 'CI/CD and test automation', 'Incident resolution and root-cause analysis', 'Cross-functional collaboration and technical leadership']),
      software_requirements: j(['Multiple programming languages', 'Cloud and distributed systems', 'APIs and middleware', 'Databases', 'Containerization', 'Operating systems', 'Observability tools']),
    },
    description: `## Overview
Designs, develops, deploys, and supports moderately complex software systems and enterprise data integrations for OLG’s Sports Based Games technology team. The role is based in Sault Ste. Marie or Toronto and is normally on-site.

## Responsibilities
- Lead software design, development, testing, deployment, maintenance, and production support
- Design and maintain data-integration and ETL solutions
- Translate business and technical requirements into scalable workflows
- Coordinate releases and deployment activities using automation and DevOps practices
- Monitor applications, resolve incidents, analyze root causes, and improve performance and reliability
- Apply technology governance, security, change-management, and service-management standards
- Collaborate with development, QA, infrastructure, and business teams and mentor engineers

## Qualifications
- Bachelor’s degree in Computer Science, Engineering, or a related field, or equivalent education and experience
- 6–8+ years of progressive software-development experience, including 3–5 years in a senior or technical-lead role
- Knowledge of modern application development, cloud and distributed systems, APIs, databases, containerization, observability, Agile, DevOps, CI/CD, and test automation
- Strong problem-solving, communication, stakeholder-management, collaboration, and time-management skills`,
  },
  {
    id: '1291443447',
    label: 'University of Guelph — Linc Service Assistant',
    fields: {
      job_title: 'Linc Service Assistant',
      department: 'Office of Registrarial Services',
      location: 'Guelph, ON',
      salary_range: 'Band 5, USW Local 4120 wage grid',
      work_model: null,
      employment_type: 'Regular',
      duration: null,
      is_student: 0,
      is_unionized: 1,
      union_name: 'USW Local 4120',
      education_requirements: j(['Minimum two-year community college diploma']),
      experience_requirements: j(['At least 2 years of front-line customer-service experience in a dynamic environment']),
      required_skills: j(['Student and customer service', 'Confidential records handling', 'Admissions and enrolment guidance', 'Academic and financial-record support', 'High-volume data entry', 'Empathetic communication and de-escalation', 'Organization and attention to detail']),
      software_requirements: j(['Colleague', 'WebAdvisor', 'Student Planning', 'Slate', 'GryphForms', 'OSAP administration tools']),
      language_requirements: j(['English']),
      benefits: j([]),
    },
    description: `## Overview
Provides front-line service through the Lincoln Alexander Student Service Centre at the University of Guelph’s Office of Registrarial Services.

## Responsibilities
- Answer student, staff, faculty, and visitor inquiries by phone, email, live chat, and in person
- Advise on admissions, enrolment, course registration, student records, financial aid, scholarships, tuition, exams, and graduation
- Review documents and explain academic, financial, immigration, and study-permit processes
- Process applications, financial-aid records, student records, and enrolment data accurately
- De-escalate sensitive situations, protect confidential information, support events, and provide backup across the office

## Qualifications
- Minimum two-year community college diploma; an undergraduate degree is preferred
- At least 2 years of front-line customer-service experience
- Strong judgment, communication, interpersonal, organizational, computer, and high-volume data-entry skills
- Ability to work independently and as part of a team`,
  },
  {
    id: 'CUPE---Automne-2026---AE----CMN2568-A00_JR38366',
    label: 'University of Ottawa — CMN2568 teaching assistant',
    fields: {
      job_title: 'Teaching Assistant, CMN2568 - Mondialisation et communication',
      department: 'Department of Communication - Students and Casuals',
      location: 'Ottawa, ON',
      salary_range: '$33.83 - $53.31 (hourly)',
      salary_min: 33.83,
      salary_max: 53.31,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: '2026-09-01 to 2026-12-31',
      hours: '45 total hours',
      start_date: '2026-09-01',
      academic_role_type: 'teaching_assistant',
      academic_course: 'CMN2568 - Mondialisation et communication',
      academic_workload: '45 total hours',
      academic_supervisor: 'Isaac Nahon-Serfaty',
      academic_appointment_type: 'Teaching Assistant/Demonstrator/Lab Monitor (CUPE)',
      academic_schedule: null,
      education_requirements: j(['Bachelor’s degree in communication or a related field']),
      experience_requirements: j([]),
      language_requirements: j(['French']),
      required_skills: j(['Communication', 'Teaching assistance', 'Student support', 'Grading and proctoring']),
      responsibility_tags: j(['Teaching assistance', 'Student support', 'Grading', 'Exam proctoring']),
      qualification_tags: j(['Bachelor’s degree in communication or a related field']),
      software_requirements: j([]),
      is_unionized: 1,
      union_name: 'CUPE 2626',
    },
    description: `## Overview
Supports teaching for CMN2568, Mondialisation et communication, during the Fall 2026 semester at the University of Ottawa.

## Responsibilities
- Carry out the work allocation negotiated with the supervising professor
- Support research, preparation, student contact, grading, course participation, and exam proctoring as assigned
- Provide in-person and/or online consultation and student support

## Qualifications and terms
- Bachelor’s degree in communication or a related field
- French is the language of work
- 45 total hours from September 1 through December 31, 2026
- Undergraduate students are paid $33.83 per hour; graduate students are paid $53.31 per hour
- Teaching assistant appointment governed by the CUPE 2626 collective agreement`,
  },
  {
    id: 'neogov_120790',
    label: 'Cambrian College — Fire Program Technologist',
    fields: {
      job_title: 'Fire Program Technologists',
      department: 'School of Health Sciences and Emergency Services',
      location: 'Sudbury, ON',
      workplace_address: '1400 Barrydowne Road, Sudbury, ON P3A 3V8',
      salary_range: '$34.13 (hourly)',
      salary_min: 34.13,
      salary_max: 34.13,
      salary_period: 'hourly',
      work_model: 'On-site',
      employment_type: 'Part-time',
      duration: 'Temporary or casual on-call',
      hours: 'Up to 24 hours per week',
      availability: 'Flexible schedule; On-call',
      start_date: '2026-09',
      education_requirements: j(['Minimum one-year certificate in Pre-Service Firefighter Education and Training, Fire Science, or a related field, or equivalent education and experience']),
      license_requirements: j(['Valid DZ driver’s licence']),
      certification_requirements: j(['NFPA 1001 Firefighter Level I and Level II', 'NFPA 1072 Hazardous Materials', 'Current First Aid and CPR']),
      required_skills: j(['Fire-service equipment and PPE', 'Fire-training lab operations', 'OFM Practical Skills and Evaluation Processes', 'Equipment and inventory organization', 'Safe practical training support', 'Communication and teamwork']),
      experience_requirements: j(['Relevant experience in the fire service or a fire-training environment']),
      benefits: j(['CAAT Pension Plan']),
      vehicle_required: 1,
      is_unionized: null,
      union_name: null,
      security_check_required: null,
    },
    description: `## Overview
Supports Cambrian College’s Pre-Service Firefighter program in temporary part-time or casual on-call roles beginning September 2026.

## Responsibilities
- Plan, set up, organize, inspect, and restore fire-training labs and practical learning environments
- Support faculty with practical laboratory and training activities
- Demonstrate previously taught skills and procedures under faculty direction
- Maintain fire-service equipment, supplies, PPE, inventory, security, and safe operating conditions
- Reinforce safety procedures and report concerns or non-compliance
- Collaborate with faculty and program staff

## Qualifications
- Minimum one-year certificate in Pre-Service Firefighter Education and Training, Fire Science, or a related field, or equivalent education and experience
- NFPA 1001 Firefighter Level I and II and NFPA 1072 Hazardous Materials certifications
- Current First Aid and CPR certificates and a valid DZ driver’s licence
- Relevant fire-service or fire-training experience
- Knowledge of fire-service equipment, PPE, safe training practices, OFM Practical Skills, and OFM Evaluation Processes`,
  },
  {
    id: '599104517',
    label: 'Shared Health Manitoba — Recreation Worker II',
    fields: {
      job_title: 'Recreation Worker II (Certified)',
      department: 'Recreation',
      location: '',
      salary_range: 'As per CUPE Collective Agreement',
      work_model: null,
      employment_type: 'Full-time',
      duration: null,
      hours: '1.0 FTE; 08:15-16:30 / 12:15-20:30',
      availability: 'Days',
      start_date: 'ASAP',
      education_requirements: j(['Degree in Recreation or Recreation Facilitator for Older Adults Certificate, or equivalent']),
      experience_requirements: j(['Related experience in long-term care or with people with disabilities']),
      certification_requirements: j(['Valid Food Handling Certificate']),
      software_requirements: j(['Windows personal-computer environment']),
      language_requirements: j(['English', 'French']),
      security_check_required: 1,
      medical_requirements: j(['Ability to meet the mental and physical demands of the job']),
      required_skills: j(['Activity planning and facilitation', 'Group facilitation', 'Planning and organization', 'Independent and team-based work', 'Interpersonal and leadership skills', 'Workplace health and safety', 'WHMIS']),
      is_student: 0,
      is_unionized: 1,
      union_name: 'CUPE',
    },
    description: `## Overview
Plans and delivers recreation programs that support the social, mental, emotional, and physical well-being of residents in a long-term-care setting.

## Responsibilities
- Assess residents and plan and implement individual and group activity programs
- Use facility and community resources to support quality of life
- Contribute to team conferences and work independently or as part of a team
- Follow workplace health and safety practices and WHMIS requirements

## Qualifications and terms
- Degree in Recreation or Recreation Facilitator for Older Adults Certificate, or equivalent
- Valid Food Handling Certificate
- Related long-term-care or disability-support experience
- Windows computer experience, strong group-facilitation and interpersonal skills, and the ability to meet the mental and physical demands of the job
- Bilingual English/French position
- Full-time, 1.0 FTE day assignment with current shifts of 08:15-16:30 and 12:15-20:30
- Satisfactory Criminal Record Check, Vulnerable Sector Check, and Adult Abuse Registry Check required`,
  },
  {
    id: '13488',
    label: 'TTC — Project Manager',
    fields: {
      job_title: 'Project Manager',
      department: 'Capital Project Delivery Office',
      location: 'Toronto, ON',
      salary_range: '$129,693.20 - $162,089.20 (annual)',
      salary_min: 129693.2,
      salary_max: 162089.2,
      salary_period: 'annual',
      work_model: 'Hybrid',
      employment_type: 'Regular full-time',
      duration: null,
      hours: '35 hours per week',
      availability: 'Weekdays',
      education_requirements: j(['University degree in Engineering, Construction Management, Project Management, or a related discipline, or equivalent education and experience']),
      license_requirements: j(['Full membership in the Association of Professional Engineers of Ontario (PEO)', 'Valid Ontario Class G driver’s licence']),
      experience_requirements: j(['Extensive experience managing heavy construction, infrastructure, transit, or other large multidisciplinary capital projects', 'Experience managing scope, budgets, schedules, contracts, construction execution, commissioning, claims, and project risks']),
      required_skills: j(['Capital-project delivery', 'Project scope, budget, and schedule management', 'Contract administration', 'Construction and commissioning', 'Risk and issue management', 'Stakeholder and consultant coordination', 'Leadership, negotiation, and conflict resolution']),
      software_requirements: j(['Project-management software', 'Scheduling tools', 'Microsoft Office']),
      vehicle_required: 1,
      benefits: j(['Defined benefit pension plan', 'Health, dental, and vision coverage', 'Professional development and learning programs', 'Hybrid work approach']),
    },
    description: `## Overview
Leads complex, multi-year capital projects for the Toronto Transit Commission from initiation through design, procurement, construction, commissioning, and close-out.

## Responsibilities
- Define project scope, objectives, budgets, schedules, forecasts, and deliverables
- Manage multiple concurrent capital projects and contracts
- Coordinate engineering design, tendering, procurement, construction, commissioning, and turnover
- Manage consultants and contractors, including performance, changes, payments, claims, and contracts
- Identify and mitigate project risks and issues
- Prepare approvals, business cases, reports, status updates, and recommendations for senior leadership and external stakeholders
- Oversee site activities, quality, safety, deficiency resolution, and operational readiness

## Qualifications
- University degree in Engineering, Construction Management, Project Management, or a related discipline, or equivalent education and experience
- Full PEO membership and a valid Ontario Class G driver’s licence
- Extensive multidisciplinary capital-project experience
- Strong analytical, leadership, communication, negotiation, organizational, and decision-making skills`,
  },
  {
    id: '5b5a5cf1357f',
    label: 'York University — Recruitment & Campus Ambassador',
    fields: {
      job_title: 'Recruitment & Campus Ambassador',
      department: 'Undergraduate Student Services, Faculty of Education',
      location: 'Keele Campus, ON',
      salary_range: '$17.60 - $18.00 (hourly)',
      salary_min: 17.6,
      salary_max: 18,
      salary_period: 'hourly',
      work_model: null,
      employment_type: 'Casual',
      duration: '2026-09-08 to 2027-04-30',
      hours: 'Up to 15 hours per week',
      availability: 'As per schedule',
      start_date: '2026-09-08',
      education_requirements: j(['Must be enrolled as a York University student']),
      required_skills: j(['Campus tours and recruitment presentations', 'Orientation activities', 'Organization', 'Initiative and leadership', 'Social activities, programs, and events', 'Respectful and inclusive community-building']),
      benefits: j([]),
      is_student: 1,
      career_stage: 'Undergraduate student',
    },
    description: `## Overview
Supports recruitment and outreach for York University’s Faculty of Education as a Work Study - LEAP campus ambassador at the Keele Campus.

## Responsibilities
- Lead or support campus tours, recruitment presentations, and orientation activities
- Plan social activities, programs, and events that build an engaged community
- Represent the university responsibly, ethically, professionally, and inclusively
- Organize tasks, take initiative, and support recruitment outreach

## Qualifications and terms
- Must be enrolled as a York University student
- Previous work experience may be considered
- Casual Work Study position from September 8, 2026 through April 30, 2027
- Up to 15 hours per week, as scheduled
- Participation is restricted to eligible undergraduate York students`,
  },
  {
    id: '4801',
    label: 'City of Victoria — Transportation Engineering Technician',
    fields: {
      job_title: 'Transportation - Engineering Technician',
      department: 'Engineering & Public Works',
      location: 'Victoria, BC',
      salary_range: '$44.25 (hourly)',
      salary_min: 44.25,
      salary_max: 44.25,
      salary_period: 'hourly',
      work_model: 'Hybrid',
      employment_type: 'Regular full-time',
      duration: 'Continuous',
      hours: '35 hours per week',
      availability: 'Weekdays',
      education_requirements: j(['Two-year technical school diploma in Civil Engineering Technology']),
      license_requirements: j(['Current and valid Class 5 B.C. driver’s licence']),
      certification_requirements: j(['Traffic Control Certification (16 hours)']),
      experience_requirements: j(['2 years of related experience or an equivalent combination of education and experience']),
      required_skills: j(['Transportation planning, operations, and design', 'Civil engineering planning and construction', 'Computer-aided drafting and engineering software', 'Field investigation and inspection', 'Cost estimating and project coordination', 'Technical drawing and standards interpretation', 'Public and agency communication']),
      software_requirements: j(['Computer-aided drafting software', 'Engineering software', 'Word processing and spreadsheet software']),
      vehicle_required: 1,
      is_unionized: 1,
      union_name: 'CUPE Local 50',
    },
    description: `## Overview
Performs transportation planning, operations, design, drafting, inspection, and technical review for the City of Victoria’s Engineering & Public Works department.

## Responsibilities
- Research, analyze, and recommend solutions for transportation safety, design, and operations
- Produce civil-engineering drawings, plans, cost estimates, records, maps, and reports
- Inspect construction sites and review permit, development, utility, and street-occupancy submissions
- Provide technical information to staff, consultants, contractors, agencies, and the public
- Conduct field investigations and calculations for transportation infrastructure and safety
- Apply project-management principles and verify compliance with City standards and safety requirements

## Qualifications and terms
- Two-year technical diploma in Civil Engineering Technology
- Traffic Control Certification and a valid Class 5 B.C. driver’s licence
- 2 years of related experience or an equivalent combination of education and experience
- Regular full-time, continuous CUPE Local 50 position with a 35-hour Monday-to-Friday work week
- May be eligible for hybrid work; the posting is open to current City of Victoria employees only`,
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
    if (!APPLY) continue;
  }

  if (!APPLY) {
    console.log('\nDry run complete.');
    return;
  }

  for (const patch of patches) {
    const columns = Object.keys(patch.fields);
    const sets = columns.map(column => `${column} = ?`).join(', ');
    await db.execute({
      sql: `UPDATE job_details SET ${sets}, description = ? WHERE id = ?`,
      args: [...columns.map(column => patch.fields[column]), patch.description, patch.id],
    });
    console.log(`   ✓ corrected ${patch.id}`);
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
