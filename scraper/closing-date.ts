import { normalizePostedDate } from './posted-date';

const WEEKDAY = '(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const DATE_VALUE = `(?:${WEEKDAY},?\\s+)?(?:[A-Za-z]{3,9}\\s*,?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}|[A-Za-z]{3,9}\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{4}\\s*[/-]\\s*\\d{1,2}\\s*[/-]\\s*\\d{1,2}|\\d{1,2}\\s*[/-]\\s*\\d{1,2}\\s*[/-]\\s*\\d{2,4}|\\d{1,2}[-/][A-Za-z]{3,9}[-/]\\d{2,4})`;
const CLOSING_LABEL = new RegExp(
  `(?:posting\\s+end\\s+date|post\\s+end\\s+date|posting\\s+closing\\s+date|external\\s+closing\\s+date|job\\s+closing\\s+date(?:\\s*\\([^)]*\\))?|closing\\s+date(?:\\s+(?:internal|external))?(?:\\s*\\([^)]*\\))?|close\\s+date|closing\\s+deadline|application\\s+deadline|apply\\s+by|apply\\s+before|please\\s+apply\\s+by|last\\s+(?:date|day)\\s+to\\s+apply|posting\\s+close(?:s|d)?|deadline(?:\\s+to\\s+apply|\\s+expires)?\\s*[:\\-]?|applications?\\s+must\\s+be\\s+received(?:\\s+by)?|\\|\\s*expires?)\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'gi',
);

const PARENTHESIZED_CLOSING = new RegExp(
  `job\\s+closing\\s+date\\s*\\(\\s*(${DATE_VALUE})\\s*\\)`,
  'gi',
);

const APPLICATION_CLOSE_LABEL = new RegExp(
  'application\\s+close(?:s|d)?\\s*[:\\-]?\\s*(' + DATE_VALUE + ')',
  'gi',
);
const ABBREVIATED_DATE_VALUE = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\.\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{2,4}';
const ABBREVIATED_CLOSING_LABEL = new RegExp(
  '(?:application\\s+close(?:s|d)?|deadline(?:\\s+to\\s+apply)?|closing\\s+date|close\\s+date)\\s*[:\\-]?\\s*(' + ABBREVIATED_DATE_VALUE + ')',
  'gi',
);
const SUBMIT_APPLICATION_BY = new RegExp(
  '(?:submit|send)\\s+(?:(?:your|their|our|an?|the)\\s+)?(?:application|resume|submission)[\\s\\S]{0,100}?\\bby\\b\\s*(' + DATE_VALUE + ')',
  'gi',
);
const EXPIRES_LABEL = new RegExp(
  'expires?(?:\\s+on)?\\s*[:\\-]?\\s*(' + DATE_VALUE + ')',
  'gi',
);

const CONTEXTUAL_CLOSING = [
  new RegExp(`posting\\s+(?:start\\s+date\\s*[/]\\s*)?posting\\s+end\\s+date[\\s\\S]{0,80}?\\b(?:to|through)\\s+(${DATE_VALUE})`, 'gi'),
  new RegExp(`(?:close|closing)\\s+date[\\s\\S]{0,160}?\\bon\\s+(${DATE_VALUE})`, 'gi'),
  new RegExp(`closing\\s+date\\s+(?:of|:)?\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`(?:application\\s+)?deadline(?:\\s+(?:for|to\\s+apply))?[\\s\\S]{0,100}?\\b(?:is|on|by|of)\\b\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`(?:applications?|resumes?|submissions?)\\s+(?:must\\s+be\\s+)?(?:received|submitted|sent)\\s+(?:by|before)\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`(?:submit|send)\\s+(?:your\\s+)?(?:application|resume|submission)[\\s\\S]{0,100}?\\bby\\b\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`(?:posting|position|competition|job(?:\\s+competition)?)\\s+(?:will\\s+)?(?:close|end|expire)(?:s|d)?[\\s\\S]{0,120}?\\b(?:on|by)\\b\\s*(${DATE_VALUE})`, 'gi'),
  new RegExp(`apply(?:\\s+online)?[\\s\\S]{0,100}?\\bby\\s+(${DATE_VALUE})`, 'gi'),
  new RegExp(`apply\\s+by[\\s\\S]{0,160}?\\bon\\s+(${DATE_VALUE})`, 'gi'),
];

const WORKDAY_APPLY_END = new RegExp(
  `time\\s+left\\s+to\\s+apply[\\s\\S]{0,100}?end\\s+date\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'gi',
);

export type ClosingDateStatus = 'known' | 'not_checked' | 'not_listed' | 'open_until_filled' | 'invalid';

