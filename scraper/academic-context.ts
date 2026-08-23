const PLACEHOLDER = /^(?:n\/?a|none|null|not applicable|not specified|unknown)$/i;
export const ACADEMIC_SCHEDULE_MAX_LENGTH = 120;

const ACADEMIC_TITLE_PATTERN = /\b(?:professor|lecturer|instructor|teaching assistant|instructional assistant|research assistant|research associate|academic assistant|graduate assistant|post[- ]?doctoral|post[- ]?doc|postdoc|sessional faculty|course coordinator|course staff|course assistant|teaching fellow|research fellow|tutor|marker|demonstrator)\b/i;
const RECREATIONAL_INSTRUCTOR_PATTERN = /\b(?:swim(?:ming)?|lifeguard|fitness|recreation|aquatic|sports?|coach|camp|skate|dance|yoga)\b.*\binstructor\b|\binstructor\b.*\b(?:swim(?:ming)?|lifeguard|fitness|recreation|aquatic|sports?|coach|camp|skate|dance|yoga)\b/i;
const ACADEMIC_ROLE_TYPES = new Set([
  'faculty', 'teaching_assistant', 'research_assistant', 'research_associate',
  'postdoctoral', 'academic_instructor', 'course_staff',
]);

/** Academic fields are only meaningful for a clearly academic appointment. */
export function isAcademicJob(source: string | null | undefined, title: string | null | undefined, roleType: unknown): boolean {
  if (!String(title ?? '').trim()) return false;
  const titleText = String(title);
  if (RECREATIONAL_INSTRUCTOR_PATTERN.test(titleText)) return false;
  // The employer is not evidence. Universities and colleges also publish
  // ordinary IT, facilities, administration, and student-support jobs.
  return ACADEMIC_TITLE_PATTERN.test(titleText)
    || (ACADEMIC_ROLE_TYPES.has(String(roleType ?? '')) && /\b(?:university|college|institute|polytechnic|school of|UBC)\b/i.test(String(source ?? '')));
}

/** A stored course value is safe to retain only when it looks like a real course code. */
export function isLikelyAcademicCourse(source: string | null | undefined, title: string | null | undefined, course: string | null | undefined): boolean {
  if (!/\b(?:university|college|institute|polytechnic|school of|UBC)\b/i.test(String(source ?? ''))) return false;
  const value = String(course ?? '').replace(/\s+/g, ' ').trim();
  if (!value || !/\b[A-Z]{2,8}\s?\d[A-Z0-9]{2,7}\b/i.test(value)) return false;
  if (/\b(?:JR|REQ|PSFT|ADP|NEOGOV|LEVER|CA|CALL|CENTRE|CONTENT|EDUCATOR|MECHANIC|OFFICER|PROGRAM|PROCTOR|RESEARCH|SERVICES|STRATEGY|TERM|UNIT)\s*\d/i.test(value)) return false;

  // Course-only rows are retained when the title itself is course-like. A
  // job title with a normal staff role is usually a requisition ID capture,
  // even when the employer is an educational institution.
  const titleText = String(title ?? '');
  const hasAcademicRoleTitle = /\b(?:assistant|associate|coordinator|manager|officer|specialist|technician|mechanic|worker|educator|administrator|leader|advisor|professor|lecturer|instructor|researcher)\b/i.test(titleText);
  const code = value.match(/\b[A-Z]{2,8}\s?\d[A-Z0-9]{2,7}\b/i)?.[0] ?? '';
  return !hasAcademicRoleTitle || new RegExp(`\\b${code.replace(/\\s+/g, '\\s*')}\\b`, 'i').test(titleText);
}

function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
  return PLACEHOLDER.test(normalized) ? '' : normalized;
}

function stripLabel(value: string, labels: string): string {
  return value.replace(new RegExp(`^(?:${labels})\\s*[:\\-]\\s*`, 'i'), '').trim();
}

