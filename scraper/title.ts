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

  if (/^(?:part[-\s]?time|full[-\s]?time|temporary|temp|casual|seasonal|permanent|term|contract|on[-\s]?call|inventory|re[-\s]?post|periodic(?:\s+posting)?)$/i.test(s)) {
    return true;
  }

  // "Approximately 2-year contract", "up to 6 months", "18 months"
  if (/^(?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|weeks?|days?)\b(?:\s+(?:contract|term|assignment|position))?$/i.test(s)) {
    return true;
  }

  // "2 Year Contract", "9 Month Contract", "18-months contract", "1-Year Contract"
  if (/^\d+(?:\.\d+)?\s*[-–—]?\s*(?:year|years|month|months|yr|yrs|mo|mos)\s+(?:contract|term|assignment|position)?$/i.test(s)) {
    return true;
  }

  // "fixed-term", "term contract", "contract position"
  if (/^(?:fixed[-\s]?term|term\s+contract|contract\s+position|contract\s+role)$/i.test(s)) {
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
const UNION_CODES = ['CUPE', 'OPSEU', 'USW', 'ONA', 'UNIFOR', 'SEIU', 'PSAC', 'NAPE', 'ATU', 'IAM', 'CAW', 'APTPUO'];
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

/** Extract a course code from a title, e.g. "Teaching Assistant MBAB 5P11 Fall D" → "MBAB 5P11". */
export function extractAcademicCourseCode(title: string | null | undefined): string | null {
  if (!title) return null;
  const match = title.match(COURSE_CODE_PATTERN);
  return match ? match[0].trim() : null;
}

function stripAcademicCourseCode(title: string): string {
  const match = title.match(COURSE_CODE_PATTERN);
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
const TRAILING_DURATION_METADATA = /\s*[-–—]\s*((?:(?:approx(?:imately|\.)?|up to)\s+)?\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|weeks?|days?)(?:\s+(?:contract|term|assignment|position))?(?:\s+with\s+(?:the\s+)?possibility\s+of\s+extension)?|(?:temporary|permanent|contract|term)\s+assignment)\s*$/i;
const TRAILING_VACANCY_METADATA = /\s*[-–—]\s*\d+\s+vacanc(?:y|ies)\s*$/i;

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

  const academicTerm = extractAcademicTerm(original);
  const unionName = extractUnionFromTitle(original);
  const academicCourse = isAcademicSource ? extractAcademicCourseCode(original) : null;

  let clean = original;
  clean = stripUnionPrefix(clean);
  clean = stripAcademicTerm(clean);
  if (isAcademicSource) clean = stripAcademicCourseCode(clean);
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

  // Meta parentheticals anywhere: (Part-Time), (2 Year Contract), (Casual), …
  t = t.replace(/\s*\(([^)]*)\)/g, (full, inner: string) => (
    isEmploymentOrDurationParen(inner) || isUnionMarkerParen(inner) ? '' : full
  ));
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Trailing dash inventory / employment
  t = t.replace(/\s*[-–—]\s*inventory\s*$/i, '').trim();
  t = t.replace(TRAILING_VACANCY_METADATA, '').trim();
  t = t.replace(TRAILING_DURATION_METADATA, '').trim();
  t = t.replace(/\s*[-–—]\s*(?:re[-\s]?post(?:ing)?|periodic(?:\s+posting|\s+post)?)\s*$/i, '').trim();
  t = t.replace(
    /\s*[-–—]\s*(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent|term|fixed[-\s]?term(?:\s+contract)?|limited\s+term\s+contract)\s*$/i,
    '',
  ).trim();

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

  return normalized || normalizeJobTitle(title);
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
