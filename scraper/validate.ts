import type { AcademicRoleType, ParsedJob } from './ai_parser';
import { QUICK_SCAN_TAGS } from '../shared/quick-scan-tags';
import { cleanJobDescription } from './cleanup_description';
import { normalizeDuration } from './duration';
import { normalizeLocation } from './location';
import { normalizeBenefits, normalizeCertificationRequirements, normalizeEducationRequirements, normalizeExperienceRequirements, normalizeLanguageRequirements, normalizeProfessionalLicenseRequirements } from './requirements';
import { normalizeJobTitle } from './title';
import { normalizeAcademicAppointmentType, normalizeAcademicCourse, normalizeAcademicOfficeHours, normalizeAcademicSupervisor, normalizeAcademicWorkload } from './academic-context';

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  return String(v).trim();
}

function normalizeOptionalText(v: unknown): string {
  const value = coerceString(v);
  return /^(?:n\/?a|none|null|not applicable|not specified|unknown)$/i.test(value) ? '' : value;
}

export function normalizeAcademicRoleType(v: unknown): AcademicRoleType {
  const value = coerceString(v).toLowerCase().replace(/[\s-]+/g, '_');
  if (!value || value === 'none' || value === 'null' || value === 'unknown') return null;
  if (value === 'faculty' || value === 'professor' || value === 'lecturer') return 'faculty';
  if (value === 'teaching_assistant' || value === 'ta' || value === 'academic_assistant') return 'teaching_assistant';
  if (value === 'research_assistant' || value === 'ra') return 'research_assistant';
  if (value === 'research_associate') return 'research_associate';
  if (value === 'postdoctoral' || value === 'postdoc' || value === 'post_doctoral') return 'postdoctoral';
  if (value === 'academic_instructor') return 'academic_instructor';
  if (value === 'course_staff' || value === 'course_coordinator') return 'course_staff';
  return null;
}

