import { normalizePostedDate } from './posted-date';

const WEEKDAY = '(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const MONTH_DAY_YEAR = `(?:${WEEKDAY},?\\s+)?[A-Za-z]{3,9}\\s+\\d{1,2},?\\s*\\d{2,4}`;
const ISO_LIKE = '\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}';
const MDY = '\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}';
const DATE_VALUE = `(?:${MONTH_DAY_YEAR}|${ISO_LIKE}|${MDY})`;

const SEASON = '(?:Fall|Winter|Spring|Summer)(?:\\s+Semester)?';
const MONTH_NAME = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)';

// Labels that introduce a job start date (not "prior to start date" noise).
const START_DATE_LABEL = new RegExp(
  `(?:expected\\s+start\\s+date|anticipated\\s+start\\s+date|target\\s+start\\s+date|`
  + `position\\s+start\\s+date|employment\\s+start\\s+date|work\\s+start\\s+date|`
  + `starting\\s+date|commencement\\s+date|start\\s+date)`
  + `\\s*[:\\-]?\\s*`,
  'i',
);

// "start date is July 1, 2027" prose form.
const START_DATE_IS = new RegExp(
  `\\bstart\\s+date\\s+is\\s+(${DATE_VALUE}|${SEASON}\\s+\\d{4}|${MONTH_NAME},?\\s+\\d{4}|immediate)`,
  'i',
);

const FUZZY_VALUE = new RegExp(
  `^(?:immediate|asap|${SEASON}\\s+\\d{4}|${MONTH_NAME},?\\s+\\d{4}|${DATE_VALUE})`,
  'i',
);

const NOISE_BEFORE = /\b(?:prior\s+to|before|after|from\s+the|automatic|provide|cover\s+letter|resume|and\s+end\s+date)\b/i;

function titleCaseSeasonOrMonth(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w+/g, word => {
      if (/^\d{4}$/.test(word)) return word;
      if (/^asap$/i.test(word)) return 'ASAP';
      if (/^immediate$/i.test(word)) return 'Immediate';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .replace(/\bFall Semester\b/i, 'Fall')
    .replace(/\bWinter Semester\b/i, 'Winter')
    .replace(/\bSpring Semester\b/i, 'Spring')
    .replace(/\bSummer Semester\b/i, 'Summer');
}

/**
 * Normalize a start-date capture to either ISO (YYYY-MM-DD) when a full calendar
 * date is present, or a short display string (Immediate, Fall 2026, October 2026).
 */
export function normalizeStartDate(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  if (/^immediate$/i.test(text) || /^asap$/i.test(text)) return 'Immediate';

  const season = text.match(new RegExp(`^(${SEASON})\\s+(\\d{4})$`, 'i'));
  if (season) {
    const seasonName = season[1].replace(/\s+Semester/i, '');
    return `${titleCaseSeasonOrMonth(seasonName)} ${season[2]}`;
  }

  const monthYear = text.match(new RegExp(`^(${MONTH_NAME}),?\\s+(\\d{4})$`, 'i'));
  if (monthYear) {
    return `${titleCaseSeasonOrMonth(monthYear[1])} ${monthYear[2]}`;
  }

  // Start dates can be a couple years out (academic appointments).
  return normalizePostedDate(text, { maxYearsAhead: 3 });
}

function captureAfterLabel(rawText: string, labelIndex: number, labelLength: number): string | null {
  let after = rawText.slice(labelIndex + labelLength, labelIndex + labelLength + 100);
  // "expected start date will be January, 2027"
  after = after.replace(/^\s*(?:will\s+be|is|of|:|-)\s*/i, '');
  // Empty label then another field ("Start Date: End Date:")
  if (/^(?:end\s+date|length\s+of|job\s+type|work\s+end|posting|number\s+of|pay\s+range|$)/i.test(after)) {
    return null;
  }
  const fuzzy = after.match(FUZZY_VALUE);
  if (!fuzzy) return null;
  return fuzzy[0];
}

export function extractStartDate(rawText: string): string | null {
  if (!rawText) return null;

  // Prose: "start date is July 1, 2027 or later"
  const prose = rawText.match(START_DATE_IS);
  if (prose) {
    const normalized = normalizeStartDate(prose[1]);
    if (normalized) return normalized;
  }

  const labelGlobal = new RegExp(START_DATE_LABEL.source, 'gi');
  for (const match of rawText.matchAll(labelGlobal)) {
    const full = match[0];
    const index = match.index ?? 0;
    // Reject "prior to start date" / cover-letter boilerplate around the label.
    const windowStart = Math.max(0, index - 40);
    const context = rawText.slice(windowStart, index + full.length + 20);
    if (NOISE_BEFORE.test(context) && !/expected|anticipated|target|position|employment|work\s+start/i.test(full)) {
      // Bare "start date" after noise words is usually not the role start.
      if (/^\s*start\s+date/i.test(full)) continue;
    }

    const captured = captureAfterLabel(rawText, index, full.length);
    if (!captured) continue;
    const normalized = normalizeStartDate(captured);
    if (normalized) return normalized;
  }

  return null;
}
