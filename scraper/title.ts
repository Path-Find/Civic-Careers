/**
 * Clean job titles: strip employment type / duration / inventory noise that
 * already lives in structured fields (employment_type, duration, listing_type).
 *
 * Examples:
 *   "Custodian (Part-Time)" → "Custodian"
 *   "Change Management Lead (Approximately 2-year contract)" → "Change Management Lead"
 *   "Mason/Tile setter - Inventory" → "Mason/Tile setter"
 *   "Temporary Part-Time Dance Instructor - Fall 2026" → "Dance Instructor - Fall 2026"
 *
 * Does not strip bare "Temporary …" (e.g. "Temporary Employment Services (TES), …")
 * so proper names stay intact — only "Temporary Part-Time/Full-Time …".
 */

/** Parenthetical content that is pure employment / duration / listing meta. */
export function isEmploymentOrDurationParen(inner: string): boolean {
  const s = inner.replace(/\s+/g, ' ').trim();
  if (!s) return false;

  if (/^(?:part[-\s]?time|full[-\s]?time|temporary|temp|casual|seasonal|permanent|term|contract|on[-\s]?call|inventory|re[-\s]?post|reaffichage|réaffichage|periodic(?:\s+posting)?|rpt|cpt|prn|fte|sessional)$/i.test(s)) {
    return true;
  }

  // A posting count is metadata, not part of the public role name.
  if (/^\d+\s+positions?$/i.test(s)) return true;
  if (/^several\s+positions?$/i.test(s)) return true;
  if (/^up\s+to\s+\d+$/i.test(s)) return true;

  // "Approximately 2-year contract", "up to 6 months", "18 months"
  if (/^(?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|weeks?|days?)\b(?:\s+(?:contract|term|assignment|position|temporary))?$/i.test(s)) {
    return true;
  }

  // "2 Year Contract", "9 Month Contract", "18-months contract", "1-Year Contract"
  if (/^\d+(?:\.\d+)?\s*[-–—]?\s*(?:year|years|month|months|yr|yrs|mo|mos)\s+(?:contract|term|assignment|position|temporary)?$/i.test(s)) {
    return true;
  }

  // Boards sometimes combine the status and duration in one parenthetical,
  // e.g. "Temporary - Up to 20 mths" or "Contract, up to 18 months".
  if (/^(?:temporary|permanent|contract|term|limited[- ]term)\s*[-,;]?\s*(?:(?:up to|approximately|approx\.?|maximum|max\.?)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|mths?|weeks?|days?)\b/i.test(s)) {
    return true;
  }

  // "fixed-term", "term contract", "contract position"
  if (/^(?:fixed[-\s]?term|term\s+contract|contract\s+position|contract\s+role)$/i.test(s)) {
    return true;
  }

  // Academic and college postings sometimes put assignment metadata in a
  // dated parenthetical, e.g. "Appendix D/Temporary Assignment: ...".
  if (/^(?:appendix\s+[A-Z0-9]+\s*\/\s*)?(?:temporary assignment|temporary|contract|term assignment)\s*:\s*[^)]*\d{4}/i.test(s)) {
    return true;
  }

  if (/^(?:temporary\s+part[-\s]?time|temporary\s+full[-\s]?time|regular\s+part[-\s]?time|regular\s+full[-\s]?time|extended\s+contract\s+full[-\s]?time|part[-\s]?time\s+contract|fixed\s+term\s+contract|limited\s+term\s+contract|acting\/contract)$/i.test(s)) {
    return true;
  }

  // Compound metadata such as "Permanent, On-Call" or
  // "Temporary, up to 6 months".
  const pieces = s.split(/\s*(?:,|;|&)\s*/).filter(Boolean);
  if (pieces.length > 1 && pieces.every(piece => isEmploymentOrDurationPiece(piece))) {
    return true;
  }

  return false;
}

function isEmploymentOrDurationPiece(value: string): boolean {
  const s = value.replace(/\s+/g, ' ').trim();
  return /^(?:part[-\s]?time|full[-\s]?time|temporary|temp|casual|seasonal|permanent|term|contract|continuing|on[-\s]?call|inventory|re[-\s]?post|periodic(?:\s+posting)?|fixed[-\s]?term)$/i.test(s)
    || /^(?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|weeks?|days?)\b(?:\s+(?:contract|term|assignment|position))?$/i.test(s);
}

/** Bargaining-unit codes that belong in union_name, not the title. */
const UNION_CODES = ['CUPE', 'OPSEU', 'USW', 'ONA', 'UNIFOR', 'SEIU', 'PSAC', 'NAPE', 'ATU', 'IAM', 'CAW', 'APTPUO', 'APEUO', 'APTEUO', 'ATPUO'];
const UNION_CODE_ALTERNATION = UNION_CODES.join('|');

/** Parenthetical bargaining-unit markers that already belong in union_name. */
function isUnionMarkerParen(inner: string): boolean {
  return new RegExp(`^(?:${UNION_CODE_ALTERNATION})(?:\\s+\\d+)?$|^unionized$`, 'i').test(inner.replace(/\s+/g, ' ').trim());
}

/** Leading "CUPE - ", "APTPUO - Fall 2026 - ..." style union-code prefixes. */
const UNION_PREFIX_PATTERN = new RegExp(`^\\s*(${UNION_CODE_ALTERNATION})(?:\\s+\\d+)?\\s*[-–—:]\\s*`, 'i');

