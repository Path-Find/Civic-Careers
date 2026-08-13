/** QUALITY.md fixes for the second random sample selected 2026-08-13. */
import { initDb } from './db';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const APPLY = process.argv.includes('--apply');
const j = (values: string[]) => JSON.stringify(values);
type Patch = { id: string; label: string; fields: Record<string, string | number | null>; description: string };

const patches: Patch[] = [
  {
    id: 'psft_44204', label: 'Western University — Technical /Research Support I',
    fields: {
      job_title: 'Technical /Research Support I', department: 'School of Communication Sciences and Disorders', location: 'London, ON',
      salary_range: '$17.60 - $18.00 (hourly)', salary_min: 17.60, salary_max: 18, salary_period: 'hourly', employment_type: 'Part-time', duration: '2026-09-01 to 2027-04-30', hours: 'Up to 5 hours per week', availability: 'Evenings',
      education_requirements: j(['Post-secondary coursework in child or language development']), experience_requirements: j(['At least 1 year of experience working with children and collaborating in a team environment']), required_skills: j(['Reading intervention support', 'Written-language instruction', 'Data collection', 'Attention to detail', 'Organization and planning', 'English communication']), security_check_required: 1, is_unionized: 0, union_name: '',
    },
    description: `## Overview
Supports a research study on reading interventions and community-based literacy programs for school-age children.

## Responsibilities
- Conduct intervention sessions with school-age children according to the study protocol
- Complete data collection as directed by investigators and research-team leads
- Document technical information accurately and work collaboratively with the research team`,
  },
  {
    id: '605137117', label: 'Shared Health Manitoba — Licensed Practical Nurse, Cornish 6',
    fields: {
      job_title: 'Licensed Practical Nurse (LPN) - Cornish 6', department: 'Cornish 6', location: 'Winnipeg, MB', salary_range: '$34.573 - $43.534 (hourly)', salary_min: 34.573, salary_max: 43.534, salary_period: 'hourly', work_model: 'On-site', employment_type: 'Part-time', duration: '2026-09-11 to 2028-04-05', hours: '7.75 hours', availability: 'Days; Evenings; Weekends',
      education_requirements: j(['Approved Licensed Practical Nursing education program']), experience_requirements: j(['Recent related experience in the applicable clinical area may be required or preferred']), license_requirements: j(['Active registration with the College of Licensed Practical Nurses of Manitoba']), certification_requirements: j(['Cardiopulmonary Resuscitation (CPR)', 'IV therapy and IV medication administration']), required_skills: j(['Professional practical nursing', 'Patient-care coordination', 'Delegation', 'Critical thinking and problem-solving', 'Prioritization', 'Independent and team-based practice', 'Communication']), security_check_required: 1, is_unionized: 1, union_name: 'MNU',
    },
    description: `## Overview
Provides professional practical nursing services to patients in a clinical-care setting.

## Responsibilities
- Provide nursing services and prescribed medical treatments
- Collaborate with the health-care team and participate in patient-care coordination and discharge
- Apply professional standards, policies, protocols, and legislation in daily practice
- Prioritize care, delegate appropriately, and monitor outcomes
- Maintain concentration, adapt to changing situations, and work effectively under pressure`,
  },
  {
    id: '603676917', label: 'Canada Post — Rural and Suburban Mail Carrier',
    fields: {
      job_title: 'Rural and Suburban Mail Carrier, On-call Relief', location: 'Wallaceburg, ON', employment_type: 'Occasional', duration: 'Term', availability: 'On-call', language_requirements: j(['English']), license_requirements: j([]), vehicle_required: 1, required_skills: j(['Mail sorting and delivery', 'Route and local-infrastructure knowledge', 'Safe driving', 'Customer service']), medical_requirements: j(['Ability to lift and carry items up to 50 lb']),
    },
    description: `## Overview
Delivers mail and Canada Post products to customers in assigned communities.

## Responsibilities
- Sort, collect, and deliver mail safely and on time
- Learn local roads, customers, and delivery receptacles
- Secure mail while it is in transit and operate a motor vehicle in varied weather and traffic conditions
- Process postal products and services and maintain visible identification while delivering
- Lift and carry mail items safely`,
  },
  {
    id: 'Associate-Director--Health-Services_2026-01612-1', label: 'University of Waterloo — Associate Director, Health Services',
    fields: {
      job_title: 'Associate Director, Health Services', department: 'Campus Wellness', location: 'Waterloo, ON', salary_range: '$123,660.99 - $154,576.24 (yearly)', salary_min: 123660.99, salary_max: 154576.24, salary_period: 'yearly', employment_type: 'Full-time', duration: 'Permanent',
      education_requirements: j(["Master's degree in a related field or equivalent"]), experience_requirements: j(['At least 5 to 8 years of progressive management experience in a health-care setting']), license_requirements: j(['Registered Nurse Practitioner or Physician']), required_skills: j(['Clinical leadership', 'Health-services operations', 'Crisis response and intervention', 'Human-resources management', 'Strategic planning', 'Interdisciplinary collaboration']),
    },
    description: `## Overview
Provides senior clinical and operational leadership for Campus Wellness Health Services.

## Responsibilities
- Support strategic and operational management of Health Services
- Lead clinical-service planning, evaluation, and quality improvement
- Coordinate crisis response, intake, triage, and intervention for critical health-care situations
- Manage health-services leaders and support recruitment, performance, training, and staff development
- Collaborate with medical leadership on clinical directives, guidelines, and day-to-day service operations
- Advise university partners on health-care, accommodation, and human-research matters`,
  },
  {
    id: 'adp_1153', label: 'City of Sarnia — Geospatial Solutions Analyst',
    fields: {
      job_title: 'Geospatial Solutions Analyst', department: 'Planning and Development Services', location: 'Sarnia, ON', salary_range: '$59,677.80 - $91,819.00 (yearly)', salary_min: 59677.80, salary_max: 91819, salary_period: 'yearly', work_model: 'On-site', employment_type: 'Full-time', duration: 'Permanent',
      education_requirements: j(['Three-year degree or diploma in GIS, geomatics, or a related field']), experience_requirements: j(['Two to three years of related work experience']), license_requirements: j([]), certification_requirements: j(['GISP designation is an asset']), required_skills: j(['GIS and geospatial technology', 'ArcGIS Enterprise', 'Cityworks', 'Business-process support', 'User training and documentation', 'Stakeholder communication']), vehicle_required: 1, is_unionized: 1, union_name: 'CUPE 3690',
    },
    description: `## Overview
Supports business-process improvement and customer service through geospatial technologies and related integrations.

## Responsibilities
- Implement, maintain, and administer GIS, Cityworks, and related technology based on user needs
- Support users across internal departments, external agencies, and the public
- Identify training needs and create documentation and learning materials
- Translate business needs into technical solutions and communicate complex information clearly
- Support the City’s geospatial platforms and related operational initiatives`,
  },
  {
    id: '604371117', label: 'Shared Health Manitoba — General Duty Laboratory Technologist',
    fields: {
      job_title: 'General Duty Laboratory Technologist', department: 'Laboratory Services', location: 'Steinbach, MB', salary_range: '$40.367 - $50.642 (hourly)', salary_min: 40.367, salary_max: 50.642, salary_period: 'hourly', employment_type: 'Part-time', hours: '7.75 hours', availability: 'Days; Nights; Weekends; Standby; On-call',
      education_requirements: j(['Approved Medical Laboratory Technology program']), license_requirements: j(['Registration or eligibility for registration with the College of Medical Laboratory Technologists of Manitoba']), certification_requirements: j(['Canadian Society for Medical Laboratory Science membership is an asset']), required_skills: j(['Clinical laboratory analysis and reporting', 'Laboratory quality assurance', 'Attention to detail', 'Analytical problem-solving', 'Confidentiality', 'Independent and team-based work']), language_requirements: j(['English']), security_check_required: 1,
    },
    description: `## Overview
Performs clinical laboratory analysis and reporting on patient samples and supports laboratory quality and safety.

## Responsibilities
- Analyze and report patient samples according to established protocols
- Assist with laboratory projects, standard operating procedures, and chemical inventories
- Maintain a safe laboratory environment and support quality-assurance and accreditation standards
- Rotate through workstations and participate in standby and callback coverage`,
  },
  {
    id: '603206417', label: 'Shared Health Manitoba — Registered Nurse - Emergency',
    fields: {
      job_title: 'Registered Nurse - Emergency', department: 'Emergency Department', location: 'Winkler, MB', salary_range: 'As per MNU Collective Agreement', employment_type: 'Part-time', duration: 'Permanent', hours: '11.625 hours', availability: 'Days; Nights; Weekends', work_model: 'On-site', education_requirements: j(['Approved Registered Nursing or Registered Psychiatric Nursing program']), license_requirements: j(['Active registration with the College of Registered Nurses of Manitoba or College of Registered Psychiatric Nurses of Manitoba']), certification_requirements: j(['Basic Life Support (BLS)', 'Advanced Cardiac Life Support (ACLS)', 'Canadian Triage and Acuity Scale (CTAS)', 'Trauma Nursing Care Course (TNCC)']), required_skills: j(['Emergency nursing', 'Patient-care prioritization', 'Delegation', 'Critical thinking and problem-solving', 'Interdisciplinary collaboration']), vehicle_required: 1, security_check_required: 1, is_unionized: 1, union_name: 'MNU',
    },
    description: `## Overview
Provides registered nursing or registered psychiatric nursing care in an emergency-department setting.

## Responsibilities
- Apply the nursing process and provide care within the full scope of practice
- Administer treatments and coordinate care with patients, families, and the health-care team
- Prioritize care, delegate appropriately, and respond to changing clinical situations
- Maintain professional competency and follow nursing standards, policies, protocols, and legislation`,
  },
  {
    id: '605057417', label: 'Shared Health Manitoba — Dietary Aide',
    fields: {
      job_title: 'Dietary Aide', department: 'Nutrition and Food Services', location: 'Steinbach, MB', salary_range: 'As per CUPE Collective Agreement', employment_type: 'Part-time', duration: '2026-09-08 to 2027-05-21', hours: 'Up to 7.75 hours', availability: 'Days; Evenings; Weekends', work_model: 'On-site', education_requirements: j(['Minimum Grade 10 education']), experience_requirements: j(['Six months of experience in food handling or a health-care food-services environment']), certification_requirements: j(['Dietary Aide certificate', 'Food Handler Training Certificate level 1 or equivalent']), required_skills: j(['Therapeutic and texture-modified diets', 'Sanitary food handling', 'Cash management', 'Meal preparation and service', 'Confidentiality']), software_requirements: j(['Microsoft Office', 'Outlook']), vehicle_required: 1, license_requirements: j([]), security_check_required: 1, is_unionized: 1, union_name: 'CUPE',
    },
    description: `## Overview
Supports safe preparation, service, and distribution of meals for patients, staff, and visitors.

## Responsibilities
- Prepare, serve, and distribute nutritious meals according to established standards
- Perform cashier duties and follow sanitation, safety, and food-handling procedures
- Support therapeutic and texture-modified meal requirements
- Maintain food-service areas and follow departmental policies and government regulations
- Exercise judgment when setting priorities and responding to operational matters`,
  },
  {
    id: 'psft_315096', label: 'City of Calgary — Inspector',
    fields: {
      job_title: 'Inspector', department: 'Emergency Management and Community Safety', location: 'Calgary, AB', salary_range: '$115,627 - $144,534 (yearly)', salary_min: 115627, salary_max: 144534, salary_period: 'yearly', employment_type: 'Full-time', duration: 'Permanent', hours: '35 hours per week', availability: 'Weekdays', education_requirements: j(['Two-year diploma or degree in criminal justice, business, public safety, social work, or a related field']), experience_requirements: j(['At least 5 years of related experience with a degree or 8 years with a diploma, including progressive leadership']), required_skills: j(['Public-safety operations', 'Leadership and staff management', 'Recruitment and performance management', 'Regulatory compliance', 'Emergency preparedness', 'Interagency collaboration', 'Strategic decision-making']), license_requirements: j([]), vehicle_required: 1, security_check_required: 1, medical_requirements: j(['Pre-employment drug test']), is_unionized: 0, union_name: '',
    },
    description: `## Overview
Leads operational planning and public-safety programs overseeing Peace Officers, Sergeants, and administrative staff.

## Responsibilities
- Provide leadership and guidance to public-safety staff and partner units
- Conduct recruitment, onboarding, performance development, and staff management
- Plan staffing models and allocate resources to support operational efficiency
- Lead complaints, investigations, safety audits, and emergency-preparedness planning
- Address enforcement appeals and support compliance with bylaws, legislation, and justice standards
- Build partnerships with departments, law-enforcement agencies, community organizations, and government agencies
- Manage financial, human, and material resources`,
  },
  {
    id: '604735517', label: 'Canada Post — Post Office Assistant',
    fields: {
      job_title: 'Post Office Assistant', department: 'Retail', location: 'Bonne Bay, NL', salary_range: '$20.54 (hourly)', salary_min: 20.54, salary_max: 20.54, salary_period: 'hourly', employment_type: 'Occasional', duration: 'Term', availability: 'On-call', education_requirements: j(['High school or provincial equivalency, or business-administration experience']), experience_requirements: j(['Training or experience interacting with the public in a retail or service environment, including sales and cash transactions']), required_skills: j(['Postal product sales', 'Customer service', 'Mail sorting and processing', 'Cash transactions', 'Post-office accounting']), language_requirements: j(['English']), medical_requirements: j(['Ability to lift mail containers up to 50 lb and stand for extended periods']),
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
];

async function main() {
  const db = await initDb();
  console.log(APPLY ? 'APPLY mode' : 'DRY-RUN mode');
  for (const patch of patches) {
    const before = await db.execute({ sql: 'SELECT id, job_title, length(description) AS description_length FROM job_details WHERE id = ?', args: [patch.id] });
    if (!before.rows.length) throw new Error(`Missing job: ${patch.id}`);
    console.log(`${patch.id} ${patch.label}: ${before.rows[0]?.job_title} -> ${patch.fields.job_title}`);
    if (!APPLY) continue;
    const columns = Object.keys(patch.fields);
    await db.execute({ sql: `UPDATE job_details SET ${columns.map(column => `${column} = ?`).join(', ')}, description = ? WHERE id = ?`, args: [...columns.map(column => patch.fields[column]), patch.description, patch.id] });
    await db.execute({ sql: 'UPDATE jobs SET verified_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1', args: [patch.id] });
  }
  if (APPLY) console.log(`Applied and verified ${patches.length} source-backed corrections.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
