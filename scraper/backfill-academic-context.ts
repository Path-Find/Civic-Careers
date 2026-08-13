/**
 * Extract academic appointment context into the dedicated fields without
 * re-running the full parser or overwriting existing job details.
 *
 * Usage:
 *   npx tsx backfill-academic-context.ts --apply
 */
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { initDb } from './db';
import { normalizeAcademicRoleType } from './validate';
import { splitHoursAndAvailability } from './hours-availability';
import { normalizeAcademicAppointmentType, normalizeAcademicCourse, normalizeAcademicOfficeHours, normalizeAcademicSupervisor, normalizeAcademicWorkload } from './academic-context';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const DETERMINISTIC_ONLY = process.argv.includes('--deterministic-only');
const CONCURRENCY = Number(process.env.ACADEMIC_BACKFILL_CONCURRENCY || 2);
const BATCH_DELAY_MS = Number(process.env.ACADEMIC_BACKFILL_DELAY_MS || 2000);
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v4-flash';
const academicSourcePattern = /\b(?:university|college|institute|polytechnic|UBC)\b|school of/i;
const academicRolePattern = /\b(professor|lecturer|instructor|teaching assistant|instructional assistant|research assistant|research associate|academic assistant|graduate assistant|post[- ]?doctoral|post[- ]?doc|postdoc|sessional|faculty member|course coordinator|course staff|course assistant|teaching fellow|research fellow|tutor|marker|demonstrator|lab demonstrator)\b/i;
const facultyAppointmentPattern = /^(?:(?:bcgeu|flexible learning|contract|regular probationary|tenure[- ]track)\s+)?faculty(?:\s*[-,(]|$)|^tenure[- ]track faculty positions?\b/i;
const researchAssociatePattern = /\bresearch associate\b/i;
const postdoctoralMentionPattern = /\bpost[- ]?doctoral\b|\bpost[- ]?doc\b|\bpostdoc\b/i;
const postdoctoralRolePattern = /^(?:post[- ]?doctoral|post[- ]?doc|postdoc|phd\s+or\s+post[- ]?doc)\b/i;
const highConfidenceAcademicRolePattern = /\b(professor|lecturer|teaching assistant|research assistant|academic assistant|graduate assistant|faculty member|course coordinator|course staff|course assistant|teaching fellow|research fellow)\b/i;
const recreationalInstructorPattern = /\b(?:swim(?:ming)?|lifeguard|fitness|recreation|aquatic|sports?|coach|camp|skate|dance|yoga)\b.*\binstructor\b|\binstructor\b.*\b(?:swim(?:ming)?|lifeguard|fitness|recreation|aquatic|sports?|coach|camp|skate|dance|yoga)\b/i;

function isAcademicCandidate(candidate: Pick<Candidate, 'source' | 'job_title'>): boolean {
  const facultyAppointment = facultyAppointmentPattern.test(candidate.job_title);
  if (!academicRolePattern.test(candidate.job_title) && !facultyAppointment) return false;
  if (recreationalInstructorPattern.test(candidate.job_title)) return false;
  if (postdoctoralMentionPattern.test(candidate.job_title)
    && !postdoctoralRolePattern.test(candidate.job_title)
    && !highConfidenceAcademicRolePattern.test(candidate.job_title)
    && !researchAssociatePattern.test(candidate.job_title)) return false;
  const educationalSource = academicSourcePattern.test(candidate.source);
  if (facultyAppointment) return educationalSource;
  if (postdoctoralRolePattern.test(candidate.job_title) || highConfidenceAcademicRolePattern.test(candidate.job_title)) return true;
  if (!educationalSource) return false;
  // Sessional is also used for ordinary campus retail and support jobs.
  if (/\bsessional\b/i.test(candidate.job_title)
    && !/professor|lecturer|instructor|faculty|teaching|course|tutor|marker|demonstrator|academic/i.test(candidate.job_title)) return false;
  return true;
}

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

type Candidate = {
  id: string;
  source: string;
  job_title: string;
  description: string;
  raw_text: string;
  hours: string;
  availability: string;
};

type AcademicContext = {
  academic_role_type: unknown;
  hours: unknown;
  availability: unknown;
  academic_course: unknown;
  academic_workload: unknown;
  academic_office_hours: unknown;
  academic_supervisor: unknown;
  academic_appointment_type: unknown;
};

function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return /^(?:n\/?a|none|null|not applicable|not specified|unknown)$/i.test(cleaned) ? '' : cleaned;
}

