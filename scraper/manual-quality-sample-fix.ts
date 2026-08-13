/**
 * One-off quality fix for a random sample of 10 active jobs.
 * Applies QUALITY.md rules: fill structured fields from evidence, strip
 * duplicate/boilerplate prose from descriptions.
 *
 * Usage: npx tsx manual-quality-sample-fix.ts [--apply]
 */
import { initDb } from './db';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Patch = {
  id: string;
  label: string;
  fields: Record<string, string | number | null>;
  description: string;
  notes: string[];
};

function j(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return '[]';
  return JSON.stringify(arr);
}

const patches: Patch[] = [
  // ── 0. UOttawa APTPUO API5135D ──────────────────────────────────────────
  {
    id: 'APTPUO---Winter-2027---API5135D_JR37962',
    label: 'UOttawa Ethics and Moral Reasoning (API5135D)',
    fields: {
      salary_max: 239.47,
      salary_range: '239.47 (hourly)',
      hours: '39 hours (3 credits)',
      duration: 'Winter 2027 semester',
      education_requirements: j(['Ph.D. in philosophy or political philosophy']),
      required_skills: j([
        'Apply philosophical and moral reasoning to public and international affairs problems',
      ]),
      language_requirements: j([
        'English (language of instruction)',
        'Active competence in second language',
      ]),
      experience_requirements: null,
      benefits: j([]),
    },
    description: `## Overview
Examination of ethics and moral reasoning applied to the study of public policy and international affairs. Current debates in moral philosophy and how they help to better understand contemporary controversies in public and international affairs. Examination of current policy debates such as justice in social and environmental policy, military intervention in international affairs, and accommodation of religious and ethnic differences in liberal democracies.

Course schedule: Tuesdays 17:30–20:30. Expected enrolment: 24. 3 credits.

## Qualifications
- Demonstrated ability to apply philosophical and moral reasoning to the analysis of problems of public and international affairs
- An acceptable level of education and/or experience may be considered equivalent`,
    notes: [
      'Filled hours (39), duration (Winter 2027), salary_max, language',
      'Overview keeps course curriculum (unique vs generic duties)',
      'Removed Compensation section (salary already structured)',
      'Moved skill out of duplicated education bullet',
    ],
  },

  // ── 1. Region of Waterloo Student HR ────────────────────────────────────
  {
    id: '603746717',
    label: 'Region of Waterloo Student, Human Resources',
    fields: {
      hours: '35 per week',
      education_requirements: j([
        'Current enrolment in a post-secondary program in human resources, business administration, adult education, public administration, information management, data analytics, or related field',
      ]),
      experience_requirements: j([
        'Related co-op, internship, project, or work experience',
      ]),
      required_skills: j([
        'Process documentation and continuous improvement',
        'Analytical and problem-solving',
        'Written communication for procedures, job aids, and reports',
        'Organizational and time-management',
        'Discretion and confidentiality',
      ]),
      software_requirements: j(['Microsoft Office', 'Excel']),
      benefits: j([]),
    },
    description: `## Overview
Supports the Learning and Development team with process documentation, reporting and dashboard support, testing, research, and project coordination. Contributes to improvement and usability of learning and development processes, resources, reporting, and the Region’s SAP SuccessFactors Learning module.

## Responsibilities
- Support supervisor and Learning and Development team with projects and day-to-day activities to improve service delivery, processes, and user experience
- Document current-state and future-state learning and development processes and workflows; identify opportunities to streamline forms, templates, and tools
- Create, update, and maintain documentation such as standard operating procedures, process maps, checklists, job aids, FAQs, templates, and reference guides
- Collect, compile, validate, and organize data from SAP SuccessFactors Learning, SAP Report Center, Power BI, and Excel spreadsheets
- Support recurring and ad hoc reporting by preparing data summaries, identifying trends or inconsistencies, and flagging data quality issues
- Assist with preparation, testing, validation, and maintenance of reports, dashboards, and other reporting tools
- Support SAP SuccessFactors Learning testing by documenting test scenarios, recording results, tracking issues, and verifying updates
- Organize, tag, and curate free and existing learning resources for easy access by employees and leaders
- Prepare clear documents, presentations, summaries, reports, and communications for learning and development initiatives

## Qualifications
- Interest in process documentation, reporting, systems testing, research, and continuous improvement
- Ability to learn new systems, tools, processes, and business requirements quickly
- Interpersonal and collaboration skills to work effectively with colleagues and stakeholders
- Ability to travel within Waterloo Region

## Nice to Have
- Experience with Power BI, SAP SuccessFactors, HR Information Systems, Learning Management System platforms, or other enterprise systems`,
    notes: [
      'Extracted hours 35/week; split education vs experience',
      'Moved Power BI/SAP from required_skills to Nice to Have (source says preferred)',
      'Removed Compensation section (salary + hours already structured)',
      'Stripped education/software bullets that duplicated structured fields',
    ],
  },

  // ── 2. UOttawa Stage I PED3600 ──────────────────────────────────────────
  {
    id: 'APTPUO---Automne-2026---PED3600-V02---STAGE-I-MILIEU-SCOL-LMENT_JR37920',
    label: 'UOttawa Stage I en milieu scolaire élémentaire',
    fields: {
      salary_max: 239.47,
      salary_range: '239.47 (hourly)',
      hours: '39 hours (3 credits)',
      duration: 'October 2 to December 11, 2026',
      education_requirements: j(['Maîtrise en éducation']),
      experience_requirements: j([
        "Expérience récente dans l'enseignement ou l'administration scolaire au niveau primaire/junior",
      ]),
      required_skills: j([
        "Qualification dans un domaine lié à l'enseignement dans les écoles de langue française en Ontario",
        "Connaissance du programme d'études de l'Ontario, des normes de pratique et du code de déontologie de l'Ordre des enseignantes et des enseignants de l'Ontario",
      ]),
      language_requirements: j([
        'Français (enseignement)',
        'Compétence passive en seconde langue',
      ]),
      work_model: 'Hybrid',
      benefits: j([]),
    },
    description: `## Overview
Observations et activités d'apprentissage et d'analyse de l'enseignement aux cycles primaire et moyen. Familiarisation aux différents aspects de la profession enseignante. Retour réflexif sur les notions théoriques et sur les expériences réalisées dans le cadre des stages et des séminaires d'intégration. Élaboration d'un dossier professionnel d'apprentissage. Mode d'enseignement: cours hybride à distance, alternant synchrone et asynchrone.

## Responsibilities
- Offrir un accompagnement pédagogique et un soutien affectif favorisant le développement progressif des compétences professionnelles en enseignement
- Mettre en place des modalités efficaces de supervision à distance en utilisant des outils numériques appropriés
- Soutenir activement l'enseignante ou l'enseignant accompagnateur pour assurer une cohérence dans l'encadrement du stagiaire
- Planifier, réaliser et documenter des séances d'observation ainsi que des rencontres de rétroaction en dyade et en triade à distance
- Participer à la séance d'information obligatoire du 17 septembre 2026 (10 h à 12 h)
- Animer les séminaires de stage aux dates prévues
- Attribuer la note sommative du stage et l'entrer dans le registre au plus tard 10 jours après la fin du stage

## Qualifications
- L'université peut considérer une expérience ou des qualifications équivalentes`,
    notes: [
      'Filled hours (39), experience, language; set salary_max',
      'Overview keeps curriculum content; removed stage dates already in duration',
      'Removed Compensation section; stripped education/experience bullets into fields',
    ],
  },

  // ── 3. CSC Clinical Social Worker ───────────────────────────────────────
  {
    id: '2415935',
    label: 'CSC Clinical Social Worker (inventory)',
    fields: {
      education_requirements: j([
        'Degree from a recognized post-secondary institution with acceptable specialization in social work',
      ]),
      experience_requirements: j([
        'Experience providing Social Work services to clients in mental health settings or correctional settings',
        'Experience working independently with minimal clinical supervision',
        'Experience working as part of an interdisciplinary team',
      ]),
      certification_requirements: j([
        'Registration as a Social Worker with a provincial registering/licensing body',
      ]),
      license_requirements: j(["Valid driver's license"]),
      language_requirements: j([
        'Bilingual imperative CCC/CCC, CBC/CBC, or BBB/BBB',
      ]),
      security_check_required: 1,
      vehicle_required: 1,
      is_inventory: 1,
      listing_type: 'inventory',
      required_skills: j([
        'Integrity and respect',
        'Thinking things through',
        'Working effectively with others',
        'Showing initiative and being action-oriented',
        'Effective communication',
      ]),
      benefits: j([]),
      salary_range: '86348 - 106671 (yearly)',
    },
    description: `## Overview
Inventory process to staff bilingual Clinical Social Worker (SW-SCW-02) positions in the Atlantic Region (Dorchester NB, Renous NB, Saint John NB, Springhill NS). A pool of fully or partially qualified candidates may be established for similar positions with various tenures (indeterminate, term, casual).

Plus Correctional Service Specific Duty Allowance of $2,140 per year; Master's Degree in Social Work allowance of $3,850 (allowances subject to change). Commuting assistance may apply.

## Qualifications
Essential education and experience are captured in structured fields.

Asset education: Master's degree in Social Work from a recognized post-secondary institution.

Asset experience:
- Social Work services to culturally diverse populations
- Community mental health, medical, acute, or forensic settings
- Crisis intervention services
- Establishing and managing partnerships with community-based services
- Social Work services to vulnerable populations (e.g. cognitively impaired/brain-injured, geriatric, adults disadvantaged or in conflict with the law, Indigenous peoples)

## Operational Requirements
- Willingness to travel frequently within a province or region
- Ability to work overtime on short notice or variable hours
- Valid driver's license

## Conditions of Employment
- Reliability Status security clearance
- Registration as a Social Worker with a provincial registering/licensing body`,
    notes: [
      'Fixed education (was asset Master’s labeled as EDUCATION:)',
      'Filled experience, certification, security_check_required',
      'Stripped CSC employer marketing, EDI/preference, how-to-apply, HR contacts (#4 #6 #9)',
      'Language/driver’s kept structured; description no longer restates essential edu/exp verbatim',
    ],
  },

  // ── 4. Pay and Benefits Specialist (CSIS) ───────────────────────────────
  {
    id: '2439907',
    label: 'CSIS Pay and Benefits Specialist L05/L06',
    fields: {
      department: 'Canadian Security Intelligence Service (CSIS)',
      salary_min: 73008,
      salary_max: 103124,
      salary_range: '73008 - 103124 (yearly; L05 and L06)',
      salary_period: 'yearly',
      employment_type: 'Permanent',
      work_model: 'On-site',
      education_requirements: j([
        'Level 05: 2-year college diploma and 2 years experience, or high school diploma and 4 years experience',
        'Level 06: 2-year college diploma and 3 years experience, or high school diploma and 4 years experience',
      ]),
      experience_requirements: j([
        'Level 05: Recent experience processing compensation / pay and benefits services (private sector or Federal Public Service)',
        'Level 06: Recent experience as a fully trained Pay Specialist using Phoenix, administering pay and benefits in the Federal Public Service',
        'Level 05 & 06: Recent experience processing data entries in an HRMS (PeopleSoft, Workday, Phoenix, SAP, Ceridian, and/or RPS)',
        'Experience in client service as a resource person',
      ]),
      language_requirements: j(['Bilingual imperative BBB/BBB']),
      security_check_required: 1,
      software_requirements: j([
        'Phoenix Pay System',
        'HRMS (PeopleSoft, Workday, SAP, Ceridian, or RPS)',
      ]),
      required_skills: j([
        'Adaptability / Flexibility',
        'Analytical Skills',
        'Client Service',
        'Problem Solving',
        'Rigour',
      ]),
      benefits: j(['pension', 'health', 'dental']),
      is_unionized: 0,
      union_name: 'Non-Union',
    },
    description: `## Overview
Two-level posting for Junior Pay and Benefits Specialist (Level 05) and Pay and Benefits Specialist (Level 06). Work must be done in the office (not remote). Eligible for Pay Market Modifier (6.5% L05 / 9.5% L06 on basic salary).

## Responsibilities
### Junior Pay and Benefits Specialist (Level 05)
- Learn and manage systems in the Pay Section training plan; complete PSPC training to become a Pay and Benefits Specialist
- Administer pay and benefits and counsel employees on pay and leave topics under trainer guidance
- Research and analyze policy, insurance, and benefits data to determine entitlements and initiate pay transactions
- Prepare documentation for hire, leave without pay, transfer, retirement, resignation, etc.
- Coordinate continuation of benefits/deductions with other departments under trainer guidance
- Verify pay transactions and pay files; perform cheque release under trainer guidance
- Liaise with government offices, insurers, and financial institutions on salary, benefit, and pension entitlements
- Organize workload, meet deadlines, set priorities, and ensure pay-system data accuracy
- Maintain internal databases for reporting; initiate/monitor leave, adjustments, appointments, transfers, pension and insurance plans
- Exercise FAA s.34 certification authority for payments; compose compensation correspondence under guidance

### Pay and Benefits Specialist (Level 06)
- Coordinate and administer pay and benefits; interpret TB and PSPC policies, directives, and regulations
- Research complex pay issues against legislation, pension/insurance plans, collective agreements, and governing authorities
- Provide in-depth counselling on resignations, lay-offs, overpayments, retirements, survivor benefits, insurance, disability, divorce/separation, and garnishment
- Peer-verify transactions; maintain administrative procedures and tools related to compensation
- Contribute to system improvement initiatives (e.g. PBIS, HRIS, HRMIS)

## Conditions of Employment
- Eligible for Enhanced Top Secret security clearance (security interview, polygraph, and background investigation including credit/financial checks)`,
    notes: [
      'Filled department (CSIS), education, experience, software, skills, security',
      'Corrected salary range to advertised L05/L06 bands',
      'Description is duties-only; removed how-to-apply and security essay padding into field',
    ],
  },

  // ── 5. City of Hamilton Instructor ──────────────────────────────────────
  {
    id: '2219',
    label: 'City of Hamilton Instructor (Transit training)',
    fields: {
      hours: '40 per week',
      experience_requirements: j([
        'Previous experience and demonstrated skills related to transit training and evaluation duties',
        'Demonstrated extensive vehicle operation in public transit with valid Class BZ or CZ Ontario driver’s licence',
      ]),
      education_requirements: j([
        'University or College certification related to training, or College diploma in Adult Education, or equivalent combination of education and work experience',
      ]),
      license_requirements: j([
        'Valid Class BZ or CZ Ontario Driver’s Licence',
        'Must meet standards to obtain MTO Recognized Signing Authority (classes B or C through F); SA eligibility requires HTA compliance, no suspensions, three consecutive years documented BZ/CZ experience immediately prior, zero demerit points, and satisfactory Criminal Record',
      ]),
      software_requirements: j(['Word', 'Excel', 'PowerPoint', 'Outlook', 'Trapeze']),
      required_skills: j([
        'Highway Traffic Act knowledge',
        'Driver Certification Program (DCP) standards',
        'Bus Operator duties and company rules',
      ]),
      vehicle_required: 1,
      security_check_required: 1,
      benefits: j([]),
    },
    description: `## Overview
Reporting to the Superintendent (Staff Development, Safety Training), evaluates Transit training needs and develops, organizes, and delivers training programs to new and existing staff to ensure compliance with legislation, regulations, policies, and procedures.

## Responsibilities
- Develop, coordinate, deliver and monitor training programs for service quality, cost-effective delivery, and legislative compliance
- Train and evaluate new employees in safe vehicle operation and policy application; provide remedial training as required
- Evaluate employee performance in vehicle operation, customer service, and policy application; provide written reports and recommendations
- Ensure each trainee meets defined company and/or legislated standards
- Develop and update training programs to meet or exceed MTO standards under the Driver Certification Program (DCP)
- Prepare and maintain training course outlines and materials; coordinate training schedules between sections
- Compile and maintain training records required by MTO regulations or corporate policy; design and evaluate employee evaluation forms
- Maintain employee training files in compliance with MTO DCP standards for audit purposes
- Upgrade employees to necessary licence classifications under MTO DCP
- Maintain divisional training database and training matrix (e.g. Trapeze)
- Develop and deliver travel training programs for clients registered for Specialized Transportation services
- Promote teamwork and integration within Transit and with other divisions on cross-functional initiatives
- Apply occupational health and safety procedures; ensure appropriate equipment and procedures are used

## Qualifications
- In-depth knowledge of Bus Operator duties and company rules and regulations
- Familiarity with the Highway Traffic Act and related procedures

## Nice to Have
- Previous Transit training experience
- Knowledge of issues and legislation related to transportation of persons with disabilities and Specialized Transportation operations
- Exceptional client sensitivity skills`,
    notes: [
      'Extracted hours 40/week; security_check from Criminal Record requirement',
      'Filled experience; moved Trapeze into software; cleaned license wording',
      'Removed Compensation section; stripped edu/license/software bullets that duplicate fields',
    ],
  },

  // ── 6. City of Sarnia Part-time Transit Operator ────────────────────────
  {
    id: 'adp_1128',
    label: 'City of Sarnia Part-time Transit Operator',
    fields: {
      duration: null,
      employment_type: 'Part-time',
      listing_type: 'ongoing_recruitment',
      license_requirements: j([
        "Valid Class C driver's licence",
        'Air brake (Z) endorsement',
      ]),
      required_skills: j([
        'Safety-conscious driving with knowledge of Sarnia roads',
        'Written and oral communication',
        'Interpersonal skills',
        'Problem-solving',
        'Teamwork',
        'Service excellence',
      ]),
      security_check_required: 1,
      medical_requirements: j([
        'Must successfully pass medical examinations in accordance with Ministry of Transportation regulations',
      ]),
      vehicle_required: 1,
      benefits: j(['pension', 'health', 'dental', 'EFAP', 'OMERS', '8% pay in lieu of vacation/benefits']),
      education_requirements: j([]),
      experience_requirements: null,
    },
    description: `## Responsibilities
- Provide courteous and timely service and route/bus schedule information to passengers
- Efficiently pick up and drop off passengers at stops or directly to destinations for Care-a-Van services
- Accommodate passengers with disabilities per OHRC and AODA legislation
- Assist passengers with mobility needs and devices on and off the bus following prescribed procedures

## Qualifications
- Safety-conscious driver with knowledge of Sarnia’s roads and attractions
- Written and oral communication, interpersonal, problem-solving, teamwork, and service excellence skills

## Compensation & Benefits
- Pay in lieu of vacation per Employment Standards Act, 2000 (8% in lieu of benefits)
- Access to Employee & Family Assistance Plan (EFAP) and optional enrollment in OMERS pension plan`,
    notes: [
      'Cleared duration=Permanent misuse; set ongoing_recruitment',
      'Moved air brake from skills to license; filled security + medical',
      'Stripped generic why-work-with-us; kept role-specific 8% lieu note with benefits field',
    ],
  },

  // ── 7. Brock Marker-Grader NUSC 1P01 ────────────────────────────────────
  {
    id: 'Marker-Grader-NUSC-1P01-Fall-D2-1_JR-1024938',
    label: 'Brock Marker-Grader NUSC 1P01',
    fields: {
      education_requirements: j([
        'Completed first year in nursing (or equivalent in English) with grade of 80% or higher',
      ]),
      experience_requirements: null,
      required_skills: j([
        'Excellent written and verbal communication',
        'Ability to work effectively with deadlines',
      ]),
      duration: 'Fall term (September to December)',
      benefits: j([]),
      is_student: 1,
    },
    description: `## Overview
Marker-Grader for NUSC 1P01 Nursing Fundamentals 1. Duties per Article 22 of the CUPE 4207-1 collective agreement. Subject to course enrolments and budgetary approval.

## Responsibilities
- Mark assignments, term projects, case reports, midterms, progress exams, and final exams
- Provide written feedback identifying basis for grade (substantive content, written communication, spelling, punctuation, grammar, organization)
- Invigilate midterms and examinations as required
- Enter grades into databases at request of course instructor

## Qualifications
- Excellent written and verbal communication skills
- Proven ability to work effectively with deadlines

## Nice to Have
- Previous Marker/Grader experience`,
    notes: [
      'Filled education from first-year nursing requirement; is_student=1',
      'Removed Compensation tier table (covered by salary_min/max 19–36)',
      'Stripped education bullet from Qualifications; fixed weak required_skills=["Nursing"]',
    ],
  },

  // ── 8. Town of Whitby Receptionist Cashier Arenas ───────────────────────
  {
    id: 'Receptionist-Cashier--Arenas_JR5422',
    label: 'Town of Whitby Receptionist Cashier, Arenas',
    fields: {
      hours: 'Maximum 24 hours per week',
      duration: null,
      availability: 'Flex hours including days, evenings and weekends',
      education_requirements: j(['Secondary school graduation diploma']),
      experience_requirements: j([
        '1 to 2 years experience in a customer service environment',
        'Telephone and cash handling experience',
      ]),
      software_requirements: j(['Microsoft Office', 'Word', 'Excel', 'Outlook']),
      required_skills: j([
        'Customer service',
        'Cash handling',
        'Clerical documentation and record keeping',
      ]),
      security_check_required: 1,
      benefits: j([]),
    },
    description: `## Responsibilities
- Provide customer service in person, by telephone, and online at the arena reception desk
- Process admissions for Town programs using Point of Sale software
- Provide information and process program registrations
- Sell Town of Whitby retail items; provide information on Town services and policies
- Receive and process payments for services and admissions; reconcile daily receipts
- Book and process permits for indoor and outdoor recreation facilities and community centres
- Provide clerical assistance: prepare documentation, file, keep records
- Deal effectively with customer complaints and inquiries

## Qualifications
- Telephone and cash handling experience
- Working knowledge of Microsoft Office Suite (Outlook, Word, Excel)
- Valid police criminal record check to work with vulnerable sector

## Nice to Have
- Working knowledge of facility and recreation software ACTIVE Net`,
    notes: [
      'Moved max 24h/week from duration → hours; set availability flex',
      'security_check_required=1; ACTIVE Net demoted to Nice to Have (source: preferred)',
      'No employer tourism/CARE values boilerplate added',
    ],
  },

  // ── 9. City of Cambridge Crossing Guard ─────────────────────────────────
  {
    id: '4555',
    label: 'City of Cambridge Crossing Guard',
    fields: {
      department: 'Crossing Guard Program',
      hours: 'Scheduled to school hours of operation; spare guards on-call',
      availability: 'School season; spare positions on-call for temporary/replacement shifts',
      duration: 'September 8, 2026 to June 29, 2027',
      posted_at: '2026-06-22',
      vehicle_required: 1,
      security_check_required: 1,
      medical_requirements: j([
        'Pre-employment physical assessment confirming ability to perform essential duties',
      ]),
      certification_requirements: j([
        'Worker Health and Safety Awareness Training certificate from the Ministry of Labour (may be obtained post-offer)',
      ]),
      education_requirements: j([]),
      experience_requirements: null,
      required_skills: j([]),
      license_requirements: j([]),
      benefits: j([]),
      employment_type: 'Part-time',
      listing_type: 'ongoing_recruitment',
    },
    description: `## Overview
Crossing Guards for the school year (September 8, 2026 to June 29, 2027). Spare Crossing Guard positions also available on-call throughout Cambridge; access to reliable transportation required (mileage paid for spare assignments). On-the-job training provided.

## Responsibilities
- Assist children to cross roads safely at designated school crossing locations and ensure traffic remains stopped until all pedestrians have safely crossed
- Work in all forms of weather, including extremes of heat and cold
- Work under all types of road conditions with exposure to traffic noise and vehicle exhaust
- Meet the physical demands of the role

## Available Locations
- Avenue Road / Gail
- Avenue Road / Hespeler
- Cooper Street / Adler Drive
- Elgin Street / Northview Heights
- Faith Street / Wesley Blvd
- Renwick Avenue / Hillcrest Public School
- Saginaw Pkwy / Stonecarin Drive
- Saginaw Pkwy / Burnette Avenue
- Westminster Drive / William Street
- Saginaw Pkwy / Light Drive

## Conditions of Employment
- Pre-employment physical assessment
- Current valid Police Vulnerable Sector Check prior to commencement
- Worker Health and Safety Awareness Training certificate from the Ministry of Labour (may be obtained post-offer)`,
    notes: [
      'Filled posted_at, hours/availability, security, medical, certification',
      'Removed salary/hours prose (already structured); added missing Faith St location from raw',
      'No city vision/mission boilerplate',
    ],
  },
];

