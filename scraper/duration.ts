/**
 * Canonical job_details.duration values (single free-text column, constrained shapes).
 *
 * Preferred forms:
 *   Permanent | Ongoing | Seasonal | Term
 *   N months | N years | Up to N months | N-month work year
 *   YYYY-MM-DD to YYYY-MM-DD
 *   Term ending YYYY-MM-DD (when only the end date is known)
 *   Fall|Winter|Spring|Summer YYYY  (academic term labels)
 *
 * Prefer empty over inventing. Employment-type words alone (Contract, Temporary)
 * without a length become Term.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
  janvier: 1,
  février: 2, fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8, aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12, decembre: 12,
};
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(y: number, m: number, d: number): string | null {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Basic validity
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Parse a single date token into YYYY-MM-DD */
function parseOneDate(raw: string, dayFirst = false): string | null {
  const s = raw.trim();
  if (!s) return null;

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);

  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return iso(+m[1], +m[2], +m[3]);

  // MM-DD-YYYY or MM/DD/YYYY
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    const first = +m[1];
    const second = +m[2];
    if (dayFirst || first > 12) return iso(+m[3], second, first);
    return iso(+m[3], first, second);
  }

  // Month D, YYYY / Month D YYYY
  m = s.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()];
    if (mon) return iso(+m[3], mon, +m[2]);
  }

  // D Month YYYY
  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-zÀ-ÿ]+),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (mon) return iso(+m[3], mon, +m[1]);
  }

  return null;
}

/** Find a date range and return "YYYY-MM-DD to YYYY-MM-DD" */
function extractDateRange(text: string): string | null {
  const s = text.replace(/\u2013|\u2014/g, '-');

  // ISO pair already
  let m = s.match(
    /(\d{4}-\d{1,2}-\d{1,2})\s*(?:to|-|–|—|through|until)\s*(\d{4}-\d{1,2}-\d{1,2})/i,
  );
  if (m) {
    const a = parseOneDate(m[1]);
    const b = parseOneDate(m[2]);
    if (a && b) return `${a} to ${b}`;
  }

  // MM-DD-YYYY to MM-DD-YYYY
  m = s.match(
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\s*(?:to|-|–|—|through|until)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/i,
  );
  if (m) {
    const first = Number(m[1].split(/[-\/]/)[0]);
    const second = Number(m[2].split(/[-\/]/)[0]);
    const dayFirst = first > 12 || second > 12;
    const a = parseOneDate(m[1], dayFirst);
    const b = parseOneDate(m[2], dayFirst);
    if (a && b) return `${a} to ${b}`;
  }

  // Month D, YYYY to Month D, YYYY
  m = s.match(
    /([A-Za-zÀ-ÿ]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\s*(?:to|-|–|—|through|until)\s*([A-Za-zÀ-ÿ]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i,
  );
  if (m) {
    const a = parseOneDate(m[1]);
    const b = parseOneDate(m[2]);
    if (a && b) return `${a} to ${b}`;
  }

  // Month - Month YYYY (same year): September - December 2026
  m = s.match(
    /\b([A-Za-zÀ-ÿ]+)\s*[-–—]\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})\b/i,
  );
  if (m) {
    const m1 = MONTHS[m[1].toLowerCase()];
    const m2 = MONTHS[m[2].toLowerCase()];
    if (m1 && m2) {
      const a = iso(+m[3], m1, 1);
      // last day of end month approx
      const last = new Date(+m[3], m2, 0).getDate();
      const b = iso(+m[3], m2, last);
      if (a && b) return `${a} to ${b}`;
    }
  }

  // Month YYYY to Month YYYY
  m = s.match(
    /\b([A-Za-zÀ-ÿ]+)\s+(\d{4})\s*(?:to|-|–|—)\s*([A-Za-zÀ-ÿ]+)\s+(\d{4})\b/i,
  );
  if (m) {
    const m1 = MONTHS[m[1].toLowerCase()];
    const m2 = MONTHS[m[3].toLowerCase()];
    if (m1 && m2) {
      const a = iso(+m[2], m1, 1);
      const last = new Date(+m[4], m2, 0).getDate();
      const b = iso(+m[4], m2, last);
      if (a && b) return `${a} to ${b}`;
    }
  }

  return null;
}