function sourceText(candidate: Candidate): string {
  const raw = candidate.raw_text.trim();
  return raw || candidate.description.trim();
}

function cleanAcademicHours(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return '';
  const schedule = splitHoursAndAvailability(raw, '');
  if (/^0(?:\.0+)?\s+hours?/i.test(schedule.hours)) return '';
  if (schedule.hours) return schedule.hours;
  const fte = raw.match(/\b(?!0(?:\.0+)?\s*FTE\b)\d+(?:\.\d+)?\s*FTE\b/i)?.[0];
  return fte ? fte.replace(/\s+/g, ' ') : '';
}

function cleanAcademicAvailability(value: unknown): string {
  const raw = cleanText(value);
  if (!raw || /scheduled weekly hours|\bFTE\b/i.test(raw)) return '';
  const normalized = splitHoursAndAvailability('', raw).availability;
  return /scheduled weekly hours|\bFTE\b|per course|hours?/i.test(normalized) ? '' : normalized;
}

function extractAcademicCourse(title: string): string {
  return title.match(/\b(?!Fall\b|Winter\b|Spring\b|Summer\b)[A-Z]{2,8}(?:[- ]?)\d{3,4}[A-Z]?\b(?:\s*\([^)]{1,24}\))?/i)?.[0] ?? '';
}

function normalizeContext(context: AcademicContext): AcademicContext {
  return {
    academic_role_type: normalizeAcademicRoleType(context.academic_role_type),
    hours: cleanAcademicHours(context.hours),
    availability: cleanAcademicAvailability(context.availability),
    academic_course: normalizeAcademicCourse(context.academic_course),
    academic_workload: normalizeAcademicWorkload(context.academic_workload),
    academic_office_hours: normalizeAcademicOfficeHours(context.academic_office_hours),
    academic_supervisor: normalizeAcademicSupervisor(context.academic_supervisor),
    academic_appointment_type: normalizeAcademicAppointmentType(context.academic_appointment_type),
  };
}

function inferAcademicContext(candidate: Candidate): AcademicContext {
  const title = candidate.job_title;
  const text = `${title}\n${sourceText(candidate)}`;
  let academic_role_type: string | null = null;
  if (/\bteaching assistant\b|\bacademic assistant\b|\bgraduate assistant\b|\binstructional assistant\b|\bcourse assistant\b|\bmarker(?:[- ]grader)?\b|\btutor\b|\bdemonstrator\b/i.test(title)) academic_role_type = 'teaching_assistant';
  else if (/\bresearch assistant\b|\bresearch fellow\b/i.test(title)) academic_role_type = 'research_assistant';
  else if (researchAssociatePattern.test(title)) academic_role_type = 'research_associate';
  else if (postdoctoralRolePattern.test(title)) academic_role_type = 'postdoctoral';
  else if (facultyAppointmentPattern.test(title) || /\bprofessor\b|\blecturer\b|\bfaculty member\b|\bsessional\s*[-–—]?\s*faculty\b/i.test(title) || /\brank of (?:lecturer|assistant professor)\b/i.test(text)) academic_role_type = 'faculty';
  else if (/\b(course coordinator|course staff)\b/i.test(title)) academic_role_type = 'course_staff';
  else if (/\binstructor\b|\bteaching fellow\b/i.test(title)) academic_role_type = 'academic_instructor';

  const academic_course = extractAcademicCourse(title);
  const workload = text.match(/\b(?:\d+(?:\.\d+)?\s*(?:hours?|hrs?)\s*(?:per\s+(?:week|course|term)|\/\s*(?:week|course|term))|\d+(?:\.\d+)?\s*FTE)\b[^.\n]{0,80}/i)?.[0] ?? '';
  const officeHours = text.match(/\b(?:office|consultation|student[- ]contact)\s+hours?\b[^.\n]{0,80}/i)?.[0] ?? '';
  const appointment = text.match(/\b(?:tenure[- ]track|limited[- ]term|sessional)\b/i)?.[0] ?? '';

  return normalizeContext({
    academic_role_type,
    hours: candidate.hours,
    availability: candidate.availability,
    academic_course,
    academic_workload: workload,
    academic_office_hours: officeHours,
    academic_supervisor: '',
    academic_appointment_type: appointment,
  });
}

