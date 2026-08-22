/**
 * Canonical shapes for job_details.hours and job_details.availability.
 *
 * Hours (workload amount only):
 *   "35 hours per week" | "Up to 24 hours per week" | "39 hours" | "24-hour shifts"
 *
 * Availability (when/schedule tags, not hour counts):
 *   Daytime | Evenings | Nights | Weekends | Weekdays | Holidays |
 *   Shift work | Variable | Flexible | On-call | School hours
 *   Multi: "Evenings; Weekends" (semicolon + space)
 *
 * Prefer empty over inventing. Full enum later if filters need it.
 */

export type HoursAvailability = { hours: string; availability: string };

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\u2013|\u2014/g, '-').trim();
}

/** Extract "N hours per week" / "Up to N hours per week" / bare "N hours". */
export function normalizeHours(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = clean(String(raw));
  if (!s || /^n\/?a$/i.test(s) || /^none$/i.test(s)) return '';
  if (/receive\s+an\s+alert|^n\b|^\s*(?:up\s+to|approx(?:\.)?)\s+\d+\s*$|\banticipated\s+start\s+date\b|^\s*\d+(?:\.\d+)?\s*FTE\s*$/i.test(s)) return '';

  // Some board captures glue the next labelled field onto hours. Keep the
  // numeric hours prefix when it is usable; discard a non-hour fragment such
  // as "rnoons Shift Premium: $1" rather than exposing it as workload.
  const labelledBareHours = s.match(/^(\d{1,3}(?:\.\d{1,2})?)\s*(?:hours?|hrs?)?\s*(?=(?:location|openings?|vacanc(?:y|ies)|work\s+schedule|work\s+modality|status))/i);
  if (labelledBareHours) return `${labelledBareHours[1]} hours`;
  const embeddedLabel = s.search(/\s+(?:location|work\s+modality|status|vacanc(?:y|ies)|department|salary|shift\s+premium|job\s+(?:type|category)|requirements?|education|workload|schedule)\s*:/i);
  if (embeddedLabel > 0) s = s.slice(0, embeddedLabel).trim();

  const num = String.raw`(\d{1,3}(?:\.\d{1,2})?)`;
  const bareHoursPrefix = s.match(new RegExp(`^${num}\\s*(?:hours?|hrs?)?\\s*(?=(?:location|openings?|vacanc(?:y|ies)|work\\s+schedule|work\\s+modality|status)\\b)`, 'i'));
  if (bareHoursPrefix) return `${bareHoursPrefix[1]} hours`;

  // Already canonical
  if (new RegExp(`^${num} hours per week$`, 'i').test(s)) {
    const n = s.match(/^(\d{1,3}(?:\.\d{1,2})?)/)![1];
    return `${n} hours per week`;
  }
  if (new RegExp(`^Up to ${num} hours per week$`, 'i').test(s)) {
    const n = s.match(/(\d{1,3}(?:\.\d{1,2})?)/)![1];
    return `Up to ${n} hours per week`;
  }
  if (new RegExp(`^${num} hours$`, 'i').test(s)) {
    const n = s.match(/^(\d{1,3}(?:\.\d{1,2})?)/)![1];
    return `${n} hours`;
  }

  // Pure schedule / on-call prose is not hours
  if (
    /school\s+hours|on-?call|spare|variable schedule|shift work/i.test(s)
    && !/\d{1,3}(?:\.\d{1,2})?\s*(?:hours?|hrs?)/i.test(s)
  ) {
    return '';
  }

  // Up to N hours/hrs per week (optional max/maximum)
  let m = s.match(
    new RegExp(
      String.raw`\b(?:maximum|max\.?|up\s+to)\s*${num}\s*(?:hours?|hrs?)\s*(?:per\s*week|\/\s*week|a\s+week)?\b`,
      'i',
    ),
  );
  if (m) return `Up to ${m[1]} hours per week`;

  // N hours per week / N hrs/week / N per week
  m = s.match(
    new RegExp(String.raw`\b${num}\s*(?:hours?|hrs?)\s*(?:per\s*week|\/\s*week|a\s+week)\b`, 'i'),
  );
  if (m) return `${m[1]} hours per week`;
  m = s.match(new RegExp(String.raw`\b${num}\s*(?:per\s*week|\/\s*week)\b`, 'i'));
  if (m) return `${m[1]} hours per week`;

  // N-hour workweek / N hour workweek
  m = s.match(new RegExp(String.raw`\b${num}[-\s]?hour\s+work\s*weeks?\b`, 'i'));
  if (m) return `${m[1]} hours per week`;
  m = s.match(new RegExp(String.raw`\b${num}\s+hour\s+workweek\b`, 'i'));
  if (m) return `${m[1]} hours per week`;

  // N total hours / N hours (3 credits) with optional junk after
  m = s.match(new RegExp(String.raw`\b${num}\s+total\s+hours?\b`, 'i'));
  if (m) return `${m[1]} hours`;
  m = s.match(new RegExp(String.raw`\b${num}\s*(?:hours?|hrs?)\b(?:\s*\([^)]*\))?`, 'i'));
  if (m) {
    if (/\bper\s*week|\/\s*week|workweek/i.test(s)) return `${m[1]} hours per week`;
    return `${m[1]} hours`;
  }

  // 24 hour (shift) without "per week"
  m = s.match(/\b(24)\s*[- ]?\s*hours?\b/i);
  if (m && /shift|workweek|work\s*week/i.test(s)) return '24 hours per week';

  return '';
}

