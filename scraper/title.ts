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

  if (/^(?:part[-\s]?time|full[-\s]?time|temporary|temp|casual|seasonal|permanent|term|contract|inventory|re[-\s]?post|periodic(?:\s+posting)?)$/i.test(s)) {
    return true;
  }

  // "Approximately 2-year contract", "approx. 18 month term"
  if (/^approx(?:imately|\.)?\s+.+$/i.test(s) && /(?:contract|term|month|year|assignment|position)/i.test(s)) {
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

  return false;
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

  // Meta parentheticals anywhere: (Part-Time), (2 Year Contract), (Casual), …
  t = t.replace(/\s*\(([^)]*)\)/g, (full, inner: string) => (
    isEmploymentOrDurationParen(inner) ? '' : full
  ));
  t = t.replace(/\s{2,}/g, ' ').trim();

  // Trailing dash inventory / employment
  t = t.replace(/\s*[-–—]\s*inventory\s*$/i, '').trim();
  t = t.replace(/\s*[-–—]\s*(?:re[-\s]?post(?:ing)?|periodic(?:\s+posting|\s+post)?)\s*$/i, '').trim();
  t = t.replace(
    /\s*[-–—]\s*(?:part[-\s]?time|full[-\s]?time|temporary|contract|casual|seasonal|permanent)\s*$/i,
    '',
  ).trim();

  // Leading "Temporary Part-Time/Full-Time" (combo only — not bare Temporary)
  t = t.replace(/^(?:temporary\s+)+(?:part[-\s]?time|full[-\s]?time)\s+/i, '');
  // Leading Part-time / Full-time (hyphen, space, or concatenated)
  t = t.replace(/^(?:part[-\s]?time|full[-\s]?time)\s+/i, '');
  // Leading Casual after the above (e.g. "Part-Time Casual …")
  t = t.replace(/^(?:casual\s+)+/i, '');
  // "Part Time - Food Services Worker" left a leading dash after prefix strip
  t = t.replace(/^[-–—,:;]+\s*/, '').trim();

  // Trailing punctuation / double spaces from removals
  t = t.replace(/\s*[-–—,;:/]+\s*$/g, '').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();
  // "Technician  Creative" already collapsed; fix "Word -  - Word" style
  t = t.replace(/\s*[-–—]\s*[-–—]+/g, ' - ').trim();
  t = t.replace(/\s{2,}/g, ' ').trim();

  return t || original;
}