function extractLength(text: string): string | null {
  const s = text.replace(/\s+/g, ' ').trim();

  // N-month work year
  let m = s.match(/\b(\d{1,2})\s*[- ]?\s*months?\s+work\s+year\b/i)
    || s.match(/\bwork\s+year:?\s*(\d{1,2})\s*months?\b/i);
  if (m) return `${m[1]}-month work year`;

  // Up to N months / years
  m = s.match(/\bup\s+to\s+(\d{1,3})\s*months?\b/i);
  if (m) return `Up to ${m[1]} months`;
  m = s.match(/\bup\s+to\s+(\d{1,2})\s*years?\b/i);
  if (m) return `Up to ${m[1]} years`;

  // approximately N months
  m = s.match(/\b(?:approximately|approx\.?|about|~)\s*(\d{1,3})\s*months?\b/i);
  if (m) return `${m[1]} months`;

  // N months / N years (not "work year")
  m = s.match(/\b(\d{1,3})\s*months?\b/i);
  if (m && !/work\s+year/i.test(s)) return `${m[1]} months`;
  m = s.match(/\b(\d{1,2})\s*years?\b/i);
  if (m) {
    const n = Number(m[1]);
    return n === 1 ? '1 year' : `${n} years`;
  }
  m = s.match(/\b(\d+)\s*yr\.?s?\b/i);
  if (m) {
    const n = Number(m[1]);
    return n === 1 ? '1 year' : `${n} years`;
  }

  // 1 year
  if (/\bone\s+year\b/i.test(s)) return '1 year';
  if (/\btwo\s+years?\b/i.test(s)) return '2 years';

  return null;
}

function extractEndDate(text: string): string | null {
  const date = text.match(
    /\b(?:job\s+)?end\s+date\s*:?\s*((?:\d{4}[-/]\d{1,2}[-/]\d{1,2})|(?:\d{1,2}[-/]\d{1,2}[-/]\d{4})|(?:[A-Za-zÀ-ÿ]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})|(?:\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-zÀ-ÿ]+,?\s+\d{4}))/i,
  );
  const parsed = date ? parseOneDate(date[1]) : null;
  return parsed ? `Term ending ${parsed}` : null;
}