const AVAIL_TAGS: Array<[string, RegExp]> = [
  ['Daytime', /\bdaytime\b|(?<![-\w])days?(?!\s*,?\s*evenings)/i],
  ['Evenings', /\bevenings?\b/i],
  ['Nights', /\bnights?\b/i],
  ['Weekends', /\bweekends?\b/i],
  ['Weekdays', /\bweekdays?\b/i],
  ['Holidays', /\bholidays?\b/i],
  ['Shift work', /\bshift\s*work\b|\brotting\s+on-?call\b|\brotating\b/i],
  ['Variable', /\bvariable\b/i],
  ['Flexible', /\bflex(?:ible)?\b/i],
  ['On-call', /\bon-?call\b/i],
  ['School hours', /\bschool\s+(?:hours|season|hours\s+of\s+operation)\b/i],
];

const CANONICAL_AVAILABILITY_TOKEN = '(?:Daytime|Evenings|Nights|Weekends|Weekdays|Holidays|Shift work|Variable|Flexible|On-call|School hours|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun))';
const CANONICAL_AVAILABILITY = new RegExp(`^${CANONICAL_AVAILABILITY_TOKEN}(?:; ${CANONICAL_AVAILABILITY_TOKEN})*$`);

/** Return true only for the controlled, display-ready Availability format. */
export function isCanonicalAvailability(value: string | null | undefined): boolean {
  return typeof value === 'string' && CANONICAL_AVAILABILITY.test(value.trim());
}

