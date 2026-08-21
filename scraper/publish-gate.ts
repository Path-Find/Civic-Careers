/**
 * One gate for whether a mechanically-parsed job is safe to publish.
 *
 * Used by both the live backfill write path (backfill-metadata-only.ts) and
 * the retroactive audit (audit-mechanical-publish.ts) so a fix here protects
 * both future runs and whatever was already published under a weaker check.
 *
 * Policy: on any red flag, hold the whole job back (fail closed). Never try
 * to silently auto-correct a suspect field — a wrong guess published is worse
 * than a real job left pending.
 */
import { isUsableJobTitle } from './title';

export interface PublishGateDetails {
  title: string;
  department?: string | null;
  hours?: string | null;
  salary?: string | null;
  location?: string | null;
  unionName?: string | null;
}

// board-parsers.ts field regexes are bounded by newline only (`[^\n]+`), which
// silently swallows the rest of the field when a source's raw text has no
// newline between labeled fields — a whole job's remaining fields can end up
// concatenated into e.g. "department". Real long values exist though (a
// university department/faculty name can legitimately run 90+ chars, an
// hours description with "as scheduled, no minimum guarantee" can too), so a
// flat length cap alone rejects far more good jobs than bad ones. Two better
// signals, checked instead of / in addition to a generous length backstop:
//   - a colon inside the value: salary/location/unionName values never
//     legitimately contain one — a colon means the next field's label got
//     glued on (e.g. "...ServicesDivision: Employment & Social Services").
//     `hours` is excluded: "9:00 AM - 5:00 PM" is a real, common value.
//     `department` is excluded: real academic naming legitimately uses one
//     ("UTM: Anthropology") — see the note at FIELDS_REJECT_COLON below.
//   - squished sentence joins (no space where a sentence ended, e.g.
//     "OperationsCampus", "disciplineDemonstrated") — the fingerprint of a
//     capture that ran across a raw-text boundary with no whitespace at all.
// `department` deliberately excluded: academic institutions routinely use a
// legitimate "CAMPUS: Department" or "Program: Subtitle" naming convention
// (found live: "UTM: Anthropology", "Master's in Development Practice:
// Indigenous Development"). The one known genuine corruption case that has a
// colon in department is still caught by the length ceiling regardless (it
// runs 230 chars), so the colon check added nothing there but false positives.
const FIELDS_REJECT_COLON = new Set(['salary', 'location', 'unionName']);
const SCALAR_FIELD_LENGTH_CEILING: Record<string, number> = {
  title: 220,
  department: 150,
  hours: 200,
  salary: 150,
  location: 150,
  // Real union names run up to ~70 chars ("Association of the Academic Staff
  // of the University of Alberta"); a City of Calgary board-parser bug was
  // found dumping the entire raw posting (position type, pay grade, hours,
  // job ID) into this field — same unbounded-capture class as the others.
  unionName: 150,
};

// A genuine glued-field join happens between two real WORDS ("Operations" +
// "Campus", "Resource" + "Stewardship") -- both sides of the case transition
// run several letters deep. A short-to-medium camelCase brand/product name
// ("MoveUP", "IoT", "ServiceNow", "PeopleSoft", "GoodWorks") has a short
// fragment on at least one side and must not trip this. Threshold picked by
// testing candidate regexes against known real examples of both classes
// (see tests/publish-gate.test.ts) rather than by inspection alone -- a
// (3,2)-letter threshold still false-positived on "ServiceNow"/"PeopleSoft"/
// "GoodWorks" found live in the archive DB; (3,5) cleanly separates both sets.
function hasSquishedSentenceJoin(value: string): boolean {
  return /[a-z]{3,}[A-Z][a-z]{5,}/.test(value);
}

function corruptedScalarField(details: PublishGateDetails): string | null {
  for (const [field, ceiling] of Object.entries(SCALAR_FIELD_LENGTH_CEILING)) {
    const value = (details as unknown as Record<string, unknown>)[field];
    if (typeof value !== 'string' || !value) continue;
    if (value.length > ceiling) return field;
    if (hasSquishedSentenceJoin(value)) return field;
    if (FIELDS_REJECT_COLON.has(field) && value.includes(':')) return field;
  }
  return null;
}

// Employment-status words belong in employment_type, not the title — a title
// carrying "(FT Temporary)" or similar is a sign the source-title extractor
// grabbed a status label instead of the actual role name. Only counted as an
// annotation when it trails off into punctuation (end of string, a comma,
// a slash, a paren) or another status word right after -- not when a real
// role name simply contains one of these words ("Contract Compliance
// Officer", "Contract Academic Staff", "Procurement Contract Coordinator").
// A plain "\b(...)\b" version of this regex matched 208 archive titles;
// full-data validation showed 164 of those were real role names, not status
// clutter -- this version cleanly separates the two (see publish-gate.test.ts).
const STATUS_WORD_ALTERNATION = 'full[- ]?time|part[- ]?time|temporary|casual|permanent|contract|FT|PT|vacation relief';
const TITLE_STATUS_WORDS = new RegExp(
  `\\b(?:${STATUS_WORD_ALTERNATION})\\b(?=\\s*(?:$|[,;/)(]|\\s+(?:${STATUS_WORD_ALTERNATION})\\b))`,
  'i',
);

// Words that mark a title as a reposting/administrative annotation rather
// than the actual role name, or portal chrome (cookie banner, etc.) captured
// in place of a real title. Add more as one-liners here.
// No trailing \b: glued-together portal captures (e.g. "...privacyWe use...")
// can run directly into the next word with no space, so requiring a word
// boundary right after the phrase would miss exactly the case this exists for.
const TITLE_FLAGGED_WORDS = /\b(revised|amended|vacanc(?:y|ies)|repost(?:ed|ing)?|r[ée]affichage|we (?:use|value) (?:cookies|your privacy))/i;

export function getPublishBlockReason(details: PublishGateDetails): string | null {
  const corruptField = corruptedScalarField(details);
  if (corruptField) return `corrupted field: ${corruptField}`;

  if (!isUsableJobTitle(details.title)) return 'unusable title';
  if (TITLE_STATUS_WORDS.test(details.title)) return 'employment-status words in title';
  if (TITLE_FLAGGED_WORDS.test(details.title)) return 'flagged word in title';

  return null;
}
