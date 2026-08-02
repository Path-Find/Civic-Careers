import type { ParsedJob } from './ai_parser';
import { QUICK_SCAN_TAGS } from '../shared/quick-scan-tags';

function coerceString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  return String(v).trim();
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

function normalizeSalaryPeriod(v: unknown): 'yearly' | 'hourly' | 'monthly' | 'flat' {
  const s = coerceString(v).toLowerCase();
  if (s.includes('hour') || s === 'hr') return 'hourly';
  if (s.includes('month')) return 'monthly';
  if (/flat|lump.?sum|per course|one.?time|stipend|per assignment|per project|honorarium/.test(s)) return 'flat';
  return 'yearly';
}

// titleHint is a safety net: the AI sometimes misses delivery-format words
// (e.g. "Course Name (Online)") that only appear in the title, not the body,
// and falls back to the wrong default of On-site.
function normalizeWorkModel(v: unknown, titleHint = ''): 'Hybrid' | 'Remote' | 'On-site' {
  const s = coerceString(v).toLowerCase().replace(/[\s_-]/g, '');
  if (s.includes('hybrid')) return 'Hybrid';
  if (s.includes('remote')) return 'Remote';
  if (/\b(online|virtual|remote|distance|e-?learning|asynchronous)\b/i.test(titleHint)) return 'Remote';
  return 'On-site';
}

function normalizeEmploymentType(v: unknown): 'Full-time' | 'Part-time' | 'Contract' | 'Permanent' {
  const s = coerceString(v).toLowerCase().replace(/[\s_-]/g, '');
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

  return kept
    .map(section => section.join('\n'))
    .join('\n')
    .replace(/^(\s*)\d+\.\s+/gm, '$1- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function validateParsedJob(obj: unknown, titleHint = ''): ParsedJob | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;

  const job_title = coerceString(o['job_title']) || coerceString(titleHint);
  if (!job_title) return null;

  return {
    job_title,
    department: coerceString(o['department']),
    location: coerceString(o['location']),
    salary_min: coerceNumber(o['salary_min']),
    salary_max: coerceNumber(o['salary_max']),
    salary_period: normalizeSalaryPeriod(o['salary_period']),
    closing_date: normalizeClosingDate(o['closing_date']),
    work_model: normalizeWorkModel(o['work_model'], job_title),
    employment_type: normalizeEmploymentType(o['employment_type']),
    duration: coerceString(o['duration']),
    is_unionized: coerceBool(o['is_unionized']),
    union_name: coerceString(o['union_name']),
    is_student: coerceBool(o['is_student']),
    is_inventory: coerceBool(o['is_inventory']),
    benefits: normalizeStringList(o['benefits']),
    required_skills: normalizeStringList(o['required_skills']),
    responsibility_tags: normalizeTags(o['responsibility_tags']),
    qualification_tags: normalizeTags(o['qualification_tags']),
    clean_description: cleanDescription(coerceString(o['clean_description'])),
  };
}
