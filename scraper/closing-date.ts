import { normalizePostedDate } from './posted-date';

const WEEKDAY = '(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const DATE_VALUE = `(?:${WEEKDAY},?\\s+)?(?:[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{4}\\s*[/-]\\s*\\d{1,2}\\s*[/-]\\s*\\d{1,2}|\\d{1,2}\\s*[/-]\\s*\\d{1,2}\\s*[/-]\\s*\\d{2,4}|\\d{1,2}[-/][A-Za-z]{3,9}[-/]\\d{2,4})`;
const CLOSING_LABEL = new RegExp(
  `(?:posting\\s+end\\s+date|post\\s+end\\s+date|posting\\s+closing\\s+date|external\\s+closing\\s+date|job\\s+closing\\s+date(?:\\s*\\([^)]*\\))?|closing\\s+date(?:\\s*\\([^)]*\\))?|close\\s+date|closing\\s+deadline|application\\s+deadline|apply\\s+by|please\\s+apply\\s+by|last\\s+(?:date|day)\\s+to\\s+apply|posting\\s+close(?:s|d)?|deadline(?:\\s+to\\s+apply|\\s+expires)?\\s*[:\\-]?|applications?\\s+must\\s+be\\s+received(?:\\s+by)?|\\|\\s*expires?)\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'gi',
);

const CONTEXTUAL_CLOSING = [
  new RegExp(`(?:close|closing)\\s+date[\\s\\S]{0,160}?\\bon\\s+(${DATE_VALUE})`, 'gi'),
  new RegExp(`closing\\s+date\\s+(?:of|:)?\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`apply(?:\\s+online)?[\\s\\S]{0,100}?\\bby\\s+(${DATE_VALUE})`, 'gi'),
  new RegExp(`apply\\s+by[\\s\\S]{0,160}?\\bon\\s+(${DATE_VALUE})`, 'gi'),
];

const WORKDAY_APPLY_END = new RegExp(
  `time\\s+left\\s+to\\s+apply[\\s\\S]{0,100}?end\\s+date\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'gi',
);

function normalizeClosingValue(value: string): string | null {
  const cleaned = value.replace(/\s*([/-])\s*/g, '$1').trim();
  return normalizePostedDate(cleaned, { maxYearsAhead: 5 })
    || normalizePostedDate(`${cleaned}, ${new Date().getUTCFullYear()}`, { maxYearsAhead: 5 });
}

export function extractClosingDate(rawText: string): string | null {
  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
  for (const match of text.matchAll(CLOSING_LABEL)) {
    const value = match[1];
    const normalized = normalizeClosingValue(value);
    if (normalized) return normalized;
  }
  for (const pattern of CONTEXTUAL_CLOSING) {
    for (const match of text.matchAll(pattern)) {
      const normalized = normalizeClosingValue(match[1]);
      if (normalized) return normalized;
    }
  }
  for (const match of text.matchAll(WORKDAY_APPLY_END)) {
    const normalized = normalizeClosingValue(match[1]);
    if (normalized) return normalized;
  }
  return null;
}
