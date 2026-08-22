export const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High school' },
  { value: 'diploma', label: 'Diploma or certificate' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'student', label: 'Currently enrolled' },
] as const;

function titleCaseField(value: string): string {
  if (!/[a-z]/i.test(value)) return value;
  return value.split(/(\s+|[-/])/).map(part => {
    if (!/[a-z]/i.test(part) || /^[A-Z0-9.-]+$/.test(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
}

function cleanFieldCandidate(value: string): string {
  let field = value
    .replace(/\s+/g, ' ')
    .replace(/^[,;:–—-]+|[,;:–—-]+$/g, '')
    .replace(/\s*\((?:or|and)\s+equivalent[^)]*\)$/i, '')
    .replace(/\s+(?:or|and)\s+(?:an?\s+)?equivalent(?:\s+field)?(?:\s+or\s+related)?$/i, '')
    .replace(/\s+(?:or|and)\s+related\s+(?:field|discipline)$/i, '')
    .trim();
  if (!field || field.length > 80) return '';
  if (/\b(?:degree|diploma|certificate|education|post-secondary|equivalent|years?|experience|graduat(?:e|ion))\b/i.test(field)) return '';
  return titleCaseField(field);
}

/** Extract canonical subject names while ignoring Bachelor/BSc/BA wording. */
export function extractEducationFieldOptions(value: string | null | undefined): string[] {
  const text = educationText(value);
  if (!text) return [];
  const candidates: string[] = [];
  for (const item of text.split(/\s*;\s*|\s*\|\s*/)) {
    const normalized = item.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const degreePrefix = /^(?:a\s+|an\s+)?(?:(?:bachelor|master|doctor)(?:'s|ate|al)?|ph\.?d\.?|b\.?a\.?|b\.?sc\.?|m\.?a\.?|m\.?sc\.?|diploma|certificate|degree|credential|major)\b/i.test(normalized);
    const inIndex = normalized.toLowerCase().lastIndexOf(' in ');
    const ofIndex = normalized.toLowerCase().lastIndexOf(' of ');
    let field = degreePrefix && inIndex >= 0 ? normalized.slice(inIndex + 4) : '';
    if (!field && degreePrefix && ofIndex >= 0 && /\b(?:science|arts|architecture|engineering|business|education|law|nursing)\b/i.test(normalized.slice(ofIndex + 4))) {
      field = normalized.slice(ofIndex + 4);
    }
    if (!field && !degreePrefix && /\b(?:field|discipline|major)\b/i.test(normalized)) {
      field = normalized.replace(/\b(?:field|discipline|major)\b.*$/i, '');
    }
    if (!field) continue;
    for (const part of field.split(/\s*,\s*|\s+or\s+|\s+\/\s+|\s+and\s+/i)) {
      const cleaned = cleanFieldCandidate(part);
      if (cleaned) candidates.push(cleaned);
    }
  }
  return [...new Set(candidates)];
}

export function educationFieldOptions(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.flatMap(extractEducationFieldOptions))].sort((a, b) => a.localeCompare(b));
}

export type EducationLevel = typeof EDUCATION_LEVELS[number]['value'];

function educationText(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map(item => String(item)).join(' ');
    if (parsed && typeof parsed === 'object') return Object.values(parsed).map(item => String(item)).join(' ');
  } catch {
    // Older rows contain plain text rather than JSON.
  }
  return value;
}

const LEVEL_PATTERNS: Record<EducationLevel, RegExp> = {
  high_school: /high school|secondary school|grade\s*12|high-school/i,
  diploma: /diploma|certificate|college\s+(?:degree|credential)/i,
  bachelors: /bachelor|baccalaureate|undergraduate degree/i,
  masters: /master(?:'s)?|graduate degree/i,
  doctorate: /doctorate|doctoral|ph\.?d|d\.?phil/i,
  student: /currently enrolled|student status|enrolled in|post-secondary student/i,
};

export function matchesEducationLevel(value: string | null | undefined, level: EducationLevel): boolean {
  return LEVEL_PATTERNS[level].test(educationText(value));
}

/** Field matching is intentionally limited to the source's education field. */
export function matchesEducationField(value: string | null | undefined, field: string): boolean {
  const normalized = field.trim().toLowerCase();
  return !normalized || educationText(value).toLowerCase().includes(normalized);
}
