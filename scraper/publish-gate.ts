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
import { isUsableJobTitle, normalizeJobTitle } from './title';
import { isCanonicalSalary } from './salary-format';
import { isCanonicalAvailability } from './hours-availability';

export interface PublishGateDetails {
  title: string;
  department?: string | null;
  hours?: string | null;
  salary?: string | null;
  location?: string | null;
  unionName?: string | null;
  availability?: string | null;
  duration?: string | null;
  academicCourse?: string | null;
  academicSchedule?: string | null;
  academicTerm?: string | null;
  academicWorkload?: string | null;
  academicOfficeHours?: string | null;
  educationRequirements?: string | null;
  requiredSkills?: string | null;
  softwareRequirements?: string | null;
  responsibilityTags?: string | null;
  qualificationTags?: string | null;
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
  // A federal posting can legitimately list many work locations; semicolon
  // separated city lists routinely exceed 150 characters.
  location: 500,
  // Real union names run up to ~70 chars ("Association of the Academic Staff
  // of the University of Alberta"); a City of Calgary board-parser bug was
  // found dumping the entire raw posting (position type, pay grade, hours,
  // job ID) into this field — same unbounded-capture class as the others.
  unionName: 150,
  availability: 120,
  duration: 120,
  // Some university postings legitimately list several courses in one
  // appointment. Keep the gate high enough for that list while still
  // catching whole-page captures.
  academicCourse: 500,
  academicSchedule: 120,
  academicTerm: 120,
  academicWorkload: 120,
  academicOfficeHours: 120,
  educationRequirements: 500,
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
  // York University uses the legitimate branded program name
  // `EmpowerAbility`; it is not a glued field boundary.
  return !/\b(?:EmpowerAbility|AccessAbility)\b/.test(value) && /[a-z]{3,}[A-Z][a-z]{5,}/.test(value);
}

function corruptedScalarField(details: PublishGateDetails): string | null {
  for (const [field, ceiling] of Object.entries(SCALAR_FIELD_LENGTH_CEILING)) {
    const value = (details as unknown as Record<string, unknown>)[field];
    if (typeof value !== 'string' || !value) continue;
    if (value.length > ceiling) return field;
    // A real value for any of these fields is one fact pulled from one
    // labeled field, never several paragraphs -- a raw newline means a
    // capture ran across an unrelated field or section boundary (found live:
    // an "hours" value containing "Posting Closing Date:", "Terms of
    // employment", even unrelated portal text like "resetting your
    // password"). Checked against every already-published, trusted row in
    // the dataset with zero legitimate newline-containing value for any of
    // these fields, so this has no known false-positive case.
    if (value.includes('\n')) return field;
    // Department names commonly contain deliberate PascalCase names such as
    // AccessAbility; unlike prose fields, that is not evidence of a glued
    // capture. The length ceiling still catches a department that swallowed
    // the rest of the posting.
    if (field !== 'department' && hasSquishedSentenceJoin(value)) return field;
    if (field === 'department' && /(?:^|,)[A-Z][a-z]{2,},[A-Z][a-z]{2,}[A-Z][a-z]{5,}/.test(value)) return field;
    // A department may legitimately contain a colon (for example, "UTM:
    // Anthropology"), but these are source-field labels, not department
    // names. Catch them explicitly without rejecting academic naming.
    if (field === 'department' && /(?:^|\b)(?:salary|pay\s+range|employment\s+group|position\s+type|close\s+date|posting\s+date|job\s+type|hours?|responsibilit(?:y|ies)|qualifications?)\s*:/i.test(value)) return field;
    if (FIELDS_REJECT_COLON.has(field) && value.includes(':')) return field;
    if (field === 'availability' && /\bratification\b|\bdocument(?:s)?\b/i.test(value)) return field;
    if (field === 'salary' && !isCanonicalSalary(value)) return field;
    if (field === 'availability' && !isCanonicalAvailability(value)) return field;
    if (field === 'hours' && /anticipated\s+start\s+date\s*:/i.test(value)) return field;
    if (field === 'hours' || field === 'availability' || field === 'academicSchedule' || field === 'academicWorkload' || field === 'academicOfficeHours') {
      if (field === 'hours' && /receive\s+an\s+alert|^n\s*\(/i.test(value)) return field;
      if (/\b(?:department|location|salary|requirements?|exigences?|work\s+modality|work\s+hours?|hours?|workload|schedule|status|vacanc(?:y|ies)|anticipated\s+start\s+date|additional\s+information|information\s+additionnelle)\s*:/i.test(value)) return field;
    }
    if (field === 'educationRequirements' && /\beducation\s*(?:do\s+i\s+need)?\s*[?:]/i.test(value)) return field;
  }
  return null;
}

function duplicatedScalarFields(details: PublishGateDetails): string | null {
  const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  const explicitPairs = [
    ['duration', 'academicTerm'],
    ['duration', 'academicSchedule'],
    ['academicSchedule', 'academicTerm'],
    ['availability', 'academicTerm'],
    ['academicCourse', 'academicTerm'],
    ['hours', 'academicWorkload'],
  ] as const;
  for (const [left, right] of explicitPairs) {
    const leftValue = normalize(details[left]);
    const rightValue = normalize(details[right]);
    if (leftValue && leftValue === rightValue) return `${left}/${right}`;
  }

  const fields = ['hours', 'availability', 'academicSchedule', 'academicWorkload', 'academicOfficeHours'] as const;
  const values = fields
    .map(field => ({ field, value: normalize(details[field]) }))
    .filter(item => item.value.length >= 12);
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i].value === values[j].value) return `${values[i].field}/${values[j].field}`;
    }
  }
  return null;
}