function academicPrompt(candidate: Candidate): string {
  return `Extract only academic appointment context from this public-sector job posting. Return valid JSON and do not include any explanation.

JSON schema:
{
  "academic_role_type": "faculty" | "teaching_assistant" | "research_assistant" | "research_associate" | "postdoctoral" | "academic_instructor" | "course_staff" | null,
  "hours": "Required or scheduled work hours / FTE, such as '35 hours per week', '65 total hours', or '0.5 FTE', or empty string",
  "availability": "Required days, shifts, evenings, weekends, or other availability conditions, or empty string",
  "academic_course": "Course code and/or course title, or empty string",
  "academic_workload": "Academic workload or appointment amount, such as '65 total hours', '3 hours per week', or '0.5 FTE', or empty string",
  "academic_office_hours": "Explicit office, consultation, lab, or student-contact hours, or empty string",
  "academic_supervisor": "Explicit named supervisor, principal investigator, or supervising person/department, or empty string",
  "academic_appointment_type": "Explicit appointment type such as 'Tenure-track', 'Limited-term', or 'Sessional', or empty string"
}

Rules:
- Use null for academic_role_type when the posting is not clearly an academic appointment or course-based academic role.
- A university or college employer alone is not enough.
- Do not classify municipal recreation instructors, trainers, program instructors, or university administrative/support roles as academic.
- Use faculty for professor, lecturer, or faculty appointments; teaching_assistant for teaching/academic assistants, tutors, markers, lab demonstrators, or course assistants; research_assistant for research assistants; research_associate for research associate appointments; postdoctoral for postdoctoral roles; academic_instructor for instructors teaching at a university or college; and course_staff for course coordinators or comparable course-specific staff.
- Extract only facts explicitly stated in the posting. Do not infer a course, supervisor, hours, office hours, workload, or appointment type from the employer or title alone.
- Keep values short and source-backed. Do not put ordinary job metadata such as salary, location, closing date, or generic employment type in these fields.
- academic_workload may preserve total assignment hours or appointment percentage; hours is the general work-hours field. They may contain the same fact when that is how the source states it.

Employer: ${candidate.source}
Trusted title: ${candidate.job_title}

Posting text:
${sourceText(candidate)}`;
}

async function parseAcademicContext(candidate: Candidate): Promise<AcademicContext | null> {
  const completion = await client.chat.completions.create({
    messages: [{ role: 'user', content: academicPrompt(candidate) }],
    model: AI_MODEL,
    response_format: { type: 'json_object' },
    timeout: 60000,
  });
  const content = completion.choices[0].message.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as AcademicContext;
  const schedule = splitHoursAndAvailability(cleanText(parsed.hours), cleanText(parsed.availability));
  return normalizeContext({
    academic_role_type: normalizeAcademicRoleType(parsed.academic_role_type),
    hours: schedule.hours,
    availability: schedule.availability,
    academic_course: cleanText(parsed.academic_course),
    academic_workload: cleanText(parsed.academic_workload),
    academic_office_hours: cleanText(parsed.academic_office_hours),
    academic_supervisor: cleanText(parsed.academic_supervisor),
    academic_appointment_type: cleanText(parsed.academic_appointment_type),
  });
}

