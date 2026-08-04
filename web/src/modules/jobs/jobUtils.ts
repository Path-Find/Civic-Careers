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
 * Compact wordy licence labels for display (CNO / P.Eng / driver classes).
 * Keeps the detail UI short even when stored rows still carry source prose.
 */
export function compactLicenseLabel(value: string): string {
  const s = value.replace(/\s+/g, ' ').trim();
  if (!s) return s;

  // Drop student-registration false positives from the Licences field.
  if (/\bregistered as a (?:full[- ]time|part[- ]time)?\s*student\b/i.test(s)
    || /\b(?:full[- ]time|part[- ]time)\s+(?:secondary|post[- ]secondary)\s+student\b/i.test(s)) {
    return '';
  }

  // Already compact driver labels.
  if (/^(?:(?:Ontario|BC|Alberta|Manitoba|Saskatchewan|Nova Scotia)\s+)?(?:Class\s+[A-Z0-9/]+|Driver'?s licence)\b/i.test(s)
    || /^DND 404 driver'?s licence\b/i.test(s)) {
    return s;
  }

  // Driver licences → "Ontario Class G", "Class DZ", etc.
  if (/\bdriver.?s?\s+licen[cs]e\b|\bclass\s*[\u201c\u201d"'‘’]?[a-z0-9]{1,3}\b|\bendorsement\b|\bDND\s*404\b/i.test(s)
    && !/\b(?:aircraft|nurse|p\.?\s*eng|professional engineer|college of)\b/i.test(s)) {
    const isValidClass = (code: string) => /^(?:G[12]?|[A-F]|[1-6]|AZ|BZ|CZ|DZ|EZ|FZ|MZ)$/i.test(code);
    const classes: string[] = [];
    for (const m of s.matchAll(/\bclass\s*[\u201c\u201d"'‘’]?([A-Za-z0-9]{1,3})[\u201c\u201d"'‘’]?/gi)) {
      if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
    }
    const hasZ = /\b[\u201c\u201d"'‘’]?Z[\u201c\u201d"'‘’]?\s*endorsement|\bendorsement\s*[\u201c\u201d"'‘’]?Z/i.test(s);
    let unique = [...new Set(classes)];
    if (unique.includes('D') && hasZ && !unique.some(c => c.includes('Z'))) {
      unique = unique.map(c => (c === 'D' ? 'DZ' : c));
    }
    let province = '';
    if (/\bontario\b|\bMTO\b/i.test(s)) province = 'Ontario';
    else if (/\bBC\b|british columbia/i.test(s)) province = 'BC';
    else if (/\balberta\b/i.test(s)) province = 'Alberta';
    else if (/\bmanitoba\b/i.test(s)) province = 'Manitoba';
    else if (/\bsaskatchewan\b/i.test(s)) province = 'Saskatchewan';
    else if (/\bnova scotia\b/i.test(s)) province = 'Nova Scotia';
    const able = /\b(?:ability|able|willing)\s+to\s+obtain\b|\bobtain and maintain\b/i.test(s)
      && !/\bmust\s+have\s+a\s+valid\b/i.test(s.slice(0, 40));
    if (/\bDND\s*404\b/i.test(s)) return able ? "DND 404 driver's licence (able to obtain)" : "DND 404 driver's licence";
    if (unique.length) {
      let out = province ? `${province} Class ${unique.join('/')}` : `Class ${unique.join('/')}`;
      if (hasZ && !unique.some(c => /Z/i.test(c))) out += ' with Z endorsement';
      if (able) out += ' (able to obtain)';
      return out;
    }
    if (/\bdriver.?s?\s+licen[cs]e\b/i.test(s)) {
      const base = province ? `${province} driver's licence` : "Driver's licence";
      return able ? `${base} (able to obtain)` : base;
    }
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
