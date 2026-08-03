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

const DATE_VALUE = '(?:[A-Za-z]{3,9}\\s+\\d{1,2},?\\s*\\d{4}|\\d{4}[/-]\\d{1,2}[/-]\\d{1,2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})';
const POSTED_DATE_LABEL = new RegExp(
  `(?:date\\s+posted|posting\\s+date)(?:\\s*\\([^)]*\\))?\\s*[:\\-]?\\s*(${DATE_VALUE})`,
  'i',
);

function toIsoDate(year: number, month: number, day: number): string | null {
  const nowYear = new Date().getUTCFullYear();
  if (year < 2000 || year > nowYear + 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function normalizePostedDate(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})/);
  if (match) return toIsoDate(Number(match[3]), MONTHS[match[1].toLowerCase()], Number(match[2]));

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) return toIsoDate(Number(match[3]), Number(match[1]), Number(match[2]));

  return null;
}

export function extractPostedDate(rawText: string): string | null {
  const match = rawText.match(POSTED_DATE_LABEL);
  return normalizePostedDate(match?.[1]);
}