/** Extract a leading union-code prefix from a title, e.g. "CUPE - Fall 2026 - ..." → "CUPE". */
export function extractUnionFromTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const match = title.match(UNION_PREFIX_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

function stripUnionPrefix(title: string): string {
  return title.replace(UNION_PREFIX_PATTERN, '').trim();
}

const SEASON_WORD = '(?:Fall|Winter|Summer|Spring|Automne|Hiver|Été|Ete|Printemps)';
const TERM_SEGMENT = `${SEASON_WORD}(?:\\s*/\\s*${SEASON_WORD})?\\s+\\d{4}(?:[-/]\\d{2,4})?`;
// Segments can also join as whole season+year units, e.g. "Fall 2026/Winter 2027"
// (as opposed to the season/season-then-year form already in TERM_SEGMENT above).
const TERM_PATTERN = new RegExp(`${TERM_SEGMENT}(?:\\s*[&,/]\\s*${TERM_SEGMENT})*`, 'i');

/** Extract an academic term like "Fall 2026", "Fall/Winter 2026-27", "Fall 2026 & Winter 2027", "Hiver 2027". */
export function extractAcademicTerm(title: string | null | undefined): string | null {
  if (!title) return null;
  const match = title.match(TERM_PATTERN);
  return match ? match[0].trim() : null;
}

function stripAcademicTerm(title: string): string {
  return title.replace(TERM_PATTERN, '').trim();
}

// Department-code + number, e.g. "MBAB 5P11", "CRI100", "KIN8248H", "MGY377H1", "DRC1508-BB00".
// The number can mix digits and letters ("5P11"), not just be all-digits.
const COURSE_CODE_PATTERN = /\b[A-Z]{2,6}\s?\d[A-Z0-9]{2,4}[A-Z0-9.-]*\b/;

// Course-code formats are not interchangeable across academic boards. Keep
// the known formats explicit so a season, requisition ID, or section label is
// not accidentally promoted into academic_course.
const SOURCE_COURSE_CODE_PATTERNS: Record<string, RegExp> = {
  'Brock University': /\b(?:[A-Z]{3}\s?\d{4}|[A-Z]{4}\s\d[A-Z]\d{2})\b/gi,
  'Toronto Metropolitan University': /\b[A-Z]{2,4}\s?\d{3,4}(?:\s*\(\d+\))?\b/gi,
  // Ottawa source slugs also contain union abbreviations followed by years
  // (`APTPUO 2026`); a year is never a course code.
  'University of Ottawa': /\b(?!JR|REQ)[A-Z]{2,6}\s?(?!20\d{2}\b)\d{3,5}[A-Z]?(?:\d{2})?\b/gi,
  // `LEC103` is a section label that often follows the real code, e.g.
  // `STA258H5S LEC103`; do not promote it to academic_course.
  'University of Toronto': /\b(?!LEC\d{3,4}\b)[A-Z]{3,5}\d{3,4}[A-Z0-9]{0,3}\b/gi,
  'York University': /\b[A-Z]{2,5}\s\d{3,4}(?:\s*\/\s*(?:[A-Z]{2,5}\s?)?\d{3,4})?\b/gi,
};

/** Extract a course code from a title, e.g. "Teaching Assistant MBAB 5P11 Fall D" → "MBAB 5P11". */
export function extractAcademicCourseCode(title: string | null | undefined, source?: string | null): string | null {
  if (!title) return null;
  const pattern = source ? SOURCE_COURSE_CODE_PATTERNS[source] ?? COURSE_CODE_PATTERN : COURSE_CODE_PATTERN;
  const match = title.match(pattern);
  return match ? match[0].trim() : null;
}

function stripAcademicCourseCode(title: string, source?: string | null): string {
  const pattern = source ? SOURCE_COURSE_CODE_PATTERNS[source] ?? COURSE_CODE_PATTERN : COURSE_CODE_PATTERN;
  const match = title.match(pattern);
  return match ? title.replace(match[0], '').trim() : title;
}

function stripTrailingConnectorPunctuation(title: string): string {
  return title
    // Stripping a term/course/union match out of the middle of a title can leave
    // behind an empty "()" (e.g. a parenthetical that contained only the term).
    // NOTE: a similar rule that also stripped orphaned "/" characters was tried
    // and reverted — it also matched real, meaningful slashes in ordinary
    // non-academic titles like "Assistant / Associate Professor" or "Parks /
    // Facility Operator", silently deleting a real "either/or" separator. Only
    // touch punctuation classes ([,:;-]) that are never meaningful on their own
    // when doubled up like this.
    .replace(/\(\s*\)/g, '')
    .replace(/\(\s*[:,-]\s*/g, '(')
    // Removing a middle segment ("X - CODE - Y", "X, CODE - Y") leaves its
    // bracketing punctuation adjacent ("X - - Y", "X, - Y") — collapse any run
    // of 2+ connector-punctuation marks, whitespace allowed between them,
    // down to just the first one.
    .replace(/([,:;\-–—])(?:\s*[,:;\-–—])+/g, '$1')
    .replace(/^[\s\-–—,:;]+/, '')
    .replace(/[\s\-–—,:;]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Boards sometimes append a fixed-term contract description to the title
// instead of exposing it as a separate duration field.
const TRAILING_DURATION_METADATA = /\s*[-–—]\s*((?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|mths?|weeks?|days?)(?:\s+(?:contract|term|assignment|position))?(?:\s+with\s+(?:the\s+)?possibility\s+of\s+extension)?|(?:temporary|permanent|contract|term)\s+assignment)\s*$/i;
const TRAILING_VACANCY_METADATA = /\s*[-–—]\s*\d+\s+vacanc(?:y|ies)\s*$/i;
const TRAILING_POSITION_METADATA = /\s*[-–—]\s*\d+\s+positions?\s*$/i;
const TRAILING_SEVERAL_POSITIONS_METADATA = /\s*[-–—]\s*several\s+positions?\s*$/i;
const TRAILING_COUNT_METADATA = /\s*[-–—]\s*up\s+to\s+\d+\s*$/i;
const TRAILING_POOL_METADATA = /\s*[-–—]\s*general\s+application\s+pool\s*$/i;
const TRAILING_PLAIN_POOL_METADATA = /\s*[-–—]\s*pool\s*$/i;
const TRAILING_PIPELINE_METADATA = /\s*[-–—]\s*pipeline\s+posting\s+only\s*$/i;
const TRAILING_MULTIPLICITY_METADATA = /\s+x\s+\d+\s*$/i;

// Course-code extraction only fires for sources that are actually academic institutions.
// The pattern (letters + alphanumeric number) also matches non-academic requisition IDs
// like "JR38550" or "REQ2024-0891" — stripping those from a municipal job title would be
// exactly the kind of silent title-mangling this project spent tonight cleaning up.
const ACADEMIC_SOURCE_PATTERN = /\b(university|college|institut)/i;

/**
 * Pull academic term, union code, and course code out of a title and return
 * the cleaned title alongside them. Generic pattern-based — good enough to
 * unify the common cases; per-source refinement (each university tends to
 * have its own course-code format) is a reasonable follow-up, not required
 * up front. Pass `source` so course-code extraction can be scoped to
 * academic institutions only.
 */
export function extractAndStripAcademicMetadata(
  title: string | null | undefined,
  source?: string | null
): {
  title: string;
  academicTerm: string | null;
  unionName: string | null;
  academicCourse: string | null;
} {
  const original = title ?? '';
  const isAcademicSource = !!source && ACADEMIC_SOURCE_PATTERN.test(source);

  const seasonalTerm = isAcademicSource
    ? original.match(/(?:^|[-–—:,()]\s*)(F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)(?:\s*\))?(?=\s*(?:sessional)?\s*$)/i)?.[1] ?? null
    : null;
  const academicTerm = extractAcademicTerm(original) || seasonalTerm;
  const unionName = extractUnionFromTitle(original);
  const academicCourse = isAcademicSource ? extractAcademicCourseCode(original, source) : null;

  let clean = original;
  clean = stripUnionPrefix(clean);
  clean = stripAcademicTerm(clean);
  if (isAcademicSource && !extractAcademicTerm(original)) {
    clean = clean
      .replace(/\s*[-–—:,()]\s*(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)\s*$/i, '')
      .replace(/\s*\(\s*(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)\s*\)\s*$/i, '')
      .replace(/^(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)\s*[-–—:,()]\s*/i, '')
      .trim();
  }
  if (isAcademicSource) clean = stripAcademicCourseCode(clean, source);
  clean = stripTrailingConnectorPunctuation(clean);

  // A title that strips down to almost nothing (e.g. a bare section code like
  // "AE" once the union/term/course are all pulled out) is a worse title than
  // the original, even though nothing here is technically wrong — keep the
  // original text in that case; the extracted fields still show as badges.
  const MIN_USABLE_TITLE_LENGTH = 4;
  if (clean.trim().length < MIN_USABLE_TITLE_LENGTH) clean = original;

  return { title: clean || original, academicTerm, unionName, academicCourse };
}

/**
 * Normalize a job title for display/storage.
 * Never returns empty when the input had content (falls back to original trimmed).
 */
export function normalizeJobTitle(title: string | null | undefined): string {
  if (title == null) return '';
  const original = String(title).replace(/\s+/g, ' ').trim();
  if (!original) return '';

  let t = original;

  // Workday page-load headers
  if (t.toLowerCase().includes('skip to main content')) {
    const match = t.match(/skip to main content\s*(.+?)\s*page is loaded/i);
    if (match) {
      t = match[1].trim();
    }
  }

  // BambooHR job cards for the City of Hamilton prefix the actual role with
  // the employer's internal posting number.
  t = t.replace(/^job\s+id\s*#?\s*\d+\s*:\s*/i, '').trim();
  t = t.replace(/^job\s+posting\s*[-–—:]\s*/i, '').trim();

  // Meta parentheticals anywhere: (Part-Time), (2 Year Contract), (Casual), …
  t = t.replace(/\s*\(([^)]*)\)/g, (full, inner: string) => (
    isEmploymentOrDurationParen(inner) || isUnionMarkerParen(inner) ? '' : full
  ));
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Trailing dash inventory / employment
  t = t.replace(/\s*[-–—]\s*inventory\s*$/i, '').trim();
  t = t.replace(TRAILING_VACANCY_METADATA, '').trim();
  t = t.replace(TRAILING_POSITION_METADATA, '').trim();
  t = t.replace(TRAILING_SEVERAL_POSITIONS_METADATA, '').trim();
  t = t.replace(/\s*,?\s*(?:multiple|several)\s+positions?\s+available\s*$/i, '').trim();
  t = t.replace(TRAILING_COUNT_METADATA, '').trim();
  t = t.replace(TRAILING_POOL_METADATA, '').trim();
  t = t.replace(TRAILING_PLAIN_POOL_METADATA, '').trim();
  t = t.replace(TRAILING_PIPELINE_METADATA, '').trim();
  t = t.replace(TRAILING_MULTIPLICITY_METADATA, '').trim();
  t = t.replace(TRAILING_DURATION_METADATA, '').trim();
  t = t.replace(/\s*[-–—]\s*(?:re[-\s]?post(?:ing)?|periodic(?:\s+posting|\s+post)?)\s*$/i, '').trim();
  t = t.replace(/\s*[-–—]\s*(?:reaffichage|réaffichage)\s*$/i, '').trim();
  t = t.replace(
    /\s*[-–—]\s*(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent|term|sessional|fixed[-\s]?term(?:\s+contract)?|limited\s+term\s+contract)\s*$/i,
    '',
  ).trim();
  t = t.replace(/\s+sessional\s*$/i, '').trim();

  // Some boards put the metadata before the role with a comma, e.g.
  // "Contract, Community Relations Specialist".
  t = t.replace(/^(?:(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent|term)\s*[,;]\s*)+/i, '').trim();

  // Leading "Temporary Part-Time/Full-Time" (combo only — not bare Temporary)
  t = t.replace(/^(?:temporary\s+)+(?:part[-\s]?time|full[-\s]?time)\s+/i, '');
  // Leading Part-time / Full-time (hyphen, space, or concatenated)
  t = t.replace(/^(?:part[-\s]?time|full[-\s]?time)\s+/i, '');
  // Leading Casual after the above (e.g. "Part-Time Casual …")
  t = t.replace(/^(?:casual\s+)+/i, '');
  t = t.replace(/^talent\s+pool\s*[-–—:]\s*/i, '').trim();
  t = t.replace(/\s*[-–—]\s*talent\s+pool\s*$/i, '').trim();
  // "Part Time - Food Services Worker" left a leading dash after prefix strip
  t = t.replace(/^[-–—,:;]+\s*/, '').trim();

  // Trailing punctuation / double spaces from removals
  t = t.replace(/\s*[-–—,;:/]+\s*$/g, '').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  // "Technician  Creative" already collapsed; fix "Word -  - Word" style
  t = t.replace(/\s*[-–—]\s*[-–—]+/g, ' - ').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  t = t.replace(/\s*[-–—]\s*(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent|term|fixed[-\s]?term(?:\s+contract)?|limited\s+term\s+contract)\s*$/i, '').trim();

  return t || original;
}

/** Apply source-specific cleanup after the shared title normalization. */
export function normalizeSourceJobTitle(source: string | null | undefined, title: string | null | undefined): string {
  let normalized = normalizeJobTitle(title);
  if (!normalized) return '';

  if (source === 'University of Ottawa') {
    // uOttawa's Workday headings commonly put the academic term, bargaining
    // unit, course code, and requisition ID into one display title, e.g.
    // `APTPUO---Winter-2027---API5135D_JR37962`. Those are metadata fields,
    // not the public role title. Normalize the slug separators first, then
    // reuse the academic extractor so the term survives in structured fields
    // while disappearing from the title. Only apply this when a real academic
    // term or union marker is present; ordinary seasonal roles are untouched.
    let academicHeading = normalized
      .replace(/-{2,}/g, ' - ')
      .replace(/_/g, ' ')
      .replace(/\b(20\d{2})\s+(Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\b/gi, '$2 $1')
      .replace(new RegExp(`\\b(${SEASON_WORD})[-\\s]+(\\d{4}(?:[-/]\\d{2,4})?)`, 'i'), '$1 $2')
      .replace(/^(?:CUPE|OPSEU|APTPUO|APEUO|APTEUO|ATPUO)\s+(?=(?:part[-\s]?time|full[-\s]?time|fall|winter|spring|summer|automne|hiver|été|ete|printemps|20\d{2})\b)/i, '')
      .replace(/\b(?:JR|REQ)\d[\w-]*\b\s*[-–—]\s*/gi, '')
      .replace(/\s*[-–—]?\s*(?:JR|REQ)\d[\w-]*\s*$/i, '')
      .trim();
    for (let i = 0; i < 3; i += 1) {
      const next = stripUnionPrefix(academicHeading);
      if (next === academicHeading) break;
      academicHeading = next;
    }
    const academicMeta = extractAndStripAcademicMetadata(academicHeading, source);
    if (academicMeta.academicTerm || academicMeta.unionName || academicMeta.academicCourse) {
      const roleAlias = academicHeading.match(/\b(TA|AE)(?=\s|$)/i)?.[1] ?? '';
      const extractedTitle = stripTrailingConnectorPunctuation(
        stripAcademicCourseCode(stripAcademicTerm(academicHeading), source),
      );
      const displayTitle = extractedTitle.length >= 4 ? extractedTitle : academicMeta.title;
      normalized = normalizeJobTitle(roleAlias ? roleAlias : displayTitle)
        .replace(/^\s*(?:[A-Z]\d{1,2}(?:\s*\/\s*[A-Z]\d{1,2})?|[A-Z])\s*[-–—:]\s*/i, '')
        .replace(/\s*[-–—:]\s*(?:[A-Z]\d{1,2}(?:\s*\/\s*[A-Z]\d{1,2})?|[A-Z])\s*$/i, '')
        .trim();
      if (/^(?:TA|TAs)$/i.test(normalized)) normalized = 'Teaching Assistant';
      if (/^AE$/i.test(normalized)) normalized = 'Academic Expert';
      if (/^(?:[A-Z]{2,8}\s*)?\d[A-Z0-9]{2,7}(?:\s+[A-Z]\d{2})?$/i.test(normalized)
        || /^(?:[A-Z]\d{1,2}(?:\s*\/\s*[A-Z]\d{1,2})?|[A-Z])\s*[-–—:]\s*/i.test(normalized)) {
        normalized = 'Course Instructor';
      }
      const courseOnlyHeading = /^(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s+\d{4}(?:[-/]\d{2,4})?\s*[-–—:]?\s*[A-Z]{2,8}\s?\d[A-Z0-9]{2,7}(?:\s+[A-Z]\d{0,2})?$/i.test(academicHeading)
        || /^[A-Z]{2,8}\s?\d[A-Z0-9]{2,7}(?:\s+[A-Z]\d{0,2})?\s*[-–—:]\s*(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s+\d{4}/i.test(academicHeading);
      if (academicMeta.academicTerm && courseOnlyHeading) {
        normalized = 'Course Instructor';
      }
    }
    normalized = normalized.replace(/\s*[-–—]\s*(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s*\d{4}(?:[-/]\d{2,4})?\s*[-–—].*$/i, '').trim();
    normalized = normalized.replace(/\s*[-–—]\s*(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s*\d{4}\s*$/i, '').trim();
  }

  if (source === 'City of Waterloo') {
    // TalentPoolBuilder appends the employment-status field directly to the
    // captured heading, sometimes without a separating space.
    normalized = normalized.replace(/\s*employment\s+status.*$/i, '').trim();
  }

  if (source === 'Humber College') {
    // Taleo includes Humber's faculty/department and employment classification
    // in the same heading as the role title.
    normalized = normalized.replace(/\s*\(\d+\s+positions?\)/i, '').trim();
    normalized = normalized.replace(
      /\s*(?:[-–—,]\s*)(?:(?:FHLS|CDFM|FMCAD|FAST|BCTI|UGH|SWEL|SSE|ITS|R&SM|RO|Office of the Registrar|Campus Services)(?:\s*[-–—]\s*(?:FT|PT)\s+(?:Admin|Support)|\s*[-–—]\s*(?:RPT|CPT|PC Prof|Clinical Contract|RPT Recurring))?|(?:FT|PT)\s+(?:Admin|Support)|(?:RPT|CPT|PC Prof|Clinical Contract|RPT Recurring))$/i,
      '',
    ).trim();
  }

  if (source === 'Government of Canada') {
    // The federal jobs portal appends its internal requisition number as
    // `(#12345)`. It is source metadata, not part of the public title.
    normalized = normalized.replace(/\s*\(\s*#\d{3,}\s*\)\s*$/i, '').trim();
  }

  if (source === 'Metrolinx') {
    // Metrolinx appends location, shift pattern, pay annotation, and pool
    // status to the same heading. Those belong in structured fields, not the
    // public role name.
    normalized = normalized.replace(/\s*[-–—]\s*[^-–—]+?\s*[-–—]\s*various\s+shifts(?:\s*\([^)]*\))?$/i, '').trim();
    normalized = normalized.replace(/\s*\([^)]*\$[^)]*\)\s*$/i, '').trim();
    normalized = normalized.replace(/\s*[-–—]\s*various\s+shifts\s*$/i, '').trim();
  }

  if (source === 'Toronto Metropolitan University') {
    // PeopleSoft prefixes these course-assistant postings with the term and
    // department, then appends section initials and the number of roles.
    normalized = normalized
      .replace(/^\s*(?:F|W|S)\d{2}\s+/i, '')
      .replace(/^(?:Soc|SAF)\s+(?=(?:Academic|Teaching|Instructional)\s+Assistant\b)/i, '')
      .replace(/\s+[A-Z]{2,8}\s?\d{3,4}\s*\([^)]{1,24}\)(?:\s+[A-Z]{2})?(?:\s+\d+\s+roles?)?\s*$/i, '')
      .replace(/\s+\(\d+\)\s+[A-Z]{2}\s*$/i, '')
      .replace(/\s+\d+\s+roles?\s*$/i, '')
      .replace(/\s+\d+\s+posting\s*$/i, '')
      .replace(/^\s*Winter\s+\d{4}\s*[-–—]\s*SAF\s*[-–—]\s*/i, '')
      .replace(/\s+posting\s*$/i, '')
      .replace(/^\s*[-–—,:;]+\s*/, '')
      .trim();
    const courseCode = extractAcademicCourseCode(title, source);
    if (courseCode) normalized = stripTrailingConnectorPunctuation(normalized.replace(courseCode, '').replace(/\s+(?:Fall|Winter|Spring|Summer)\s+\d{4}\s*$/i, '').replace(/\s+[-–—:]\s+/g, ' '));
    normalized = normalized.replace(/\s+position\b/i, '').trim();
    if (/\b(?:Academic|Teaching) Assistant\b/i.test(normalized) && extractSourceAcademicCourse(source, title)) {
      normalized = normalized.match(/\bTeaching Assistant\b/i)?.[0]
        || normalized.match(/\bAcademic Assistant\b/i)?.[0]
        || normalized;
    }
  }

  if (source === 'Brock University') {
    // Brock instructional postings append the term and delivery block rather
    // than a year, e.g. "Marker-Grader MBAB 5P03 Fall D2". The course code,
    // season, and D-block are metadata; the role remains the display title.
    normalized = normalized
      .replace(/\s+(?:Fall|Winter|Spring|Summer)\s+D\d(?:-\d+)?(?:\s*&\s*D\d(?:-\d+)?)?\s*$/i, '')
      .replace(/\s*[-–—:,]\s*(?:Fall|Winter|Spring|Summer)\s*$/i, '')
      .trim();
    if (COURSE_CODE_PATTERN.test(normalized)
      && /\b(?:marker[-\s]?grader|teaching\s+assistant|instructor|sessional|tutor|lab\s+demonstrator)\b/i.test(normalized)) {
      const academicMeta = extractAndStripAcademicMetadata(normalized, source);
      if (academicMeta.title.length >= 4) normalized = academicMeta.title;
    }
  }

  if (source === 'University of Toronto') {
    normalized = normalized
      .replace(/^\s*Emergency\s+Posting\s*[-–—:]\s*/i, '')
      .replace(/\s*[-–—:]\s*Emergency\s+Posting\s*$/i, '')
      .replace(/\s*[-–—]\s*EMERG\s+(?:Fall|Winter|Spring|Summer)\s*\d{4}\s*$/i, '')
      .trim();
    if (/\bSessional\s+(?:Lecturer|Instructional Assistant)\b/i.test(normalized)
      && extractSourceAcademicCourse(source, title)) {
      normalized = normalized.match(/\bSessional\s+Instructional Assistant\b/i)?.[0]
        || normalized.match(/\bSessional\s+Lecturer\b/i)?.[0]
        || normalized;
    }
  }

  if (source === 'York University') {
    const courseCode = extractAcademicCourseCode(title, source);
    if (courseCode) normalized = normalized.replace(courseCode, '').trim();
    normalized = normalized.replace(/\s+F\/W(?:\s+\d{2}\/\d{2})?\b/gi, '').trim();
  }

  if (/university|college|polytechnic|institut/i.test(String(source ?? ''))) {
    // Academic boards frequently append a season without a year, such as
    // `Winter/Spring`, `Fall`, or `(Winter) Sessional`. It is term metadata
    // when it is at the edge of the title; ordinary phrases like "Winter
    // Operations Coordinator" remain untouched.
    normalized = normalized
      .replace(/\s*\(\s*(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?(?:\s+\d{4}(?:[-/]\d{2,4})?)?)\s*\)\s*$/i, '')
      .replace(/\s*[-–—:,]\s*(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?(?:\s+\d{4}(?:[-/]\d{2,4})?)?)\s*$/i, '')
      .replace(/\s*\((?:Fall|Winter|Spring|Summer)\s+\d{4}(?:[-/]\d{2,4})?(?:\s*\/\s*(?:Fall|Winter|Spring|Summer)\s+\d{4}(?:[-/]\d{2,4})?)?\)\s*$/i, '')
      .replace(/^(?:F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer)))\s*[-–—:,]\s*/i, '')
      .trim();
  }

  return normalized || normalizeJobTitle(title);
}

/** Recover a source-labelled course code/section for the academic_course field. */
export function extractSourceAcademicCourse(source: string | null | undefined, title: string | null | undefined): string {
  const value = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!value || !/university|college|polytechnic|institut/i.test(String(source ?? ''))) return '';
  const coursePattern = SOURCE_COURSE_CODE_PATTERNS[source]
    ?? /\b[A-Z]{2,8}\s?\d[A-Z0-9]{2,7}(?:\s*\/\s*(?:[A-Z]{2,8}\s?)?\d[A-Z0-9]{2,7})?(?:\s*\([^)]{1,24}\))?/gi;
  const codeMatch = [...value.matchAll(new RegExp(coursePattern.source, 'gi'))]
    .find(match => !/^(?:fall|winter|spring|summer|automne|hiver|été|ete|printemps)\s*\d{4}$/i.test(match[0].trim()));
  if (!codeMatch || codeMatch.index === undefined) return '';
  const code = codeMatch[0].replace(/\s+/g, ' ').trim();
  let remainder = value.slice(codeMatch.index + codeMatch[0].length)
    .replace(/^\s*[-–—:]+\s*/, '')
    .replace(/\s+\b(?:LEC\d{2,5}|L\d{4,5}|[A-Z]{1,4}\d{1,2})\b\s*/i, ' ')
    .replace(/\s*\([^)]*\b(?:emergency|emerg)\b[^)]*\)/i, '')
    .replace(/\s*[-–—]\s*(?:Emergency Posting|TWO POSITIONS?|\d+\s+roles?)\s*$/i, '')
    .replace(/\b(?:JR|REQ)\d[\w-]*\b/gi, '')
    .trim();
  if (source === 'Toronto Metropolitan University') {
    remainder = remainder
      .replace(/\s+[-–—]\s*(?:Academic|Teaching) Assistant\b.*$/i, '')
      .replace(/\s+\b[A-Z]{2}\b(?:\s+\d+\s+roles?)?\s*$/i, '')
      .trim();
  } else {
    remainder = remainder.replace(/\s+[-–—]\s*Sessional\s+(?:Lecturer|Instructional Assistant)\s*$/i, '').trim();
  }
  remainder = remainder
    .replace(/\b(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s*\d{4}(?:[-/]\d{2,4})?\b/gi, '')
    .replace(/\bF\/W(?:\s+\d{2}\/\d{2})?\b/gi, '')
    .replace(/\b(?:Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s+D\d(?:-\d+)?(?:\s*&\s*D\d(?:-\d+)?)?\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s*[-–—:;,]+\s*|\s*[-–—:;,]+\s*$/g, '')
    .trim();
  if (source === 'Brock University') return code;
  return remainder && !/^(?:\([^)]*\)|[A-Z]{1,3}|\d+\s+roles?)$/i.test(remainder)
    ? `${code} — ${remainder}`
    : code;
}

/** Recover abbreviated PeopleSoft terms such as TMU's `F26` into the term field. */
export function extractSourceAcademicTerm(source: string | null | undefined, title: string | null | undefined): string {
  const value = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!value || !/university|college|polytechnic/i.test(String(source ?? ''))) return '';
  const full = extractAcademicTerm(value);
  if (full) return full;
  const reversed = value.match(/\b(20\d{2})\s+(Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\b/i);
  if (reversed) return `${reversed[2]} ${reversed[1]}`;
  if (source === 'York University') {
    const yorkTerm = value.match(/\bF\/W(?:\s+(\d{2})\/(\d{2}))?\b/i);
    if (yorkTerm?.[1] && yorkTerm[2]) return `Fall/Winter 20${yorkTerm[1]}-${yorkTerm[2]}`;
    if (yorkTerm) return 'Fall/Winter';
  }
  const seasonal = value.match(/(?:^|[-–—:,()]\s*)(F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)(?:\s*\))?(?=\s*(?:sessional)?\s*$)/i)?.[1];
  if (seasonal) {
    const compact = seasonal.replace(/\s+/g, ' ').trim();
    const fiscal = compact.match(/^F\/W\s+(\d{2})\/(\d{2})$/i);
    if (fiscal) return `Fall/Winter 20${fiscal[1]}-${fiscal[2]}`;
    return compact;
  }
  const leadingSeasonal = value.match(/^(F\/W\s+\d{2}\/\d{2}|(?:Fall|Winter|Spring|Summer)(?:\s*\/\s*(?:Fall|Winter|Spring|Summer))?)\s*[-–—:,]/i)?.[1];
  if (leadingSeasonal) {
    const compact = leadingSeasonal.replace(/\s+/g, ' ').trim();
    const fiscal = compact.match(/^F\/W\s+(\d{2})\/(\d{2})$/i);
    if (fiscal) return `Fall/Winter 20${fiscal[1]}-${fiscal[2]}`;
    return compact;
  }
  if (source === 'Brock University') {
    const block = value.match(/\b(Fall|Winter|Spring|Summer)\s+D\d(?:-\d+)?(?:\s*&\s*D\d(?:-\d+)?)?\b/i)?.[1];
    if (block) return block;
  }
  const compactYear = value.match(/\b(Fall|Winter|Spring|Summer|Automne|Hiver|Été|Ete|Printemps)\s*(20\d{2})(?:[-/]\d{2,4})?\b/i);
  if (compactYear) return `${compactYear[1]} ${compactYear[2]}`;
  const abbreviated = value.match(/^(F|W|S)(\d{2})\b/i);
  if (!abbreviated) return '';
  const label = { f: 'Fall', w: 'Winter', s: 'Summer' }[abbreviated[1].toLowerCase()] ?? '';
  return label ? `${label} 20${abbreviated[2]}` : '';
}