async function withRetry(candidate: Candidate): Promise<AcademicContext | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await parseAcademicContext(candidate);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

type DbClient = {
  execute: (statement: any, args?: any) => Promise<any>;
};

async function ensureColumns(db: DbClient) {
  for (const column of [
    'academic_role_type', 'academic_course', 'academic_workload',
    'academic_office_hours', 'academic_supervisor', 'academic_appointment_type',
  ]) {
    try {
      await db.execute(`ALTER TABLE job_details ADD COLUMN ${column} TEXT`);
    } catch (error) {
      if (!/duplicate column|already exists/i.test(String(error))) throw error;
    }
  }
}

async function updateAcademicContext(db: DbClient, id: string, context: AcademicContext) {
  const normalized = normalizeContext(context);
  await db.execute({
    sql: `UPDATE job_details SET
      hours = COALESCE(NULLIF(?, ''), hours),
      availability = COALESCE(NULLIF(?, ''), availability),
      academic_role_type = COALESCE(NULLIF(?, ''), academic_role_type),
      academic_course = COALESCE(NULLIF(?, ''), academic_course),
      academic_workload = COALESCE(NULLIF(?, ''), academic_workload),
      academic_office_hours = COALESCE(NULLIF(?, ''), academic_office_hours),
      academic_supervisor = COALESCE(NULLIF(?, ''), academic_supervisor),
      academic_appointment_type = COALESCE(NULLIF(?, ''), academic_appointment_type)
      WHERE id = ?`,
    args: [
      normalized.hours, normalized.availability, normalized.academic_role_type ?? '',
      normalized.academic_course, normalized.academic_workload,
      normalized.academic_office_hours, normalized.academic_supervisor,
      normalized.academic_appointment_type, id,
    ],
  });
}

async function sanitizeStoredContext(db: DbClient) {
  const result = await db.execute(`
    SELECT id, job_title, academic_role_type, academic_course, hours, availability, academic_workload, academic_office_hours, academic_appointment_type
    FROM job_details
    WHERE academic_role_type IS NOT NULL
       OR academic_course IS NOT NULL
       OR academic_workload IS NOT NULL
       OR academic_office_hours IS NOT NULL
       OR academic_supervisor IS NOT NULL
       OR academic_appointment_type IS NOT NULL
  `);
  let cleaned = 0;
  for (const row of result.rows) {
    const hours = cleanAcademicHours(row.hours);
    const availability = cleanAcademicAvailability(row.availability);
    const academic_workload = normalizeAcademicWorkload(row.academic_workload);
    const academic_office_hours = normalizeAcademicOfficeHours(row.academic_office_hours);
    const academic_appointment_type = normalizeAcademicAppointmentType(row.academic_appointment_type);
    const title = String(row.job_title ?? '');
    const academic_role_type = recreationalInstructorPattern.test(title)
      ? null
      : postdoctoralRolePattern.test(title)
      ? 'postdoctoral'
      : researchAssociatePattern.test(title) && !/\bresearch assistant\b/i.test(title)
        ? 'research_associate'
      : facultyAppointmentPattern.test(title)
        ? 'faculty'
      : row.academic_role_type === 'postdoctoral'
        && postdoctoralMentionPattern.test(title)
        && !highConfidenceAcademicRolePattern.test(title)
      ? null
      : /^assistant instructor\b/i.test(title)
      && row.academic_role_type === 'teaching_assistant'
      ? 'academic_instructor'
      : row.academic_role_type;
    const storedCourse = normalizeAcademicCourse(row.academic_course);
    const academic_course = /^(?:Fall|Winter|Spring|Summer)\s+\d{4}$/i.test(storedCourse)
      ? extractAcademicCourse(String(row.job_title ?? ''))
      : storedCourse;
    if (academic_role_type === row.academic_role_type
      && academic_course === storedCourse
      && hours === cleanText(row.hours)
      && availability === cleanText(row.availability)
      && academic_workload === normalizeAcademicWorkload(row.academic_workload)
      && academic_office_hours === normalizeAcademicOfficeHours(row.academic_office_hours)
      && academic_appointment_type === normalizeAcademicAppointmentType(row.academic_appointment_type)) continue;
    await db.execute({
      sql: `UPDATE job_details SET academic_role_type = ?, academic_course = ?, hours = ?, availability = ?, academic_workload = ?, academic_office_hours = ?, academic_appointment_type = ? WHERE id = ?`,
      args: [academic_role_type || null, academic_course || null, hours || null, availability || null, academic_workload || null, academic_office_hours || null, academic_appointment_type || null, String(row.id)],
    });
    cleaned += 1;
  }
  if (cleaned) console.log(`[academic-context] Sanitized existing context rows: ${cleaned}`);
}