function normalizeUnits(value: string): string {
  return value
    .replace(/\bhrs?\.?\b/gi, 'hours')
    .replace(/\bper\s*(?:wk|wks)\b/gi, 'per week')
    .replace(/\/\s*(?:wk|wks|week)\b/gi, ' per week')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract only a short source-labelled course/class schedule. */
export function extractAcademicSchedule(value: unknown): string {
  const text = clean(value);
  if (!text) return '';
  const label = text.match(/\b(?:course|class)\s+schedule\s*:\s*|\bhoraire\s*:\s*/i);
  if (!label || label.index === undefined) return '';
  const remainder = text.slice(label.index + label[0].length).trim();
  const end = remainder.search(/(?=\s*(?:requirements?|exigences?|work\s+hours?|heures?\s+(?:total|de\s+travail)|additional\s+information|information\s+additionnelle|course\s+(?:title|code)|posting\s+limited\s+to|salary|location|similar\s+jobs?|locations?|time\s+type|posted\s+on|time\s+left\s+to\s+apply)\s*:)/i);
  const schedule = (end < 0 ? remainder : remainder.slice(0, end))
    .replace(/^(?:[-–—]\s*)+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return schedule.length > 0 && schedule.length <= ACADEMIC_SCHEDULE_MAX_LENGTH ? schedule : '';
}

export function normalizeAcademicCourse(value: unknown): string {
  const cleaned = stripLabel(clean(value), 'course(?:\\s*\/\\s*project)?|course code(?:\\s*\/\\s*title)?|project');
  return /^(?:Fall|Winter|Spring|Summer)\s+\d{4}$/i.test(cleaned) ? '' : cleaned;
}

export function normalizeAcademicWorkload(value: unknown): string {
  let normalized = stripLabel(clean(value), 'academic workload|workload|appointment amount|appointment');
  if (!normalized) return '';
  if (/^(?:(?:full|part)[- ]?time|temporary|contract|permanent|casual|seasonal|occasional|on[- ]?call)(?:\s*,\s*(?:(?:full|part)[- ]?time|temporary|contract|permanent|casual|seasonal|occasional|on[- ]?call))*$/i.test(normalized)) return '';
  normalized = normalizeUnits(normalized)
    .replace(/\b(\d+(?:\.\d+)?)\s*FTE\b/gi, '$1 FTE')
    .replace(/\btotal\s+hours?\b/gi, 'total hours')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

export function normalizeAcademicOfficeHours(value: unknown): string {
  let normalized = stripLabel(clean(value), 'academic office hours|office hours|consultation hours|student[- ]contact hours|lab hours');
  if (!normalized) return '';
  if (/^(?:office|consultation|student[- ]contact|lab) hours?$/i.test(normalized)) return '';
  normalized = normalizeUnits(normalized)
    // Workday captures can glue the next labelled field directly onto the
    // office-hours sentence (for example, "...class timePosting limited to:").
    .replace(/Posting\s+limited\s+to\s*:.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

export function normalizeAcademicSupervisor(value: unknown): string {
  return stripLabel(clean(value), 'academic supervisor|supervisor|principal investigator|PI|supervising (?:department|person)');
}

export function normalizeAcademicAppointmentType(value: unknown): string {
  let normalized = stripLabel(clean(value), 'academic appointment type|appointment type|appointment');
  if (!normalized) return '';
  if (/^(?:(?:full|part)[- ]?time|temporary|contract|permanent|casual|seasonal|occasional|on[- ]?call)(?:\s*,\s*(?:(?:full|part)[- ]?time|temporary|contract|permanent|casual|seasonal|occasional|on[- ]?call))*$/i.test(normalized)) return '';
  normalized = normalized
    .replace(/\btenure\s*[- ]?\s*track\b/i, 'Tenure-track')
    .replace(/\blimited\s*[- ]?\s*term\b/i, 'Limited-term')
    .replace(/\bsessional(?:\s+faculty)?\b/i, 'Sessional')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '';
}
