import { normalizeDuration } from './duration';

export type PendingMetadata = {
  salaryText: string | null;
  isStudent: number | null;
  duration: string | null;
};

const NUMBER = String.raw`\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?`;
const AMOUNT = String.raw`\$\s*${NUMBER}`;
const RANGE = new RegExp(String.raw`${AMOUNT}(?:\s*[-–—]\s*\$?\s*${NUMBER})?(?:\s*(?:/|per)\s*(?:hour|hr|year|yr|month|mo|week|day)|\s*(?:hourly|annual|yearly))?`, 'gi');
const DATE = String.raw`(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|[A-Za-zÀ-ÿ]{3,12}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-zÀ-ÿ]{3,12},?\s+\d{4})`;
const PERIOD = String.raw`(?:${DATE}|[A-Za-zÀ-ÿ]{3,12}\s+\d{4})`;
const MONTH_DAY = String.raw`[A-Za-zÀ-ÿ]{3,12}\s+\d{1,2}(?:st|nd|rd|th)?`;
const MONTH_YEAR = String.raw`(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Sept\.?|Oct\.?|Nov\.?|Dec\.?)\s+20\d{2}`;
const MONTH_NUMBERS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10,
  oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function monthYearValue(value: string): number | null {
  const match = value.match(/^([A-Za-zÀ-ÿ]+)\.?\s+(20\d{2})$/);
  if (!match) return null;
  const month = MONTH_NUMBERS[match[1].toLowerCase()];
  return month ? Number(match[2]) * 12 + month : null;
}

function extractPendingDuration(rawText: string): string | null {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (/\bposition\s+end\s+date\b[\s\S]{0,500}\bapplies\s+only\s+to\s+the\s+temporary\s+term\s+position\b/i.test(normalized)
    && /\bcontinuing\s+(?:role|position)\b/i.test(normalized)) {
    return null;
  }
  const candidates: string[] = [];

  // Preserve both dates when a source provides an explicit start/end range.
  const ranges = [
    new RegExp(String.raw`(?:anticipated\s+)?start\s+and\s+end\s+dates?\s*[:\-]?\s*(${PERIOD}\s*(?:to|through|until|[-–—])\s*${PERIOD})`, 'gi'),
    new RegExp(String.raw`anticipated\s+start\s+date\s*(?:is|of|:|-)\s*(${DATE})[\s\S]{0,80}?\bend\s+date\s*(?:is|of|:|-)\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`(?:job|work)\s+start\s+date\s*[:\-]?\s*(${DATE})[\s\S]{0,80}?end\s+date(?:\s*\([^)]*\))?\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bstart\s+date\s*[:\-]?\s*(${DATE})[\s\S]{0,80}?\bend\s+date(?:\s*\([^)]*\))?\s*[:\-]?\s*(${DATE})`, 'gi'),
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

  const monthEndPatterns = [
    new RegExp(String.raw`\b(?:term|temporary|contract)\b[^.!?]{0,100}?\buntil\s+(?!\d{1,2}\s+)(${MONTH_YEAR})`, 'gi'),
    new RegExp(String.raw`\b(?:term|temporary|contract)\b[^.!?]{0,100}?\b(?:ending|concluding|conclude)(?:\s+in)?\s+(?!\d{1,2}\s+)(${MONTH_YEAR})`, 'gi'),
    new RegExp(String.raw`\b(?:term|temporary|contract)\b[^.!?]{0,100}?\b(?:expires?\s+(?:on|in)|ends?\s+on|end\s+on)\s+(?!\d{1,2}\s+)(${MONTH_YEAR})`, 'gi'),
  ];
  const monthEndMatches: string[] = [];
  for (const sentence of normalized.split(/[.!?]+/)) {
    for (const pattern of monthEndPatterns) {
      for (const match of sentence.matchAll(pattern)) monthEndMatches.push(match[1]);
    }
  }
  const fullTermEndMarker = new RegExp(
    String.raw`\b(?:term|temporary|contract)\b[^.!?]{0,100}?\b(?:until|ending|concluding|conclude|ends?\s+on|end\s+on|expires?\s+(?:on|in))\s+(?:in\s+)?${DATE}`,
    'i',
  );
  const impossibleMonthRange = /\banticipated\s+start\s+date\s+in\s+([A-Za-zÀ-ÿ]+\s+20\d{2})[^.!?]{0,100}?\bconclud(?:e|ing)\s+in\s+([A-Za-zÀ-ÿ]+\s+20\d{2})/i;
  const impossible = normalized.match(impossibleMonthRange);
  const impossibleRange = impossible
    && monthYearValue(impossible[1]) !== null
    && monthYearValue(impossible[2]) !== null
    && monthYearValue(impossible[2])! < monthYearValue(impossible[1])!;
  if (monthEndMatches.length === 1 && !fullTermEndMarker.test(normalized)
    && !impossibleRange) {
    const duration = normalizeDuration(`Term ending ${monthEndMatches[0]}`);
    if (duration) candidates.push(duration);
  }

  // Do not downgrade a complete range to the same posting's end-only value.
  if (candidates.length) {
    const unique = [...new Set(candidates)];
    return unique.length === 1 ? unique[0] : null;
  }

  // End-only labels are intentionally narrow so posting/application deadlines
  // such as "Post End Date" are not mistaken for job end dates.
  const endLabels = [
    new RegExp(String.raw`\b(?:job|work)\s+end\s+date(?:\s*\([^)]*\))?\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\b(?:anticipated|expected|contract|projected)\s+end\s+date\s*(?:is|of|:|-)\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bterm\s+ending\s*[:\-]?\s*(${DATE})`, 'gi'),
    new RegExp(String.raw`\bterm\s+position\s+length\s*[:\-]?\s*(?:until\s+)?(${DATE})`, 'gi'),
    new RegExp(String.raw`\b(?:term|temporary|contract|position)\b[^.]{0,140}?\b(?:ending|ends?\s+on|end\s+on)\s+(${DATE})`, 'gi'),
  ];
  const positionEndDateIsScoped = /\bposition\s+end\s+date\b[\s\S]{0,500}\bapplies\s+only\s+to\s+the\s+temporary\s+term\s+position\b/i.test(normalized)
    && /\bcontinuing\s+(?:role|position)\b/i.test(normalized);
  if (!positionEndDateIsScoped) {
    endLabels.unshift(
      new RegExp(String.raw`\bposition\s+end\s+date(?:\s*\([^)]*\))?\s*[:\-]?\s*(${DATE})`, 'gi'),
    );
  }
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

  const temporaryUntilMatches = [...normalized.matchAll(
    /\b(?:temporary|contract|term)\b[^.]{0,140}?\buntil\s+/gi,
  )];
  if (temporaryUntilMatches.length === 1) {
    const match = temporaryUntilMatches[0];
    const text = normalized.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 80);
    if (!/\bpossible\s+until\b/i.test(text)) {
      const date = text.match(new RegExp(String.raw`\buntil\s+(${DATE})`, 'i'));
      const duration = date ? normalizeDuration(`End Date ${date[1]}`) : null;
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
