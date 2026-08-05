import { normalizePostedDate } from './posted-date';

const WEEKDAY = '(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const DATE_VALUE = `(?:${WEEKDAY},?\\s+)?(?:[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`;
const CLOSING_LABEL = new RegExp(
  `(?:posting\\s+end\\s+date|closing\\s+date|application\\s+deadline|deadline(?:\\s+expires)?|(?<!job\\s)end\\s+date)\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'gi',
);

export function extractClosingDate(rawText: string): string | null {
  for (const match of rawText.matchAll(CLOSING_LABEL)) {
    const value = match[1];
    const normalized = normalizePostedDate(value)
      || normalizePostedDate(`${value}, ${new Date().getUTCFullYear()}`);
    if (normalized) return normalized;
  }
  return null;
}
