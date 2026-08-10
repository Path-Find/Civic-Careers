import { daysUntilClose, fixCasing, formatSalary } from '../../utils';
import type { AcademicRoleType, Job, JobDetails } from '../../types/jobs';

export const CLOSING_SOON_DAYS = 14;

const ACADEMIC_ROLE_LABELS: Record<AcademicRoleType, string> = {
  faculty: 'Faculty',
  teaching_assistant: 'Teaching assistant',
  research_assistant: 'Research assistant',
  postdoctoral: 'Postdoctoral',
  academic_instructor: 'Academic instructor',
  course_staff: 'Course staff',
};

export function formatAcademicRole(value: AcademicRoleType | null | undefined): string | null {
  return value ? ACADEMIC_ROLE_LABELS[value] : null;
}

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

  // Comma-joined multi-Must driver walls → compact each half.
  if (/,\s*Must\b/i.test(s) && /\bdriver|class\s|licen[cs]e/i.test(s)) {
    const parts = s.split(/,\s*(?=Must\b)/i).map(part => compactLicenseLabel(part.trim())).filter(Boolean);
    if (parts.length > 1) return parts.join(', ');
  }

  // Already compact driver labels (not G/C merges).
  if (/^(?:(?:Ontario|BC|Alberta|Manitoba|Saskatchewan|Nova Scotia)\s+)?(?:Class\s+[A-Z0-9]+(?:\s+with\s+[\w\s]+ endorsement)?|Driver'?s licence)\b/i.test(s)
    || /^DND 404 driver'?s licence\b/i.test(s)) {
    if (!/Class\s+G\/C/i.test(s)) return s;
  }
  if (/Class\s+G\/C\b/i.test(s)) {
    const prov = /\bOntario\b/i.test(s) ? 'Ontario ' : '';
    const able = /\(able to obtain\)/i.test(s) ? ' (able to obtain)' : '';
    return `${prov}Class G, ${prov}Class C with Z endorsement${able}`.replace(/\s+/g, ' ').trim();
  }

  // Driver licences → "Ontario Class G", "Class DZ", etc.
  if (/\bdriver.?s?['’]?\s+licen[cs]e\b|\bclass\s*[\u201c\u201d"'‘’]?[a-z0-9]{1,3}\b|\bendorsement\b|\bDND\s*404\b|\b[A-FG][12]?\s+driver/i.test(s)
    && !/\b(?:aircraft|nurse|p\.?\s*eng|professional engineer|college of)\b/i.test(s)) {
    const isValidClass = (code: string) => /^(?:G[12]?|[A-F]|[1-6]|AZ|BZ|CZ|DZ|EZ|FZ|MZ)$/i.test(code);
    const classes: string[] = [];
    for (const m of s.matchAll(/\bclass\s*[\u201c\u201d"'‘’]?([A-Za-z0-9]{1,3})[\u201c\u201d"'‘’]?/gi)) {
      if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
    }
    for (const m of s.matchAll(/\b([BCDEFG][12]?|DZ|AZ|CZ|BZ|[1-6])\s+driver/gi)) {
      if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
    }
    const hasZ = /\b[\u201c\u201d"'‘’]?Z[\u201c\u201d"'‘’]?\s*endorsement|\bendorsement\s*[\u201c\u201d"'‘’]?Z/i.test(s);
    let unique = [...new Set(classes)];
    if (unique.includes('A') && unique.some(c => c !== 'A')) unique = unique.filter(c => c !== 'A');
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
    if (/\bdriver.?s?['’]?\s+licen[cs]e\b/i.test(s)) {
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

/** Compact wordy experience labels (federal "Experience analyzing…" walls). */
export function compactExperienceLabel(value: string): string {
  let s = value.replace(/\s+/g, ' ').trim();
  if (!s) return s;
  if (/^(?:\d+(?:\+|[–-]\d+)?\s*(?:years?|months?)|Recent(?:\s+\(within past \d+ years\))?|Several years)\s+—\s+.+$/i.test(s)
    || /^Experience with\b/i.test(s)) {
    return s;
  }

  if (/\bis defined as\b/i.test(s) || /^experience is defined\b/i.test(s)) {
    const within = s.match(/within the past\s+(?:\w+\s*)?\(?(\d+)\)?\s*years?/i);
    if (within) return `Recent (within past ${within[1]} years)`;
    const n = s.match(/approximately\s+(?:\w+\s*)?\((\d+)\)\s*years?/i)?.[1]
      || s.match(/(?:period of\s+)?(?:approximately\s+)?(\d+)\s*\+?\s*years?\s+or\s+more/i)?.[1]
      || s.match(/\((\d+)\)\s*years?\s+or\s+more/i)?.[1]
      || s.match(/(\d+)\s*\+?\s*years?\s+or\s+more/i)?.[1];
    if (n) return `${n}+ years`;
    const word = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+or\s+more/i)?.[1];
    if (word) {
      const map: Record<string, string> = {
        one: '1', two: '2', three: '3', four: '4', five: '5',
        six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
      };
      return `${map[word.toLowerCase()]}+ years`;
    }
    return '';
  }

  // Use one threshold style for the common minimum/at-least forms while
  // preserving alternative requirements such as "2 years part-time or 1 year
  // full-time" exactly as written.
  const numbers: Record<string, string> = {
    one: '1', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  };
  s = s.replace(/^(one|two|three|four|five|six|seven|eight|nine|ten)(?=\s+years?\b)/i, raw => numbers[raw.toLowerCase()]);

  if (!/\bor\b/i.test(s)) {
    const number = (raw: string) => numbers[raw.toLowerCase()] ?? raw;
    const threshold = s.match(/^(?:(?:a\s+)?minimum(?:\s+of)?|at\s+least)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*(?:-|–|—|to)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten))?\s+years?[’']?/i);
    const range = s.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-|–|—|to)\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?[’']?/i);
    const bare = s.match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?[’']?/i);
    const lead = threshold ?? range ?? bare;
    if (lead) {
      const minimum = number(lead[1]);
      const maximum = lead[2] ? number(lead[2]) : null;
      const label = `${minimum}${maximum ? `–${maximum}` : '+'} years`;
      s = label + s.slice(lead[0].length);
    }
  }

  s = s
    .replace(/^experience\s*:\s*(?:in\s+(?:the\s+)?)?/i, '')
    .replace(/^experience\s+in\s+(?:the\s+)?/i, '')
    .replace(/^experience\s+(?:with|of|using)\s+/i, '')
    .replace(/^experience\s+/i, '')
    .replace(/^in\s+(?:the\s+)?/i, '')
    .replace(/[.;\s]+$/g, '')
    .trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compact wordy education labels for display (esp. high-school walls). */
export function compactEducationLabel(value: string): string {
  const s = value.replace(/\s+/g, ' ').trim();
  if (!s) return s;
  if (/^High school diploma$/i.test(s)) return 'High school diploma';

  if (/\b(?:high\s+school|secondary\s+school|grade\s*12|ossd|g\.?e\.?d\.?)\b/i.test(s)) {
    if (/\bplus\b.+\b(?:program|diploma)\b/i.test(s) || /\bgraduation,\s*plus\b/i.test(s)) {
      const field = s.match(/\bin\s+([A-Za-z0-9][A-Za-z0-9 ,/-]+?)(?:\s+or\s+equivalent)?\s*$/i)?.[1]?.trim();
      if (field && field.length < 80) return `High school diploma plus program in ${field}`;
    }
    if (/\b(?:two|2)\s+years?\s+of\s+(?:secondary|high)\s+school\b/i.test(s)) return '2 years of high school';
    if (/\b(?:three|3)\s+years?\s+of\s+(?:secondary|high)\s+school\b/i.test(s)) return '3 years of high school';
    if (/\bpersonal support worker\b/i.test(s)) return 'High school diploma and Personal Support Worker certificate';
    return 'High school diploma';
  }

  return s
    .replace(/^(?:successful\s+)?completion of\s+(?:a\s+|an\s+)?/i, '')
    .replace(/\s*[-–—,]\s*or\s+a\s+combination of education,?\s*training and(?:\/or)?\s+experience.*$/i, '')
    .replace(/\s+or\s+a\s+combination of education,?\s*training and(?:\/or)?\s+experience.*$/i, '')
    .replace(/\s*[-–—,]?\s*or\s+(?:an?\s+)?(?:acceptable\s+|employer[- ]approved\s+)?combination of\s+(?:education|training|experience).*$/i, '')
    .replace(/\s+or\s+(?:an?\s+|the\s+)?(?:approved\s+)?equivalent combination.*$/i, '')
    .replace(/\s+or\s+equivalent(?:\s+combination.*)?$/i, '')
    .replace(/\s+or\s+employer-approved alternatives?.*$/i, '')
    .replace(/\s+or\s+higher$/i, '')
    .replace(/^(?:a|an|must have|minimum(?: of)?)\s+/i, '')
    .replace(/[,\s]+$/g, '')
    .replace(/^(.)/, c => c.toUpperCase())
    .trim() || s;
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

/** True when the stored name means "not in a union" (never show under Union). */
export function isNonUnionName(value: string | null | undefined): boolean {
  if (!value) return true;
  const s = value.trim().replace(/\?+$/g, '').replace(/\s+/g, ' ');
  if (!s) return true;
  return /^(non[-\s]?union(?:ized)?|none|n\/?a|no|not unionized|non union(?: staff| employees)?|mgmt non union|non union\/non mpe|non union, management)$/i.test(s)
    || /^non[-\s]?union\b/i.test(s);
}

/** Only show a real union name; never "Union: Non-Union?". */
export function formatUnionLabel(isUnionized: number | boolean | null | undefined, unionName: string | null | undefined): string | null {
  if (!isUnionized) return null;
  const name = (unionName || '').trim().replace(/\?+$/g, '').replace(/\s+/g, ' ');
  if (!name || isNonUnionName(name)) return null;
  if (/^union$/i.test(name)) return 'Unionized';
  return name;
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
    academicRole: formatAcademicRole(job.academic_role_type),
    academicCourse: job.academic_course || null,
    academicWorkload: job.academic_workload || null,
    academicOfficeHours: job.academic_office_hours || null,
    academicSupervisor: job.academic_supervisor || null,
    academicAppointmentType: job.academic_appointment_type || null,
    union: formatUnionLabel(job.is_unionized, job.union_name),
    listingType: job.listing_type === 'ongoing_recruitment' ? 'Ongoing recruitment' : job.listing_type === 'inventory' || job.is_inventory === 1 ? 'Candidate inventory' : null,
    studentRequirement: job.is_student === 1 ? 'Yes' : null,
    experience: (() => {
      try {
        const values = JSON.parse(job.experience_requirements || '[]');
        if (!Array.isArray(values) || !values.length) return null;
        let years: string | null = null;
        const items: string[] = [];
        for (const raw of values) {
          if (typeof raw !== 'string') continue;
          const isDef = /\bis defined as\b/i.test(raw);
          const c = compactExperienceLabel(raw);
          if (!c) continue;
          if (isDef || /^(?:\d+(?:\+|[–-]\d+)?\s*(?:years?|months?)|Recent\b|Several years\b)(?:\s+—|$)/i.test(c)) {
            if (!years) years = c;
            continue;
          }
          items.push(c);
        }
        const ordered = years ? [years, ...items] : items;
        return ordered.length ? ordered.join('; ') : null;
      } catch {
        return joinJsonArray(job.experience_requirements, compactExperienceLabel);
      }
    })(),
    education: joinJsonArray(job.education_requirements, compactEducationLabel),
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