/** Return false for portal navigation headings that are not job titles. */
export function isUsableJobTitle(title: string | null | undefined): boolean {
  const normalized = normalizeJobTitle(title);
  if (!normalized) return false;
  return !/^(?:skip\s+to\b|search\s+jobs?\b|job\s+description|no\s+results?\b|frequently\s+asked\b|view\s+(?:the\s+)?job(?:\s+(?:details|posting))?\b|apply\s+now\b|click\s+here\b|read\s+more\b|see\s+details\b|job\s+details\b|workload\s*(?:n\s*)?\(in\s+days\)\s+to\s+receive\s+an\s+alert\b)/i.test(normalized);
}

/**
 * Recover a title from a human-readable job URL only when the same words also
 * appear in the captured source text. Numeric IDs and generic portal paths do
 * not provide enough evidence and return an empty result.
 */
export function extractUrlJobTitle(url: string | null | undefined, rawText: string | null | undefined): string {
  if (!url || !rawText) return '';

  let segment = '';
  try {
    const parsed = new URL(url);
    segment = parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
    segment = decodeURIComponent(segment).replace(/\.(?:html?|aspx?)$/i, '');
  } catch {
    return '';
  }

  if (!segment || /\.gbl$/i.test(segment) || /^(?:job|jobs|posting|postings|search|home)$/i.test(segment)) return '';
  const candidate = normalizeJobTitle(segment.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' '));
  if (!isUsableJobTitle(candidate)) return '';

  const evidenceWords = (value: string): Set<string> => new Set(
    value.toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(Boolean),
  );
  const candidateWords = [...evidenceWords(candidate)].filter(word => word.length > 1 && !/^\d+$/.test(word));
  const sourceWords = evidenceWords(rawText);
  if (candidateWords.length < 2 || !candidateWords.every(word => sourceWords.has(word))) return '';
  return candidate;
}