/** Title-case ALL CAPS department labels; leave short codes (EECS, CMHC) alone. */
export function normalizeDepartment(value: string | null | undefined): string {
  if (!value) return '';
  let cleaned = value
    .replace(/\(\d+\)/g, '')
    .replace(/\s*[-–—]\s*Job Opportunity.*/i, '')
    .replace(/\s*[-–—].*/, '')
    .replace(/^General$/i, '')
    .replace(/&/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || /^n\/a$/i.test(cleaned)) return '';

  // Pure department codes / bargaining units (EECS, CMHC, HR_7701) — keep as stored.
  // Longer single words like TRANSIT fall through to title case.
  if (/^[A-Z0-9][A-Z0-9_/-]{0,14}$/.test(cleaned) && !/\s/.test(cleaned)) {
    if (/[0-9_]/.test(cleaned) || cleaned.length <= 5) return cleaned;
  }

  if (cleaned === cleaned.toUpperCase() && cleaned !== cleaned.toLowerCase()) {
    const small = new Set(['and', 'of', 'the', 'for', 'to', 'in', 'or', 'at', 'by', 'as', 'a', 'an']);
    cleaned = cleaned
      .split(' ')
      .map((word, index) => {
        if (!word) return word;
        const lower = word.toLowerCase();
        if (lower === 'mgmt') return 'Management';
        if (lower === 'dept') return 'Department';
        if (small.has(lower) && index > 0) return lower;
        // Short tokens (IT, HR, CAO, EMS) stay acronym-style when source was ALL CAPS.
        if (word.length <= 3 && !small.has(lower)) return word.toUpperCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ')
      .replace(/\s+&\s+/g, ' & ');
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function coerceNumber(v: unknown): number | null {
  if (v == null || v === '' || v === 'null' || v === 'N/A') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[$,\s]/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

function coerceBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  return false;
}

/**
 * Tri-state requirement flags for vehicle_required / security_check_required.
 * Stored in DB as INTEGER: 1 | 0 | NULL. Never invent true from silence.
 */
export function normalizeRequirementFlag(v: unknown): boolean | null {
  if (v == null || v === '' || v === 'null' || v === 'unknown' || v === 'undefined') return null;
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  if (typeof v === 'number' && !Number.isNaN(v)) {
    if (v === 1) return true;
    if (v === 0) return false;
    return null;
  }
  const s = coerceString(v).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (!s) return null;
  if (/^(true|yes|y|required|required yes)$/.test(s)) return true;
  if (/^(false|no|n|not required|none|n\/a)$/.test(s)) return false;
  return null;
}

/** @deprecated Prefer normalizeRequirementFlag — same tri-state rules. */
function normalizeOptionalBool(v: unknown): boolean | null {
  return normalizeRequirementFlag(v);
}

/**
 * Union field rules (light normalize only — no full bargaining-unit taxonomy):
 * - Non-Union / Non-Affiliated / bare N/A → not unionized, empty name
 * - Bare "Union" → unionized with empty name
 * - Real name → unionized + light casing (C.U.P.E. → CUPE)
 * - Generic "Collective Agreement" alone is not a unit name
 */
export type UnionFields = { is_unionized: boolean; union_name: string };

function isNonUnionLabel(name: string): boolean {
  if (!name) return false;
  // Explicit non-membership labels only — do NOT treat "Non-Academic Staff Association" as non-union.
  if (/^union\s*\/\s*non[-\s]?union$/i.test(name)) return true;
  if (/^non[-\s]?union(?:ized)?\b/i.test(name)) return true;
  if (/^(none|n\/?a|no|not unionized|non-affiliated|non-bargaining|non\s+spécifié|non\s+specifie|unspecified|tbd|unknown)$/i.test(name)) {
    return true;
  }
  if (/^(mgmt\s+)?non[-\s]?union(?:\s*\/\s*non\s*mpe)?(?:,\s*management)?$/i.test(name)) return true;
  if (/^non[-\s]?union(?:\s+staff|\s+employees)?$/i.test(name)) return true;
  return false;
}

/** Light casing/dedupe for known union acronyms — not a full taxonomy. */
export function normalizeUnionName(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = String(raw).replace(/\?+$/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (isNonUnionLabel(s)) return '';
  if (/^union$/i.test(s)) return '';

  // C.U.P.E. / c.u.p.e. → CUPE
  s = s.replace(/\bC\.U\.P\.E\./gi, 'CUPE');
  s = s.replace(/\bcupe\b/gi, 'CUPE');
  s = s.replace(/\bO\.P\.S\.E\.U\./gi, 'OPSEU');
  s = s.replace(/\bU\.S\.W\./gi, 'USW');
  s = s.replace(/\bO\.N\.A\./gi, 'ONA');
  s = s.replace(/\s+/g, ' ').trim();

  // Generic agreement labels are not bargaining-unit names
  if (/^(collective agreement|faculty collective agreement|academic collective agreement|full-time support staff collective agreement)$/i.test(s)) {
    return '';
  }

  return s;
}

export function normalizeUnionFields(unionName: unknown, isUnionized: unknown): UnionFields {
  const rawName = coerceString(unionName).replace(/\?+$/g, '').replace(/\s+/g, ' ').trim();
  const name = normalizeUnionName(rawName);
  const flag = coerceBool(isUnionized);

  if (isNonUnionLabel(rawName)) {
    return { is_unionized: false, union_name: '' };
  }
  if (/^union$/i.test(rawName)) {
    return { is_unionized: true, union_name: '' };
  }
  if (name) return { is_unionized: true, union_name: name };
  return { is_unionized: flag, union_name: '' };
}

/**
 * Canonical salary_period tokens: yearly | hourly | monthly | flat.
 * Unknown/empty defaults to yearly (existing product policy).
 */
export type SalaryPeriod = 'yearly' | 'hourly' | 'monthly' | 'flat';

export function normalizeSalaryPeriod(v: unknown): SalaryPeriod {
  const s = coerceString(v).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (!s) return 'yearly';

  // Flat first — "per course" must not fall through to yearly
  if (
    /\bflat\b/.test(s)
    || /lump\s*sum/.test(s)
    || /per\s+course|half\s+course|per\s+assignment|per\s+project|per\s+session/.test(s)
    || /\bone[\s-]?time\b/.test(s)
    || /\bstipend\b|\bhonorarium\b/.test(s)
  ) {
    return 'flat';
  }

  if (/\bhour|\bhrs?\b|\/\s*hr|per\s*hour/.test(s) || s === 'hr' || s === 'hrs') return 'hourly';
  if (/\bmonth|\/\s*mo|per\s*month/.test(s)) return 'monthly';
  if (/\byear|annual|annum|\/\s*yr|per\s*year/.test(s)) return 'yearly';

  return 'yearly';
}

/**
 * Canonical work_model tokens: On-site | Hybrid | Remote.
 * Display may map On-site → "In-person"; storage always uses On-site.
 * titleHint is a safety net when AI misses delivery-format words in the title.
 * Unknown/empty defaults to On-site (existing product policy on parse).
 */
export function normalizeWorkModel(v: unknown, titleHint = ''): 'Hybrid' | 'Remote' | 'On-site' {
  const raw = coerceString(v);
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, '');
  const lower = raw.toLowerCase();

  // Hybrid first (blended / flexible / hybrid+remote often still hybrid)
  if (
    compact.includes('hybrid')
    || compact.includes('blended')
    || /\bflex(?:ible)?\s*work\b/i.test(lower)
    || /\bpartial(?:ly)?\s*remote\b/i.test(lower)
  ) {
    return 'Hybrid';
  }

  // Remote / WFH / virtual / online (field wins when it clearly says remote)
  if (
    compact.includes('remote')
    || compact.includes('wfh')
    || compact.includes('workfromhome')
    || compact.includes('workathome')
    || compact.includes('telework')
    || compact.includes('telecommute')
    || compact.includes('virtual')
    || compact.includes('online')
    || compact.includes('distance')
    || compact.includes('elearning')
    || compact.includes('asynchronous')
  ) {
    return 'Remote';
  }

  // Title delivery format overrides weak/missing/On-site AI defaults
  // (e.g. title "… (Online)" when work_model was wrongly "On-site")
  if (/\b(online|virtual|remote|distance|e-?learning|asynchronous|wfh|work\s+from\s+home)\b/i.test(titleHint)) {
    return 'Remote';
  }
  if (/\b(hybrid|blended)\b/i.test(titleHint)) {
    return 'Hybrid';
  }

  // Explicit on-site / in-person / office, or default
  return 'On-site';
}

/**
 * Canonical employment_type tokens (single column — schedule + tenure mixed):
 *   Full-time | Part-time | Contract | Permanent | Occasional | Seasonal
 *
 * Conceptual axes (document only; not separate DB columns):
 *   schedule: Full-time | Part-time | Occasional
 *   tenure:   Permanent | Contract | Seasonal
 * Casual / temporary / term → Contract. Unknown defaults to Full-time (existing policy).
 */
export type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Permanent'
  | 'Occasional'
  | 'Seasonal';

export function normalizeEmploymentType(v: unknown): EmploymentType {
  const s = coerceString(v).toLowerCase().replace(/[\s_-]+/g, '');
  if (!s) return 'Full-time';

  // Most specific first
  if (s.includes('occasional') || s.includes('substitute') || s.includes('oncall') || s.includes('supply')) {
    return 'Occasional';
  }
  if (s.includes('seasonal')) return 'Seasonal';
  if (s.includes('parttime') || (s.includes('part') && !s.includes('impart'))) return 'Part-time';
  if (s.includes('permanent') || s.includes('continuing') || s.includes('indeterminate')) return 'Permanent';
  if (
    s.includes('contract')
    || s.includes('temporary')
    || s.includes('temp')
    || s.includes('casual')
    || s.includes('term')
    || s.includes('fixedterm')
  ) {
    return 'Contract';
  }
  if (s.includes('fulltime') || s.includes('full')) return 'Full-time';
  return 'Full-time';
}

function normalizeClosingDate(v: unknown): string | null {
  if (v == null || v === 'null' || v === 'N/A' || v === '') return null;
  const s = coerceString(v);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    // Date-only source text should remain date-only; converting local midnight
    // through UTC can otherwise shift it by a day or add a meaningless time.
    if (!/(?:T|\s)\d{1,2}:\d{2}/.test(s)) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return d.toISOString().replace(/\.\d{3}Z$/, '');
  }
  return null;
}

// Also used for required_skills — same shape: array or comma/semicolon list.
function normalizeStringList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(coerceString).filter(Boolean);
  if (typeof v === 'string' && v) return v.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return [];
}

function normalizeSoftwareList(v: unknown): string[] {
  return [...new Set(normalizeStringList(v).map(value => {
    const normalized = value.replace(/\s+/g, ' ').replace(/[.]$/, '').trim();
    if (/^(?:microsoft office(?: suite)?|microsoft suite|ms office(?: suite)?|office 365)(?: applications?)?$/i.test(normalized)) return 'Microsoft Office';
    if (/^(?:microsoft 365|m365)(?: applications?)?$/i.test(normalized)) return 'Microsoft 365';
    const product = normalized.match(/^(?:microsoft|ms)\s+(word|excel|powerpoint|outlook|access|visio|project)(?: applications?)?$/i);
    if (product) {
      const names: Record<string, string> = { word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint', outlook: 'Outlook', access: 'Access', visio: 'Visio', project: 'Project' };
      return names[product[1].toLowerCase()];
    }
    if (/^(?:adobe\s+)?(?:acrobat(?:\s+pro)?|pro)$/i.test(normalized)) return 'Adobe Acrobat';
    if (/^adobe\s+creative\s+cloud$/i.test(normalized)) return 'Adobe Creative Cloud';
    if (/^(?:adobe\s+)?photoshop$/i.test(normalized)) return 'Photoshop';
    if (/^(?:adobe\s+)?illustrator$/i.test(normalized)) return 'Illustrator';
    if (/^(?:adobe\s+)?indesign$/i.test(normalized)) return 'InDesign';
    if (/^(?:adobe\s+)?captivate$/i.test(normalized)) return 'Adobe Captivate';
    return normalized;
  }).filter(Boolean))];
}

function normalizeTags(v: unknown): string[] {
  return normalizeStringList(v).filter((tag): tag is typeof QUICK_SCAN_TAGS[number] =>
    (QUICK_SCAN_TAGS as readonly string[]).includes(tag)
  );
}

const EMPTY_SECTION_LINE = /^(none|n\/a|not applicable|not specified|not required|no additional .*)\.?$/i;

function isEmptySectionBody(body: string): boolean {
  const lines = body.split('\n').map(line => line.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
  return lines.length > 0 && lines.every(line => EMPTY_SECTION_LINE.test(line));
}

// Safety net for cases where the AI ignores prompt instructions: drops
// sections whose body is just a placeholder, and forces bullet-only lists.
function cleanDescription(markdown: string): string {
  if (!markdown) return markdown;

  const lines = markdown.split('\n');
  const sections: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current.length) sections.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) sections.push(current);

  const kept = sections.filter(section => {
    if (!/^##\s+/.test(section[0])) return true; // leading content before first header
    const body = section.slice(1).join('\n').trim();
    return body !== '' && !isEmptySectionBody(body);
  });

  const cleaned = kept
    .map(section => section.join('\n'))
    .join('\n')
    .replace(/^(\s*)\d+\.\s+/gm, '$1- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned;
}

export function validateParsedJob(obj: unknown, titleHint = ''): ParsedJob | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;

  const job_title = normalizeJobTitle(coerceString(o['job_title']) || coerceString(titleHint));
  if (!job_title) return null;

  return {
    job_title,
    department: normalizeDepartment(coerceString(o['department'])),
    location: normalizeLocation(coerceString(o['location'])),
    salary_min: coerceNumber(o['salary_min']),
    salary_max: coerceNumber(o['salary_max']),
    salary_period: normalizeSalaryPeriod(o['salary_period']),
    closing_date: normalizeClosingDate(o['closing_date']),
    work_model: normalizeWorkModel(o['work_model'], job_title),
    employment_type: normalizeEmploymentType(o['employment_type']),
    duration: normalizeDuration(coerceString(o['duration'])),
    hours: normalizeOptionalText(o['hours']),
    availability: normalizeOptionalText(o['availability']),
    academic_role_type: normalizeAcademicRoleType(o['academic_role_type']),
    academic_course: normalizeAcademicCourse(o['academic_course']),
    academic_workload: normalizeAcademicWorkload(o['academic_workload']),
    academic_office_hours: normalizeAcademicOfficeHours(o['academic_office_hours']),
    academic_supervisor: normalizeAcademicSupervisor(o['academic_supervisor']),
    academic_appointment_type: normalizeAcademicAppointmentType(o['academic_appointment_type']),
    ...normalizeUnionFields(o['union_name'], o['is_unionized']),
    is_student: coerceBool(o['is_student']),
    is_inventory: coerceBool(o['is_inventory']),
    benefits: normalizeBenefits(normalizeStringList(o['benefits'])),
    required_skills: normalizeStringList(o['required_skills']),
    experience_requirements: normalizeExperienceRequirements(normalizeStringList(o['experience_requirements'])),
    education_requirements: normalizeEducationRequirements(o['education_requirements']),
    license_requirements: normalizeProfessionalLicenseRequirements(o['license_requirements']),
    vehicle_required: normalizeRequirementFlag(o['vehicle_required']),
    language_requirements: normalizeLanguageRequirements(o['language_requirements']),
    security_check_required: normalizeRequirementFlag(o['security_check_required']),
    certification_requirements: normalizeCertificationRequirements(o['certification_requirements']),
    software_requirements: normalizeSoftwareList(o['software_requirements']),
    responsibility_tags: normalizeTags(o['responsibility_tags']),
    qualification_tags: normalizeTags(o['qualification_tags']),
    clean_description: cleanJobDescription(cleanDescription(coerceString(o['clean_description'])), job_title),
  };
}
