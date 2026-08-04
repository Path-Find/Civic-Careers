import { daysUntilClose, fixCasing, formatSalary } from '../../utils';
import type { Job, JobDetails } from '../../types/jobs';

export const CLOSING_SOON_DAYS = 14;

export function jobFreshnessTimestamp(job: Pick<Job, 'posted_at' | 'first_seen_at'>, now = Date.now()): number {
  const postedAt = job.posted_at ? Date.parse(`${job.posted_at.slice(0, 10)}T00:00:00Z`) : NaN;
  if (Number.isFinite(postedAt) && postedAt <= now) return postedAt;

  const firstSeenAt = Date.parse(`${job.first_seen_at.replace(' ', 'T')}Z`);
  return Number.isFinite(firstSeenAt) ? firstSeenAt : 0;
}

/** ISO dates get a short display form; seasonal/Immediate text passes through. */
export function formatStartDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    try {
      const date = new Date(`${trimmed.slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return trimmed;
      return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/**
 * Compact wordy professional-registration labels for display.
 * Mirrors scraper normalizeLicenseRequirement for the common CNO / P.Eng cases
 * so stale or re-parsed rows never shout the full “registration with the College…” prose.
 */
export function compactLicenseLabel(value: string): string {
  const s = value.replace(/\s+/g, ' ').trim();
  if (!s) return s;

  // Drop student-registration false positives from the Licences field.
  if (/\bregistered as a (?:full[- ]time|part[- ]time)?\s*student\b/i.test(s)
    || /\b(?:full[- ]time|part[- ]time)\s+(?:secondary|post[- ]secondary)\s+student\b/i.test(s)) {
    return '';
  }

  const eligible = /\beligib(?:le|ility)\b/i.test(s) ? ' or eligible' : '';
  const cno = /college of nurses(?: of ontario)?|ontario college of nurses|\bCNO\b/i.test(s);
  const peo = /professional engineers(?: of)? ontario|\bPEO\b/i.test(s);
  const rnEc = /extended class|nurse practitioner|\bRN[- ]?EC\b/i.test(s);
  const rpn = /registered practical nurse|\blicensed practical nurse\b|\bRPN\b|\bLPN\b/i.test(s);
  const rn = /registered nurse|\bRN\b/i.test(s) && !rnEc && !rpn;
  const peng = /professional engineer|p\.?\s*eng/i.test(s);

  if (cno && rnEc) return `RN-EC (CNO)${eligible}`;
  if (cno && rpn) return `RPN (CNO)${eligible}`;
  if (cno && rn) return `RN (CNO)${eligible}`;
  if (cno && /registration|registered|licen[cs]e|member/i.test(s)) return `CNO${eligible}`;
  if (peng && peo) return `P.Eng. (PEO)${eligible}`;
  if (peng && /\bin ontario\b|province of ontario/i.test(s)) return `P.Eng. (Ontario)${eligible}`;
  if (peng && !/\bdriver/i.test(s) && s.length > 40) return `P.Eng.${eligible}`;

  // Generic “registration as X with Y” → keep X, drop the registration shell.
  const asWith = s.match(/^registration as (?:a |an )?(.+?) with (.+)$/i);
  if (asWith) {
    const role = asWith[1].trim();
    const body = asWith[2].replace(/\bin good standing\b/gi, '').trim();
    if (role.length < 80) return body ? `${role} (${body})${eligible}` : `${role}${eligible}`;
  }
  const regWith = s.match(/^registration with (.+)$/i);
  if (regWith && regWith[1].length < 60) {
    return regWith[1].replace(/\bin good standing\b/gi, '').trim() + eligible;
  }

  return s;
}

export function joinJsonArray(raw: string | null, mapItem?: (value: string) => string): string | null {
  try {
    const values = JSON.parse(raw || '[]');
    if (!Array.isArray(values) || !values.length) return null;
    const mapped = values
      .filter((value): value is string => typeof value === 'string')
      .map(value => (mapItem ? mapItem(value) : value).trim())
      .filter(Boolean);
    return mapped.length ? mapped.join(', ') : null;
  } catch {
    return null;
  }
}

export function parseTagList(raw: string | null): string[] {
  try {
    const values = JSON.parse(raw || '[]');
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function parseJobDetails(job: Job): JobDetails {
  return {
    salary: formatSalary(job),
    mode: job.work_model === 'On-site' ? 'In-person' : (job.work_model || null),
    type: job.employment_type || null,
    duration: job.duration || null,
    startDate: formatStartDate(job.start_date),
    hours: job.hours || null,
    availability: job.availability || null,
    union: job.is_unionized ? (job.union_name || 'Unionized') : null,
    listingType: job.listing_type === 'ongoing_recruitment' ? 'Ongoing recruitment' : job.listing_type === 'inventory' || job.is_inventory === 1 ? 'Candidate inventory' : null,
    studentRequirement: job.is_student === 1 ? 'Yes' : null,
    experience: joinJsonArray(job.experience_requirements),
    education: joinJsonArray(job.education_requirements),
    licenses: joinJsonArray(job.license_requirements, compactLicenseLabel),
    language: joinJsonArray(job.language_requirements),
    vehicle: job.vehicle_required === 1 ? 'Required' : null,
    securityCheck: job.security_check_required === 1 ? 'Required' : null,
    certifications: joinJsonArray(job.certification_requirements),
    software: joinJsonArray(job.software_requirements),
    medical: joinJsonArray(job.medical_requirements),
    benefits: joinJsonArray(job.benefits),
    skills: joinJsonArray(job.required_skills),
    future: (job.description || '').toLowerCase().includes('future requirements')
      ? 'Eligible for future requirements'
      : null,
  };
}

export function isExpired(job: Job): boolean {
  if (job.is_active === 0) return true;
  if (!job.closing_date) return false;
  const days = daysUntilClose(job.closing_date);
  return days !== null && days < 0;
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

export function normalizeJob(job: Job): Job {
  const normalizeLocation = (value: string | null): string => {
    if (!value) return '';
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned !== cleaned.toUpperCase()) return cleaned;
    return fixCasing(cleaned).replace(/\b(On|Qc|Ns|Nb|Mb|Sk|Ab|Bc|Pe|Nl|Nt|Nu|Yt|Ca|Us)\b/g, match => match.toUpperCase());
  };
  return {
    ...job,
    job_title: fixCasing((job.job_title || '')
      .replace(/^Available Position:\s+/i, '')
      .replace(/\(\d+\)\s*$/, '')
      .replace(/\d+$/, '')
      .replace(/ -([A-Z])/, ' - $1')
      .trim()),
    location: normalizeLocation(job.location),
    department: normalizeDepartment(job.department),
    closing_date: (job.closing_date || '').replace(/Posted on\s+/i, '').trim(),
    source: job.source === 'WATERFRONT TORONTO' ? 'Waterfront Toronto' : job.source,
  };
}

export function groupJobsByCompany(jobs: Job[]): Record<string, Job[]> {
  return jobs.reduce((groups, job) => {
    (groups[job.source] ||= []).push(job);
    return groups;
  }, {} as Record<string, Job[]>);
}
