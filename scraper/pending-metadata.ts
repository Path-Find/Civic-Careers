import { normalizeDuration } from './duration';

export type PendingMetadata = {
  salaryText: string | null;
  isStudent: number | null;
  duration: string | null;
};

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?`;
const AMOUNT = String.raw`\$\s*${NUMBER}`;
const RANGE = new RegExp(String.raw`${AMOUNT}(?:\s*[-–—]\s*\$?\s*${NUMBER})?(?:\s*(?:/|per)\s*(?:hour|hr|year|yr|month|mo|week|day)|\s*(?:hourly|annual|yearly))?`, 'gi');
const DATE = String.raw`(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4})`;
const PERIOD = String.raw`(?:${DATE}|[A-Za-z]{3,9}\s+\d{4})`;
const MONTH_DAY = String.raw`[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?`;

function extractPendingDuration(rawText: string): string | null {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const candidates: string[] = [];

  // Preserve both dates when a source provides an explicit start/end range.
  const ranges = [
    new RegExp(String.raw`(?:anticipated\s+)?start\s+and\s+end\s+dates?\s*[:\-]?\s*(${PERIOD}\s*(?:to|through|until|[-–—])\s*${PERIOD})`, 'gi'),
    new RegExp(String.raw`(?:job|work)\s+start\s+date\s*[:\-]?\s*(${DATE})[\s\S]{0,80}?end\s+date\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bstart\s+date\s*[:\-]?\s*(${DATE})[\s\S]{0,80}?\bend\s+date\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\b(?:sessional|seasonal\s+position)\s+dates?\s*[:\-]?\s*(${PERIOD}\s*(?:to|through|until|[-–—])\s*${PERIOD})`, 'gi'),
    new RegExp(String.raw`\bseasonal\s+position\s+from\s+(${PERIOD})\s*(?:to|through|until|[-–—])\s*(${PERIOD})`, 'gi'),
    new RegExp(String.raw`\bdates?\s*[:\-]?\s*(${DATE}\s*(?:to|through|until|[-–—])\s*${DATE})`, 'gi'),
    new RegExp(String.raw`\bdates?\s*[:\-]?\s*(${MONTH_DAY})\s*(?:to|through|until|[-–—])\s*(${MONTH_DAY})\s+(20\d{2})`, 'gi'),
  ];
  for (const pattern of ranges) {
    for (const match of normalized.matchAll(pattern)) {
      const range = match[3]
        ? `${match[1]} ${match[3]} to ${match[2]} ${match[3]}`
        : match[2] && !match[1].includes(' to ') && !match[1].includes(' through ')
          ? `${match[1]} to ${match[2]}`
          : match[1];
      const duration = normalizeDuration(range.replace(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/g, '$1-$2-$3'));
      if (duration) candidates.push(duration);
    }
  }

  // Do not downgrade a complete range to the same posting's end-only value.
  if (candidates.length) {
    const unique = [...new Set(candidates)];
    return unique.length === 1 ? unique[0] : null;
  }

  // End-only labels are intentionally narrow so posting/application deadlines
  // such as "Post End Date" are not mistaken for job end dates.
  const endLabels = [
    new RegExp(String.raw`\b(?:job|work)\s+end\s+date\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\b(?:anticipated|expected|contract)\s+end\s+date\s*(?:is|of|:|-)\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bterm\s+ending\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bterm\s+position\s+length\s*[:\-]?\s*(?:until\s+)?(${DATE})`, 'gi'),
  ];
  for (const pattern of endLabels) {
    for (const match of normalized.matchAll(pattern)) {
      const duration = normalizeDuration(`End Date ${match[1]}`);
      if (duration) candidates.push(duration);
    }
  }

  // A single posting can advertise multiple temporary positions with
  // different end dates. Do not show one of those dates as if it applied to
  // the whole posting.
  const positionUntil = [...normalized.matchAll(
    /\b(?:position|employment opportunity|appointment|role)[^.]{0,140}?\buntil\s+/gi,
  )];
  if (positionUntil.length === 1) {
    const match = normalized.slice(positionUntil[0].index ?? 0).match(
      new RegExp(String.raw`\buntil\s+(${DATE})`, 'i'),
    );
    if (match) {
      const duration = normalizeDuration(`End Date ${match[1]}`);
      if (duration) candidates.push(duration);
    }
  }

  const unique = [...new Set(candidates)];
  return unique.length === 1 ? unique[0] : null;
}

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

  return { salaryText, isStudent, duration: extractPendingDuration(rawText) };
}
