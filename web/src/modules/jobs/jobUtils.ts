import { daysUntilClose, fixCasing, formatSalary } from '../../utils';
import type { Job, JobDetails } from '../../types/jobs';

export const CLOSING_SOON_DAYS = 14;

export function jobFreshnessTimestamp(job: Pick<Job, 'posted_at' | 'first_seen_at'>, now = Date.now()): number {
  const postedAt = job.posted_at ? Date.parse(`${job.posted_at.slice(0, 10)}T00:00:00Z`) : NaN;
  if (Number.isFinite(postedAt) && postedAt <= now) return postedAt;

  const firstSeenAt = Date.parse(`${job.first_seen_at.replace(' ', 'T')}Z`);
  return Number.isFinite(firstSeenAt) ? firstSeenAt : 0;
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
    department: (job.department || '')
      .replace(/\(\d+\)/g, '')
      .replace(/\s*[-–—]\s*Job Opportunity.*/i, '')
      .replace(/\s*[-–—].*/, '')
      .replace(/^General$/i, '')
      .trim(),
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