/** Extract a source-provided employment term from title metadata. */
export function extractTitleDuration(title: string | null | undefined): string | null {
  const original = String(title ?? '').replace(/\s+/g, ' ').trim();
  if (!original) return null;

  const trailingDuration = original.match(TRAILING_DURATION_METADATA)?.[1];
  if (trailingDuration) return trailingDuration.replace(/\s+/g, ' ').trim();

  const metadata = [
    ...[...original.matchAll(/\(([^()]*)\)/g)].map(match => match[1]),
    original.match(TRAILING_DURATION_METADATA)?.[1] ?? '',
    original.match(/(?:^|\s[-–—,;]\s)([^-–—,;]+)$/)?.[1] ?? '',
    original.match(/^(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent|term)\s*[,;]\s*(.+)$/i)?.[0] ?? '',
    original.match(/\b(?:term|permanent|temporary|contract)\s*$/i)?.[0] ?? '',
  ].join(' ');

  const duration = metadata.match(/(?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|weeks?|days?)(?:\s+(?:contract|term|assignment|position))?/i)?.[0];
  if (duration) return duration.replace(/\s+/g, ' ').trim();
  if (/\bterm\b/i.test(metadata)) return 'Term';
  if (/\bpermanent\b/i.test(metadata)) return 'Permanent';
  if (/\bcontinuing\b/i.test(metadata)) return 'Continuing';
  if (/\btemporary\b/i.test(metadata)) return 'Temporary';
  if (/\bcontract\b/i.test(metadata)) return 'Contract';
  return null;
}