/** Compact availability to known schedule tags; multi with "; ". */
export function normalizeAvailability(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = clean(String(raw));
  if (!s || /^n\/?a$/i.test(s) || /^none$/i.test(s)) return '';
  if (/receive\s+an\s+alert|^n\b|^\s*(?:up\s+to|approx(?:\.)?)\s+\d+\s*$|\banticipated\s+start\s+date\b|^\s*\d+(?:\.\d+)?\s*FTE\s*$/i.test(s)) return '';
  const embeddedLabel = s.search(/\s+(?:salary|union|department|location|work\s+modality|status|vacanc(?:y|ies))\s*:/i);
  if (embeddedLabel > 0) s = s.slice(0, embeddedLabel).trim();
  // A Workday/AI capture once took the tail of "after the ratification"
  // as availability ("r the ratification"). Ratification is labour-relations
  // prose, never a work schedule, so fail closed for it at normalization.
  // Document-upload instructions are application logistics, never a schedule.
  if (/\bratification\b|\bdocument(?:s)?\b/i.test(s)) return '';
  if (/(?:openings?|vacanc(?:y|ies)|division|department|union|salary|location|total\s+hours?)/i.test(s)) return '';
  if (/varying\s+hours?|hours?\s+of\s+work/i.test(s)) return '';

  // Some source templates expose FTE/employment metadata in the schedule
  // slot. It is never an availability value; remove it while preserving any
  // real schedule tags that were captured beside it.
  s = s
    .replace(/(?:^|;\s*)FTE:\s*(?:;|$)/gi, ';')
    .replace(/(?:^|;\s*)FTE:\s*[^;]+/gi, '')
    .replace(/\s*;\s*;+/g, ';')
    .replace(/^\s*;\s*|\s*;\s*$/g, '')
    .trim();
  if (!s) return '';

  // Employment fluff is not availability
  if (/^(full[-\s]?time|part[-\s]?time)(\s+term)?$/i.test(s)) return '';
  // A leftover qualifier from a workload sentence is not a schedule.
  if (/^(?:a\s+)?(?:minimum|maximum)\s+of$/i.test(s)) return '';
  // Number/credit fragments leftover from hours splits
  if (/^[\d.\s()]+$/.test(s)) return '';
  if (/^\(?\d+\s*credits?\)?$/i.test(s)) return '';
  if (/^\(\s*\d+\s*credits?\s*\)$/i.test(s)) return '';

  const found: string[] = [];
  const seen = new Set<string>();
  for (const [label, re] of AVAIL_TAGS) {
    if (re.test(s) && !seen.has(label)) {
      // Avoid "Daytime" from bare "days" when "evenings and weekends" is the point
      if (label === 'Daytime' && /\bevenings?\b|\bnights?\b/i.test(s) && !/\bdaytime\b/i.test(s)) {
        continue;
      }
      seen.add(label);
      found.push(label);
    }
  }

  // Explicit weekday span: Monday to Friday / Tuesday to Saturday
  const daySpan = s.match(
    /\b(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\s*(?:to|[-–—])\s*(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\b/i,
  );
  if (daySpan) {
    const abbr = (w: string) => {
      const t = w.slice(0, 3).toLowerCase();
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    const span = `${abbr(daySpan[1])}-${abbr(daySpan[2])}`;
    if (!seen.has(span)) found.push(span);
  }

  if (found.length) return found.join('; ');

  // Already a single known tag
  for (const [label] of AVAIL_TAGS) {
    if (new RegExp(`^${label}$`, 'i').test(s)) return label;
  }

  // Unknown prose is unsafe here. Empty is preferable to publishing a
  // fragment, date, source label, or application instruction as a schedule.
  return '';
}

/**
 * Split a fused hours string that also carries schedule into both fields.
 * Does not overwrite existing availability when `existingAvailability` is set
 * unless hours normalization emptied and the whole string is schedule-only.
 */
export function splitHoursAndAvailability(
  hoursRaw: string | null | undefined,
  availabilityRaw: string | null | undefined = '',
): HoursAvailability {
  const hoursIn = hoursRaw == null ? '' : String(hoursRaw);
  const availIn = availabilityRaw == null ? '' : String(availabilityRaw);

  const hours = normalizeHours(hoursIn);
  let availability = normalizeAvailability(availIn);

  // Pull schedule tail from hours when fused with ";" or "/"
  if (hoursIn) {
    const parts = clean(hoursIn).split(/\s*[;/]\s*/);
    if (parts.length > 1) {
      const scheduleBits = parts.slice(1).join('; ');
      const fromHours = normalizeAvailability(scheduleBits);
      if (fromHours) {
        availability = mergeAvailability(availability, fromHours);
      }
    } else {
      // "… hours per week with rotating on-call"
      const withoutHours = clean(hoursIn)
        .replace(/\([^)]*\)/g, ' ') // drop credit notes etc.
        .replace(
          /\b(?:maximum|max\.?|up\s+to)?\s*\d{1,3}(?:\.\d{1,2})?\s*(?:hours?|hrs?)(?:\s*(?:per\s*week|\/\s*week|a\s+week))?\b/gi,
          ' ',
        )
        .replace(/\b\d{1,3}(?:\.\d{1,2})?\s*(?:per\s*week|\/\s*week)\b/gi, ' ')
        .replace(/\b\d{1,3}(?:\.\d{1,2})?\b/g, ' ') // stray number fragments
        .replace(/^\s*[,;/\-–—.]+\s*|\s*[,;/\-–—.]+\s*$/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (withoutHours.length >= 3) {
        const fromRest = normalizeAvailability(withoutHours);
        if (fromRest) availability = mergeAvailability(availability, fromRest);
      }
    }
  }

  // Whole hours field was schedule-only
  if (!hours && hoursIn) {
    const schedOnly = normalizeAvailability(hoursIn);
    if (schedOnly) availability = mergeAvailability(availability, schedOnly);
  }

  return { hours, availability };
}

function mergeAvailability(a: string, b: string): string {
  const tags = new Set<string>();
  for (const part of [...a.split(';'), ...b.split(';')]) {
    const t = part.trim();
    if (t) tags.add(t);
  }
  return [...tags].join('; ');
}
