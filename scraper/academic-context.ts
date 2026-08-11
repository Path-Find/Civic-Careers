const PLACEHOLDER = /^(?:n\/?a|none|null|not applicable|not specified|unknown)$/i;

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