const OPEN_UNTIL_FILLED = new RegExp([
  `\\bposting\\s+(?:start\\s+date\\s*[/]\\s*)?posting\\s+end\\s+date\\s*[:\\-]?\\s*ongoing\\b`,
  `\\b(?:closing|external|job|posting)\\s+date\\s*[:\\-]?\\s*(?:ongoing(?=\\b|to\\s+apply)|open\\s+until\\s+filled(?=\\b|to\\s+apply))`,
  `\\b(?:open|ongoing|accepting applications?|applications?\\s+(?:are\\s+)?accepted|(?:will\\s+)?remain\\s+open)\\s+(?:until|through)\\s+(?:(?:all\\s+)?positions?\\s+(?:are|is)\\s+|(?:the\\s+)?position\\s+(?:is|has\\s+been)\\s+|it\\s+(?:is|has\\s+been)\\s+)?filled(?=\\b|job\\s+description|to\\s+apply)`,
  `\\buntil\\s+(?:(?:all\\s+)?positions?\\s+(?:are|is)\\s+|(?:the\\s+)?position\\s+(?:is|has\\s+been)\\s+|it\\s+(?:is|has\\s+been)\\s+)?filled(?=\\b|job\\s+description|to\\s+apply)`,
  `\\b(?:open|ongoing)\\s+until\\s+(?:a\\s+)?suitable\\s+candidate\\s+found\\b`,
  `\\b(?:open|ongoing)\\s+until\\s+suitable\\s+candidate\\s+found\\b`,
].join('|'), 'i');
const OPEN_EXPLICIT_VARIANT = /\b(?:open|ongoing)\s+(?:until|till|through)\s+(?:(?:all\s+)?(?:positions?|vacancies?|roles?|jobs?)\s+(?:are|is)\s+)?filled(?=\b|[A-Z]|to\s+apply)/i;
const NO_DEADLINE = /\b(?:no|without)\s+(?:application\s+)?(?:closing\s+)?deadline\b|\b(?:no|without)\s+(?:closing|application)\s+date\b|\bdeadline\s+(?:is\s+)?(?:not\s+(?:listed|specified)|unavailable)\b|\bno\s+deadline\s+listed\b|\b(?:external|job|posting)?\s*closing\s+date(?:\s*\([^)]*\))?\s*:?\s*(?=(?:job\s+description|application\s+posted|pcc#|openings|back|share|apply\s+now|all\s+qualified\s+candidates|experience\s+the|take\s+on|imagine|days\s+of\s+work|standard\s+hours))/i;
const INVALID_CLOSING_VALUE = /(?:posting\s+(?:end|closing)\s+date|external\s+closing\s+date|job\s+closing\s+date|closing\s+date|close\s+date|closing\s+deadline|application\s+deadline|apply\s+(?:by|before)|last\s+(?:date|day)\s+to\s+apply|posting\s+close(?:s|d)?|deadline(?:\s+to\s+apply|\s+expires)?|applications?\s+must\s+be\s+received)\b\s*[:\-]\s*(?:tbd|n\/?a|not\s+(?:available|listed|specified)|none|unknown|[-–—])/i;
const INVALID_CLOSING_DATE = /(?:posting\s+(?:end|closing)\s+date|external\s+closing\s+date|job\s+closing\s+date|closing\s+date|close\s+date|closing\s+deadline|application\s+deadline|apply\s+(?:by|before)|last\s+(?:date|day)\s+to\s+apply|posting\s+close(?:s|d)?|deadline(?:\s+to\s+apply|\s+expires)?|applications?\s+must\s+be\s+received)\b(?:\s*\([^)]*\))?\s*[:\-]\s*\d{2,6}\s*[/-]\s*\d{1,2}\s*[/-]\s*\d{1,4}\b/i;

function normalizeClosingValue(value: string): string | null {
  const cleaned = value.replace(/\s*([/-])\s*/g, '$1').replace(/^([A-Za-z]{3,9})\.([,\s])/, '$1$2').replace(/^([A-Za-z]{3,9}),\s+/, '$1 ').trim();
  return normalizePostedDate(cleaned, { maxYearsAhead: 5 })
    || normalizePostedDate(`${cleaned}, ${new Date().getUTCFullYear()}`, { maxYearsAhead: 5 });
}

export function extractClosingDate(rawText: string): string | null {
  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ');
  for (const match of text.matchAll(PARENTHESIZED_CLOSING)) {
    const normalized = normalizeClosingValue(match[1]);
    if (normalized) return normalized;
  }
  for (const match of text.matchAll(CLOSING_LABEL)) {
    const value = match[1];
    const normalized = normalizeClosingValue(value);
    if (normalized) return normalized;
  }
  for (const match of text.matchAll(APPLICATION_CLOSE_LABEL)) {
    const normalized = normalizeClosingValue(match[1]);
    if (normalized) return normalized;
  }
  for (const match of text.matchAll(ABBREVIATED_CLOSING_LABEL)) {
    const normalized = normalizeClosingValue(match[1]);
    if (normalized) return normalized;
  }
  for (const match of text.matchAll(SUBMIT_APPLICATION_BY)) {
    const normalized = normalizeClosingValue(match[1]);
    if (normalized) return normalized;
  }
  for (const match of text.matchAll(EXPIRES_LABEL)) {
    const normalized = normalizeClosingValue(match[1]);
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

export function extractClosingDateStatus(rawText: string): { date: string | null; status: ClosingDateStatus } {
  const date = extractClosingDate(rawText);
  if (date) return { date, status: 'known' };

  const text = rawText.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return { date: null, status: 'not_checked' };
  if (OPEN_UNTIL_FILLED.test(text) || OPEN_EXPLICIT_VARIANT.test(text)) return { date: null, status: 'open_until_filled' };
  if (NO_DEADLINE.test(text)) return { date: null, status: 'not_listed' };
  if (INVALID_CLOSING_VALUE.test(text) || INVALID_CLOSING_DATE.test(text)) return { date: null, status: 'invalid' };
  return { date: null, status: 'not_checked' };
}
