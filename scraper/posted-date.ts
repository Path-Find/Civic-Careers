const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const WEEKDAY = '(?:Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:rs(?:day)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
// Month name + day + year, optional weekday prefix (e.g. "Tuesday, January 6, 2026")
const MONTH_DAY_YEAR = `(?:${WEEKDAY},?\\s+)?[A-Za-z]{3,9}\\s+\\d{1,2},?\\s*\\d{2,4}`;
const ISO_LIKE = '\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}';
const MDY = '\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}';
const DATE_VALUE = `(?:${MONTH_DAY_YEAR}|${ISO_LIKE}|${MDY})`;

// Labels that introduce a real calendar posted date (not "Posted 10 Days Ago").
const POSTED_DATE_LABEL = new RegExp(
  `(?:date\\s+posted(?:\\s+by)?|posting\\s+date|posted\\s+on|posted)\\s*(?:\\([^)]*\\))?\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'i',
);

// Relative Workday-style noise that must never win.
const RELATIVE_POSTED = /\bposted\s+(?:on\s+)?posted\s+\d+\+?\s+days?\s+ago\b|\bposted\s+\d+\+?\s+days?\s+ago\b|\bposted\s+yesterday\b|\bposted\s+today\b/i;

function expandTwoDigitYear(year: number): number {
  if (year >= 100) return year;
  // 00–79 → 2000–2079; 80–99 → 1980–1999 (public-sector postings are contemporary).
  return year >= 80 ? 1900 + year : 2000 + year;
}

function toIsoDate(year: number, month: number, day: number, maxYearsAhead = 1): string | null {
  const fullYear = expandTwoDigitYear(year);
  const nowYear = new Date().getUTCFullYear();
  if (fullYear < 2000 || fullYear > nowYear + maxYearsAhead || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (date.getUTCFullYear() !== fullYear || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function normalizePostedDate(
  value: string | null | undefined,
  options: { maxYearsAhead?: number } = {},
): string | null {
  const text = value?.trim();
  if (!text) return null;
  const maxYearsAhead = options.maxYearsAhead ?? 1;

  // Strip leading weekday if present.
  const cleaned = text.replace(new RegExp(`^${WEEKDAY},?\\s+`, 'i'), '').trim();

  let match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]), maxYearsAhead);

  match = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]), maxYearsAhead);

  match = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return null;
    return toIsoDate(Number(match[3]), month, Number(match[2]), maxYearsAhead);
  }

  match = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (match) return toIsoDate(Number(match[3]), Number(match[1]), Number(match[2]), maxYearsAhead);

  return null;
}

export function extractPostedDate(rawText: string): string | null {
  if (!rawText) return null;

  // Prefer explicit calendar labels; scan all matches and take the first valid date
  // so a later "Closing Date" mid-string doesn't poison a good earlier match when
  // the regex is non-global. Use matchAll over a global clone.
  const global = new RegExp(POSTED_DATE_LABEL.source, 'gi');
  for (const match of rawText.matchAll(global)) {
    const full = match[0];
    // Skip relative "Posted 10 Days Ago" / "posted on Posted 10 Days Ago".
    if (RELATIVE_POSTED.test(full) || /\b\d+\+?\s+days?\s+ago\b/i.test(full)) continue;
    const iso = normalizePostedDate(match[1]);
    if (iso) return iso;
  }
  return null;
}