async function main() {
  const db = await initDb();
  await ensureColumns(db);
  await sanitizeStoredContext(db);

  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, COALESCE(jd.description, '') AS description,
           COALESCE(raw.raw_text, '') AS raw_text,
           COALESCE(jd.hours, '') AS hours, COALESCE(jd.availability, '') AS availability
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    WHERE j.is_active = 1
      AND COALESCE(jd.is_inventory, 0) = 0
      AND (jd.closing_date IS NULL OR jd.closing_date = '' OR substr(jd.closing_date, 1, 10) >= CURRENT_DATE::text)
      AND NULLIF(trim(COALESCE(jd.academic_role_type, '')), '') IS NULL
    ORDER BY j.source, j.id
  `);

  const candidates = result.rows
    .map(row => ({
      id: String(row.id ?? ''),
      source: String(row.source ?? ''),
      job_title: String(row.job_title ?? ''),
      description: String(row.description ?? ''),
      raw_text: String(row.raw_text ?? ''),
      hours: String(row.hours ?? ''),
      availability: String(row.availability ?? ''),
    }))
    .filter(isAcademicCandidate);

  console.log(`[academic-context] Active non-inventory postings without a stored academic role: ${result.rows.length}`);
  console.log(`[academic-context] Academic candidates: ${candidates.length}${APPLY ? (DETERMINISTIC_ONLY ? ' (applying deterministic fallback)' : ' (applying AI)') : ' (dry run)'}`);
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write fields.');
    return;
  }

  let completed = 0;
  let updated = 0;
  let classified = 0;
  const failures: Array<{ id: string; title: string; error: string }> = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async candidate => {
      try {
        const context = DETERMINISTIC_ONLY ? inferAcademicContext(candidate) : await withRetry(candidate);
        return { candidate, context };
      } catch (error) {
        return { candidate, error: String(error instanceof Error ? error.message : error) };
      }
    }));

    for (const item of results) {
      completed += 1;
      if ('error' in item) {
        failures.push({ id: item.candidate.id, title: item.candidate.job_title, error: item.error ?? 'Unknown error' });
        continue;
      }
      if (!item.context) continue;
      if (item.context.academic_role_type) classified += 1;
      const hasContext = Object.values(item.context).some(value => value != null && String(value).trim() !== '');
      if (hasContext) {
        await updateAcademicContext(db, item.candidate.id, item.context);
        updated += 1;
      }
    }
    const firstFailure = failures[0]?.error ? `; first failure: ${failures[0].error.slice(0, 140)}` : '';
    console.log(`[academic-context] ${completed}/${candidates.length} processed; ${updated} updated; ${failures.length} failed${firstFailure}`);
    if (!DETERMINISTIC_ONLY && BATCH_DELAY_MS > 0 && completed < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[academic-context] Classified academic roles: ${classified}`);
  console.log(`[academic-context] Updated rows: ${updated}`);
  if (failures.length) {
    console.error(`[academic-context] Failures: ${JSON.stringify(failures)}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
