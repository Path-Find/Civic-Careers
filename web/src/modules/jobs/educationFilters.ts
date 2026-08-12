export const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'High school' },
  { value: 'diploma', label: 'Diploma or certificate' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'student', label: 'Currently enrolled' },
] as const;

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