function parseList(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(item => String(item ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function corruptedListField(details: PublishGateDetails): string | null {
  const fields = ['requiredSkills', 'softwareRequirements', 'responsibilityTags', 'qualificationTags'] as const;
  for (const field of fields) {
    const values = parseList(details[field]);
    if (values.some(value => value.length > 500
      || /skip to main content|applylocations|page is loaded|similar jobs|read more|follow us|policy \d+|©/i.test(value)
      || isStructuredProse(value))) {
      return field;
    }
  }
  return null;
}

function isStructuredProse(value: string): boolean {
  return value.length > 180 && /[.!?](?:\s|$)/.test(value)
    || /^(?:our team|we foster|responsible for|coordinates?|produces?|show availability|the successful applicant|will be responsible)/i.test(value);
}

function duplicatedListFields(details: PublishGateDetails): string | null {
  const normalize = (field: keyof PublishGateDetails) => JSON.stringify(parseList(details[field]).map(value => value.toLowerCase()));
  const pairs = [
    ['requiredSkills', 'educationRequirements'],
    ['requiredSkills', 'softwareRequirements'],
    ['responsibilityTags', 'qualificationTags'],
    ['qualificationTags', 'educationRequirements'],
  ] as const;
  for (const [left, right] of pairs) {
    const values = parseList(details[left]);
    if (values.length > 0 && normalize(left) === normalize(right)) return `${left}/${right}`;
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

const TITLE_DURATION_PHRASES = /\b(?:\d+(?:\.\d+)?\s*[-–—]?\s*(?:years?|months?|mths?|weeks?|days?))\s+(?:contract|term|assignment|position)\b(?:\s+with\s+(?:the\s+)?possibility\s+of\s+extension)?/i;

// Words that mark a title as a reposting/administrative annotation rather
// than the actual role name, or portal chrome (cookie banner, etc.) captured
// in place of a real title. Add more as one-liners here.
// No trailing \b: glued-together portal captures (e.g. "...privacyWe use...")
// can run directly into the next word with no space, so requiring a word
// boundary right after the phrase would miss exactly the case this exists for.
const TITLE_FLAGGED_WORDS = /\b(revised|amended|vacanc(?:y|ies)|(?:several|\d+)\s+positions?|up\s+to\s+\d+(?!\s+(?:years?|months?|mths?|weeks?|days?))|general\s+application\s+pool|pipeline\s+posting\s+only|repost(?:ed|ing)?|r[ée]affichage|we (?:use|value) (?:cookies|your privacy))/i;

export function getPublishBlockReason(details: PublishGateDetails): string | null {
  const corruptField = corruptedScalarField(details);
  if (corruptField) return `corrupted field: ${corruptField}`;

  const corruptList = corruptedListField(details);
  if (corruptList) return `corrupted field: ${corruptList}`;

  const duplicateFields = duplicatedScalarFields(details);
  if (duplicateFields) return `duplicated fields: ${duplicateFields}`;

  const duplicateLists = duplicatedListFields(details);
  if (duplicateLists) return `duplicated fields: ${duplicateLists}`;

  if (!isUsableJobTitle(details.title)) return 'unusable title';
  if (TITLE_DURATION_PHRASES.test(details.title)) return 'duration metadata in title';
  if (TITLE_STATUS_WORDS.test(details.title)) return 'employment-status words in title';
  if (TITLE_FLAGGED_WORDS.test(details.title)
    && !/\b(?:tier|grade|level|class)\s+\d+\s+positions?\b/i.test(details.title)) return 'flagged word in title';
  if (/\s+x\s+\d+\s*$/i.test(details.title) || /[-–—]\s*pool\s*$/i.test(details.title)) return 'flagged word in title';

  const normalizedTitle = normalizeJobTitle(details.title);
  if (normalizedTitle !== details.title.replace(/\s+/g, ' ').trim()) return 'un-normalized title metadata';

  return null;
}
