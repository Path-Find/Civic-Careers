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

export function joinJsonArray(raw: string | null): string | null {
  try {
    const values = JSON.parse(raw || '[]');
    return Array.isArray(values) && values.length ? values.join(', ') : null;
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
    licenses: joinJsonArray(job.license_requirements),
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
