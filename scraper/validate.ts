import type { ParsedJob } from './ai_parser';
import { QUICK_SCAN_TAGS } from '../shared/quick-scan-tags';
import { cleanJobDescription } from './cleanup_description';
import { normalizeLocation } from './location';
import { normalizeEducationRequirements, normalizeLanguageRequirements, normalizeLicenseRequirements } from './requirements';

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  return String(v).trim();
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

function normalizeOptionalBool(v: unknown): boolean | null {
  if (v == null || v === '' || v === 'null' || v === 'unknown') return null;
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1' || v === 'true') return true;
  if (v === 0 || v === '0' || v === 'false') return false;
  return null;
}

function normalizeSalaryPeriod(v: unknown): 'yearly' | 'hourly' | 'monthly' | 'flat' {
  const s = coerceString(v).toLowerCase();
  if (s.includes('hour') || s === 'hr') return 'hourly';
  if (s.includes('month')) return 'monthly';
  if (/flat|lump.?sum|per course|one.?time|stipend|per assignment|per project|honorarium/.test(s)) return 'flat';
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

function normalizeEmploymentType(v: unknown): 'Full-time' | 'Part-time' | 'Contract' | 'Permanent' | 'Occasional' {
  const s = coerceString(v).toLowerCase().replace(/[\s_-]/g, '');
  if (s.includes('occasional') || s.includes('substitute') || s.includes('oncall')) return 'Occasional';
  if (s.includes('part')) return 'Part-time';
  if (s.includes('contract') || s.includes('temp') || s.includes('casual')) return 'Contract';
  if (s.includes('permanent')) return 'Permanent';
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

  const job_title = coerceString(o['job_title']) || coerceString(titleHint);
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
    duration: coerceString(o['duration']),
    ...(() => {
      const rawName = coerceString(o['union_name']).replace(/\?+$/g, '').replace(/\s+/g, ' ').trim();
      const flag = coerceBool(o['is_unionized']);
      const nameIsNonUnion = !!rawName && (
        /^(non[-\s]?union(?:ized)?|none|n\/?a|no|not unionized|non union(?: staff| employees)?|mgmt non union|non union\/non mpe|non union, management)$/i.test(rawName)
        || /^non[-\s]?union\b/i.test(rawName)
      );
      // "Non-Union" / "Non-Union?" is never a union membership.
      if (nameIsNonUnion) return { is_unionized: false, union_name: '' };
      // AI sometimes sets is_unionized true with name "Union" only.
      if (/^union$/i.test(rawName)) return { is_unionized: true, union_name: '' };
      // A real union name implies unionized even if the flag was wrong.
      if (rawName) return { is_unionized: true, union_name: rawName };
      return { is_unionized: flag, union_name: '' };
    })(),
    is_student: coerceBool(o['is_student']),
    is_inventory: coerceBool(o['is_inventory']),
    benefits: normalizeStringList(o['benefits']),
    required_skills: normalizeStringList(o['required_skills']),
    experience_requirements: normalizeStringList(o['experience_requirements']),
    education_requirements: normalizeEducationRequirements(o['education_requirements']),
    license_requirements: normalizeLicenseRequirements(o['license_requirements']),
    vehicle_required: normalizeOptionalBool(o['vehicle_required']),
    language_requirements: normalizeLanguageRequirements(o['language_requirements']),
    security_check_required: normalizeOptionalBool(o['security_check_required']),
    certification_requirements: normalizeStringList(o['certification_requirements']),
    software_requirements: normalizeSoftwareList(o['software_requirements']),
    responsibility_tags: normalizeTags(o['responsibility_tags']),
    qualification_tags: normalizeTags(o['qualification_tags']),
    clean_description: cleanJobDescription(cleanDescription(coerceString(o['clean_description'])), job_title),
  };
}
