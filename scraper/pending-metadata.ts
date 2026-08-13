import { extractLabeledLocation, normalizeLocation } from './location';
import { extractTitleDuration } from './title';

export type PendingMetadata = {
  salaryText: string | null;
  isStudent: number | null;
  duration: string | null;
  location?: string;
};

const LOCATION_PROSE = /\b(?:apply\s+now|however|including|knowledge|experience|communities|community|persons?|peoples?|racialized|women|interview|comprehensive|dental|benefit|instructor|system|management|requirements?|supports?|position|program)\b|\b(?:st|rd|dr|ave|line)\.?[a-z]+/i;

export function isUsablePendingLocation(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  return normalized.split(';').every(part => {
    const city = part.replace(/,\s*[A-Z]{2}$/, '').trim();
    return city.length >= 3 && city.length <= 48 && !LOCATION_PROSE.test(city);
  });
}

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?`;
const AMOUNT = String.raw`\$\s*${NUMBER}`;
const RANGE = new RegExp(String.raw`${AMOUNT}(?:\s*[-–—]\s*\$?\s*${NUMBER})?(?:\s*(?:/|per)\s*(?:hour|hr|year|yr|month|mo|week|day)|\s*(?:hourly|annual|yearly|bi[- ]weekly|biweekly))?`, 'gi');

/** Recover only obvious source text for the pending listing sidebar. */
export function extractPendingMetadata(title: string | null | undefined, rawText: string): PendingMetadata {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  let salaryText: string | null = null;
  for (const match of normalized.matchAll(RANGE)) {
    const value = match[0].replace(/\s+/g, ' ').trim();
    const start = match.index ?? 0;
    const context = normalized.slice(Math.max(0, start - 100), start + value.length + 100);
    if (/salary|wage|pay|rate|compensation|hourly|annual|per hour|per year/i.test(context)) {
      salaryText = value;
      break;
    }
  }

  const titleAndText = `${title ?? ''}\n${rawText}`;
  const isStudent = /\b(?:student|co[- ]?op|intern(?:ship)?)\b/i.test(title ?? '')
    || /\b(?:student|co[- ]?op|intern(?:ship)?)\s+(?:position|role|job|employment|placement|program|opportunity)\b/i.test(titleAndText)
    || /\b(?:position|role|job)\s+for\s+(?:a\s+)?student\b/i.test(titleAndText)
    ? 1
    : null;

  const workdayLocation = normalized.match(/\b(?:apply\s*)?locations(?=[A-Z0-9])\s*(.+?)(?=(?:remote\s*type|time\s*type|posted\s*on|job\s*requisition|category\s*type|position\s*type|college\/administrative|faculty\/department|job\s*schedule|about\s+the\s+job)(?:\b|[A-Z0-9]|\s|$)|$)/i)?.[1] ?? '';
  const locationCandidate = (workdayLocation.split(/\s+-\s+/).pop() ?? workdayLocation)
    .replace(/\s+campus\b/i, '')
    .trim();
  const cityProvince = locationCandidate.match(/([A-Za-z][A-Za-z .'-]+,\s*(?:ON|QC|NS|NB|MB|SK|AB|BC|PE|NL|NT|NU|YT|Canada|Ontario|Quebec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland and Labrador|Prince Edward Island|Northwest Territories|Nunavut|Yukon)(?:,\s*Canada)?)/i)?.[1] ?? '';
  const locationCandidateValue = normalizeLocation(cityProvince || locationCandidate) || extractLabeledLocation(rawText) || null;
  const location = isUsablePendingLocation(locationCandidateValue) ? locationCandidateValue : null;

  return location
    ? { salaryText, isStudent, duration: extractTitleDuration(title), location }
    : { salaryText, isStudent, duration: extractTitleDuration(title) };
}