function extractAcademicTerm(text: string): string | null {
  const s = text.replace(/\s+/g, ' ').trim();

  // Fall 2026 semester / Winter 2027 term / 2026 Fall Semester
  let m = s.match(/\b(Fall|Winter|Spring|Summer)\s+(\d{4})(?:\s+(?:semester|term|session))?\b/i);
  if (m) return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`;

  m = s.match(/\b(\d{4})\s+(Fall|Winter|Spring|Summer)(?:\s+(?:semester|term|session))?\b/i);
  if (m) return `${m[2].charAt(0).toUpperCase()}${m[2].slice(1).toLowerCase()} ${m[1]}`;

  // Fall term (September to December) without year — keep season label only if year-less
  m = s.match(/\b(Fall|Winter|Spring|Summer)\s+term\b/i);
  if (m && !/\d{4}/.test(s)) {
    return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} term`;
  }

  // Fall D2 → Fall term (section codes)
  m = s.match(/\b(Fall|Winter|Spring|Summer)\s+D\d+\b/i);
  if (m) {
    const year = s.match(/\b(20\d{2})\b/);
    if (year) return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} ${year[1]}`;
    return `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} term`;
  }

  return null;
}

function isPermanentKind(s: string): boolean {
  const t = s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (/^(permanent|continuing|indeterminate|regular|continuous|ongoing permanent)(\s|$)/i.test(t)) return true;
  if (/^permanent\b/i.test(t) && !/\bto\b|\d{4}|\d+\s*month/i.test(t)) return true;
  if (/\b(tenure[-\s]?track|tenured)\b/i.test(t) && !/\d{4}/.test(t)) return true;
  if (/^(regular|continuous)\s*(full[-\s]?time|part[-\s]?time)?$/i.test(t)) return true;
  if (/^permanent\s*(full[-\s]?time|part[-\s]?time)?$/i.test(t)) return true;
  if (t === 'continuing' || t === 'indeterminate' || t === 'regular' || t === 'continuous') return true;
  return false;
}

function isOngoingKind(s: string): boolean {
  const t = s.toLowerCase().trim();
  return /^(ongoing|continuous recruitment|standing)\b/i.test(t) || t === 'ongoing';
}

function isSeasonalKind(s: string): boolean {
  return /^seasonal\b/i.test(s.trim()) && !/\d{4}|\d+\s*month/i.test(s);
}

function isGenericTerm(s: string): boolean {
  const t = s.toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  return /^(temporary|contract|casual|term)(\s|$)/i.test(t)
    || /^(temporary|contract|casual)\s*(full[-\s]?time|part[-\s]?time)?$/i.test(t)
    || t === 'temp';
}

/**
 * Normalize free-text duration to a preferred shape, or "" if unusable.
 */
export function normalizeDuration(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  if (!s || /^n\/?a$/i.test(s) || /^none$/i.test(s) || s === '-') return '';

  // Already canonical short tokens
  if (/^Permanent$/i.test(s)) return 'Permanent';
  if (/^Ongoing$/i.test(s)) return 'Ongoing';
  if (/^Seasonal$/i.test(s)) return 'Seasonal';
  if (/^Term$/i.test(s)) return 'Term';
  if (/^\d{1,3} months$/i.test(s)) return s.replace(/months/i, 'months').replace(/^(\d+)/, (_, n) => n);
  if (/^\d{1,2} years?$/i.test(s)) {
    const n = s.match(/^(\d+)/)![1];
    return Number(n) === 1 ? '1 year' : `${n} years`;
  }
  if (/^Up to \d+ months$/i.test(s)) return s.replace(/^up to/i, 'Up to');
  if (/^\d{1,2}-month work year$/i.test(s)) return s.toLowerCase().replace(/^(\d+)/, (_, n) => n).replace('month', 'month');
  if (/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^Term ending \d{4}-\d{2}-\d{2}$/i.test(s)) return `Term ending ${s.slice(-10)}`;
  const monthEnd = s.match(/^Term ending\s+([A-Za-zÀ-ÿ]+)\s+(20\d{2})$/i);
  if (monthEnd) {
    const month = MONTHS[monthEnd[1].toLowerCase()];
    if (month) return `Term ending ${MONTH_NAMES[month - 1]} ${monthEnd[2]}`;
  }

  // Date range wins when present (most informative for term posts)
  const range = extractDateRange(s);
  if (range) return range;

  // A source may provide only the job's end date. Preserve it without
  // confusing it with the application closing date.
  const endDate = extractEndDate(s);
  if (endDate) return endDate;

  // Explicit length
  const length = extractLength(s);
  if (length) return length;

  // Academic terms
  const academic = extractAcademicTerm(s);
  if (academic) return academic;

  // Kind tokens
  if (isPermanentKind(s)) return 'Permanent';
  if (isOngoingKind(s)) return 'Ongoing';
  if (isSeasonalKind(s)) return 'Seasonal';
  if (isGenericTerm(s)) return 'Term';

  // "Term 12 months with possibility of extension" — length already caught
  // Leftover multi-line junk / FTE noise without dates
  if (/\b\d+\.?\d*\s*fte\b/i.test(s) && !range && !length) {
    if (isGenericTerm(s) || /\btemporary\b/i.test(s)) return 'Term';
  }

  // Unparseable free prose — empty rather than store employment fluff
  if (s.length > 80) return '';
  // Short unknown: leave empty (don't invent)
  return '';
}