export const PEOPLE_SOFT_SOURCES = new Set([
  'Fleming College',
  'Toronto Metropolitan University',
  'TransLink',
  'Western University',
  'City of Calgary',
  'City of Winnipeg',
  'McMaster University',
  'Durham Region',
  'Niagara Region',
]);

/**
 * Recover only a source-provided title when a scraper captured raw text but
 * could not populate the listing metadata. This deliberately knows about the
 * affected source layouts and returns empty for portal chrome without a title.
 */
export function extractRawJobTitle(source: string, rawText: string | null | undefined): string {
  if (!rawText) return '';

  let candidate = '';
  if (PEOPLE_SOFT_SOURCES.has(source)) {
    candidate = rawText.match(
      /Job Title\s*(?!Search|Job Description|$)(.+?)(?=\s*(?:Next Job|Job ID|Regular\/Temporary|Appointment Type|Faculty\/Unit|Department|Location|Open Date|Job Number|Full\/Part Time|Descr(?:iption)?))/i,
    )?.[1] ?? '';
    candidate ||= rawText.match(
      /Job Description\s+More Actions\s+(?:Previous Job\s+)?(.+?)\s+Next Job/i,
    )?.[1] ?? '';
  } else if (source === 'Toronto District School Board') {
    candidate = rawText.match(
      /Skip to job title(?:Skip to action buttons)?\s*(.+?)(?=\s*Apply now\b)/i,
    )?.[1] ?? '';
  } else if (source === 'City of Hamilton') {
    candidate = rawText.match(/Job ID\s*#?\s*\d+:\s*([^\n]+)/i)?.[1] ?? '';
  } else if (source === 'City of Windsor') {
    candidate = rawText.match(
      /Job Title:\s*([^\n]+?)(?=Job Posting Number:|Posting Type:|$)/i,
    )?.[1] ?? '';
  } else if (source === 'City of Thunder Bay') {
    candidate = rawText.match(/Back\s+(.+?)JOB_DESCRIPTION\.SHARE/i)?.[1] ?? '';
  } else if (source === 'City of Cornwall') {
    candidate = rawText.match(/(?:Stay Connected|Log Out)\s+(.+?)(?=City of Cornwall\b)/i)?.[1] ?? '';
    candidate = candidate.replace(/\s*\(\d{2}-\d{3}\)\s*$/, '');
  } else if (source === 'Conservation Halton') {
    // The employment page captures each posting as a detail section whose
    // first line is the job title. The scraper's link metadata does not carry
    // that title, so recover only that first source line for pending shells.
    candidate = rawText.match(/^\s*([^\r\n]+)/)?.[1] ?? '';
  }

  const title = normalizeJobTitle(candidate);
  if (!isUsableJobTitle(title)) return '';
  return title;
}