async function main() {
  const db = await initDb();

  console.log(APPLY ? 'APPLY mode' : 'DRY-RUN mode (pass --apply to write)');
  console.log(`Patches: ${patches.length}\n`);

  for (const patch of patches) {
    const existing = await db.execute({
      sql: `SELECT d.job_title, d.description, d.hours, d.duration, d.salary_min, d.salary_max,
                   d.education_requirements, d.experience_requirements, d.security_check_required,
                   length(d.description) as dlen
            FROM job_details d WHERE d.id = ?`,
      args: [patch.id],
    });
    if (existing.rows.length === 0) {
      console.log(`SKIP missing id: ${patch.id}`);
      continue;
    }
    const before = existing.rows[0];
    console.log(`── ${patch.label}`);
    console.log(`   id: ${patch.id}`);
    console.log(`   before dlen=${before.dlen} hours=${before.hours} duration=${before.duration}`);
    console.log(`   after  dlen=${patch.description.length}`);
    for (const n of patch.notes) console.log(`   • ${n}`);

    if (!APPLY) continue;

    const cols = Object.keys(patch.fields);
    const sets = cols.map(c => `${c} = ?`).join(', ');
    const args = [...cols.map(c => patch.fields[c]), patch.description, patch.id];
    await db.execute({
      sql: `UPDATE job_details SET ${sets}, description = ? WHERE id = ?`,
      args,
    });
    console.log('   ✓ updated');
  }

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write to Turso.');
  } else {
    console.log('\nAll patches applied.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
