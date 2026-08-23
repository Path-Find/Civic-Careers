import { extractClosingDate } from './closing-date';
import { extractLocation } from './location';
import {
  normalizeWorkModel,
  normalizeEmploymentType,
  normalizeSalaryPeriod,
  normalizeDepartment,
  normalizeUnionFields,
} from './validate';
import { PEOPLE_SOFT_SOURCES } from './title';
import { parseSalaryText } from './salary-format';

export interface ExtractedBoardMetadata {
  title?: string;
  listingType?: string;
  location?: string | null;
  closingDate?: string | null;
  salary?: string;
  employmentType?: string;
  hours?: string;
  workModel?: 'Hybrid' | 'Remote' | 'On-site';
  duration?: string | null;
  department?: string | null;
  isUnionized?: number | null;
  unionName?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryPeriod?: string | null;
}

// Shared fix for the field-gluing bug: many portals render their "label:
// value" block as one line with no newline between fields at all in some
// postings (e.g. "Union: ExemptPosition Type: Permanent..."). A capture
// bounded only by `[^\n]+` silently swallows every field after it into the
// one being captured. `boundedField` stops at whichever comes first: the
// next known label in the same block, a newline, or the end of the text.
//
// Different tenants of the same platform (Workday, SuccessFactors, etc.)
// customize their own field-label vocabulary, so a label list built from one
// source's samples doesn't generalize to another -- a full-data validation
// pass found real remaining corruption this way (e.g. Mississauga's
// SuccessFactors instance uses "Grade:"/"Work Location:" where Shared Health
// Manitoba's uses "Site:"/"City:"). The length cap below (180, matching
// publish-gate.ts's ceilings) is the real backstop: if no known label is
// found within it, the match simply fails and the field is left unset --
// safer than silently capturing hundreds of characters of glued-on text.
function boundedField(label: string, otherLabelsInBlock: string[]): RegExp {
  const nextLabelPattern = `(?:${otherLabelsInBlock.join('|')})\\s*:`;
  const nextLabel = `(?=\\s*${nextLabelPattern}|\\n|$)`;
  // If a field is followed immediately by another label, leave the first
  // field unset rather than treating that label and its value as the value.
  return new RegExp(`${label}:\\s*(?!${nextLabelPattern})([^\\n]{1,180}?)${nextLabel}`, 'i');
}

function parseSalaryMinMax(range: string): { min: number | null; max: number | null } {
  const moneyMatches = range.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?/g);
  if (moneyMatches && moneyMatches.length >= 2) {
    const min = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
    const max = parseFloat(moneyMatches[moneyMatches.length - 1].replace(/[$,]/g, ''));
    return { min, max };
  } else if (moneyMatches && moneyMatches.length === 1) {
    const min = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
    return { min, max: min };
  }
  return { min: null, max: null };
}

/**
 * Parser for City of Hamilton (BambooHR/Custom Layout).
 */
export function parseHamilton(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Hamilton's BambooHR raw text can run with zero newlines (the source of
  // the original title-corruption incident tonight), so these fields are
  // bounded by the next known label, not just newline.
  const HAMILTON_FIELD_LABELS = ['Union', 'Close date', 'Duration', 'Job Type', 'Salary'];

  // Extract Union
  const unionMatch = rawText.match(boundedField('Union', HAMILTON_FIELD_LABELS));
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Extract Close date
  const closeMatch = rawText.match(/Close date:[\s\S]*?\bon\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
    || rawText.match(/Close date:[\s\S]*?\bby\s+[^:\n]+?\bon\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i)
    || rawText.match(/Close date:[\s\S]*?([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  if (closeMatch) {
    metadata.closingDate = extractClosingDate(closeMatch[0]);
  }

  // Extract Duration
  const durationMatch = rawText.match(boundedField('Duration', HAMILTON_FIELD_LABELS));
  if (durationMatch) {
    metadata.duration = durationMatch[1].trim();
    metadata.employmentType = 'Contract';
  } else {
    metadata.employmentType = 'Permanent';
  }

  // Extract Work Model
  const hybridMatch = rawText.match(/\((Hybrid|Remote|On-site)\)/i);
  if (hybridMatch) {
    metadata.workModel = normalizeWorkModel(hybridMatch[1]);
  } else if (/hybrid/i.test(rawText)) {
    metadata.workModel = 'Hybrid';
  } else if (/remote/i.test(rawText)) {
    metadata.workModel = 'Remote';
  } else {
    metadata.workModel = 'On-site';
  }

  // Extract Department
  const deptMatch = rawText.match(/([A-Za-z\s&]+)\s+-\s+Hamilton,\s+Ontario/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  return metadata;
}

/**
 * Parser for City of Toronto (SuccessFactors Layout).
 */
const CITY_OF_TORONTO_FIELD_LABELS = [
  'Division\\s*&\\s*Section', 'Work Location', 'Job Type\\s*&\\s*Duration',
  'Salary Range', 'Shift Information', 'Affiliation', 'Posting Period',
  'Number of Positions', 'Job Classification', 'Posting Date',
];

function cityOfTorontoField(label: string): RegExp {
  return boundedField(label, CITY_OF_TORONTO_FIELD_LABELS);
}

export function parseCityOfToronto(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Department
  const deptMatch = rawText.match(cityOfTorontoField('Division\\s*&\\s*Section'));
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Location
  const locMatch = rawText.match(cityOfTorontoField('Work Location'));
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Job Type & Duration
  const typeDurationMatch = rawText.match(cityOfTorontoField('Job Type\\s*&\\s*Duration'));
  if (typeDurationMatch) {
    const val = typeDurationMatch[1];
    metadata.employmentType = normalizeEmploymentType(val);
    if (/permanent/i.test(val)) {
      metadata.duration = 'Permanent';
    } else {
      const dur = val.match(/(\d+\s+months?|\d+\s+years?|temporary)/i);
      metadata.duration = dur ? dur[0] : 'Contract';
    }
  }

  // Salary Range
  const salaryMatch = rawText.match(cityOfTorontoField('Salary Range'));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Shift Information / Hours
  const shiftMatch = rawText.match(cityOfTorontoField('Shift Information'));
  if (shiftMatch) {
    metadata.hours = shiftMatch[1].trim();
  }

  // Affiliation / Union
  const unionMatch = rawText.match(cityOfTorontoField('Affiliation'));
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Posting Period
  const periodMatch = rawText.match(cityOfTorontoField('Posting Period'));
  if (periodMatch) {
    metadata.closingDate = extractClosingDate(periodMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Workday engine sites (Waterloo, Brock, Algonquin, etc.).
 */
// Workday's "Department:...Campus:...Union Affiliation:..." section (seen on
// University of Ottawa, Brock, and others) glues fields together with no
// newline, the same way PeopleSoft does -- this is the exact pattern behind
// tonight's original department-corruption incident.
const WORKDAY_FIELD_LABELS = [
  'Department', 'Campus', 'Date Posted \\(YYYY/MM/DD\\)',
  'Applications must be received BEFORE \\(YYYY/MM/DD\\)', 'Union Affiliation',
  'Job Family', 'Job Type', 'Salary Grade', 'Salary Range', 'Hiring Range',
  'Salary',
  'Scheduled Weekly Hours', 'Anticipated Start Date', 'Term', 'Length of Contract',
  'Posting Closing Date', 'Closing Date', 'Note',
];

function workdayField(label: string): RegExp {
  return boundedField(label, WORKDAY_FIELD_LABELS);
}

export function parseWorkday(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Location and Time Type
  // Length-capped: some postings' header omits "time type" entirely, so the
  // lazy .*? would otherwise run until the next occurrence of that phrase
  // anywhere later in the document, swallowing the whole posting in between.
  const workdayHeaderMatch = rawText.match(/locations\s*(.{0,80}?)\s*time type\s*(.{0,40}?)\s*posted on/i);
  if (workdayHeaderMatch) {
    metadata.location = workdayHeaderMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(workdayHeaderMatch[2]);
  }

  // Department
  const deptMatch = rawText.match(workdayField('Department'));
  if (deptMatch) {
    // Some Workday tenants glue the FT marker to the next Campus label:
    // `Department of Physics_FTCampus:Main Campus`. The marker is not part
    // of the department and must not become the start of a page-sized capture.
    metadata.department = normalizeDepartment(deptMatch[1].replace(/[_\s]+FT$/i, ''));
  }

  // Salary
  const salaryMatch = rawText.match(workdayField('Salary Range')) || rawText.match(workdayField('Hiring Range'));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Scheduled Weekly Hours
  const hoursMatch = rawText.match(workdayField('Scheduled Weekly Hours'));
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Term / Length of Contract
  const termMatch = rawText.match(workdayField('Term')) || rawText.match(workdayField('Length of Contract'));
  if (termMatch) {
    const term = termMatch[1].trim();
    if (term && !/^(?:n\/?a|none)$/i.test(term)) {
      metadata.duration = term;
      metadata.employmentType = 'Contract';
    }
  }

  // Closing date
  const closingMatch = rawText.match(workdayField('Posting Closing Date')) || rawText.match(workdayField('Closing Date'));
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Ontario Health atHome (iCIMS Layout).
 */
export function parseOntarioHealthAtHome(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Status (Employment Type)
  const statusMatch = rawText.match(/Status:\s*([^\n;]+)/i);
  if (statusMatch) {
    metadata.employmentType = normalizeEmploymentType(statusMatch[1]);
  }

  // Location
  const locMatch = rawText.match(/Location:\s*([^\n;]+)/i);
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Salary
  const salaryMatch = rawText.match(/(?:salary|wage)[^:\n]*?:\s*([^\n]+)/i)
    || rawText.match(/(?:Hourly wage|Annual Salary|Salary)[^\n]+?(\$\d[\d,.\s]+(?:to|-)\s*\$\d[\d,.\s]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Union
  if (/OPSEU/i.test(rawText)) {
    metadata.isUnionized = 1;
    metadata.unionName = 'OPSEU';
  } else if (/ONA/i.test(rawText)) {
    metadata.isUnionized = 1;
    metadata.unionName = 'ONA';
  } else if (/Non-Union/i.test(rawText)) {
    metadata.isUnionized = 0;
    metadata.unionName = null;
  }

  return metadata;
}

/**
 * Parser for ADP Workforce Now.
 */
const ADP_FIELD_LABELS = [
  'Salary Range', 'Department\\s*(?:and\\s*Commission)?', 'Vacancy\\s*Type',
  'Employment\\s*Type', 'Application\\s*Deadline', 'Affiliation',
  'Requisition ID', 'Location', 'Posting Date', 'Vacancy Reason', 'Union',
];

export function parseADP(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary Range
  // ADP sometimes glues the first sentence of the posting directly onto the
  // pay period (`HourlyThe Corporation...`), so a label-bounded capture cannot
  // safely stop there. Extract the first explicit range and period instead.
  const salaryLabel = rawText.match(/Salary\s+Range\s*:\s*([\s\S]{1,180})/i);
  const parsedSalary = parseSalaryText(salaryLabel?.[1]);
  if (parsedSalary) {
    metadata.salary = parsedSalary.display;
    metadata.salaryMin = parsedSalary.min;
    metadata.salaryMax = parsedSalary.max;
    metadata.salaryPeriod = parsedSalary.period;
  }

  const hoursMatch = rawText.match(/\b(\d{1,3}(?:\.\d{1,2})?)\s+hours?\s*(?:per\s+week|\/\s*week)\b/i);
  if (hoursMatch) metadata.hours = `${hoursMatch[1]} hours per week`;

  // Department
  const deptMatch = rawText.match(boundedField('Department\\s*(?:and\\s*Commission)?', ADP_FIELD_LABELS));
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Vacancy Type / Employment Type
  const typeMatch = rawText.match(boundedField('(?:Vacancy|Employment)\\s*Type', ADP_FIELD_LABELS))
    || rawText.match(/\b(Temporary\s+Part\s+Time|Temporary\s+Full\s+Time|Part\s+Time|Full\s+Time)\b/i);
  if (typeMatch) {
    const val = typeMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
    if (/temp|contract/i.test(val)) {
      metadata.duration = 'Contract';
    } else {
      metadata.duration = 'Permanent';
    }
  }

  // Closing date
  const closingMatch = rawText.match(boundedField('Application\\s*Deadline', ADP_FIELD_LABELS));
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Dayforce candidate portal.
 */
const DAYFORCE_FIELD_LABELS = [
  'Rate\\s+of\\s+Pay', 'Salary\\s+Range', 'Employment\\s*type', 'Duration\\s+of\\s+employment',
  'Duration', 'Hours\\s+of\\s+work', 'Work\\s+location', 'Location', 'Business\\s*unit', 'Division',
];

export function parseDayforce(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Rate of Pay / Salary
  const salaryMatch = rawText.match(boundedField('(?:Rate\\s+of\\s+Pay|Salary\\s+Range)', DAYFORCE_FIELD_LABELS))
    || rawText.match(/Rate\s+of\s+Pay\s*[:\-]?\s*([^.!]{3,100})/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Employment Type
  const typeMatch = rawText.match(boundedField('Employment\\s*type', DAYFORCE_FIELD_LABELS));
  if (typeMatch) {
    const val = typeMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
  }

  // Duration
  const durationMatch = rawText.match(boundedField('Duration\\s+of\\s+employment', DAYFORCE_FIELD_LABELS))
    || rawText.match(boundedField('Duration', DAYFORCE_FIELD_LABELS));
  if (durationMatch) {
    metadata.duration = durationMatch[1].trim();
    metadata.employmentType = 'Contract';
  }

  // Hours
  const hoursMatch = rawText.match(boundedField('Hours\\s+of\\s+work', DAYFORCE_FIELD_LABELS));
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Location
  const locMatch = rawText.match(boundedField('Work\\s+location', DAYFORCE_FIELD_LABELS))
    || rawText.match(boundedField('Location', DAYFORCE_FIELD_LABELS));
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Department / Division / Business Unit
  const deptMatch = rawText.match(boundedField('Business\\s*unit', DAYFORCE_FIELD_LABELS))
    || rawText.match(boundedField('Division', DAYFORCE_FIELD_LABELS));
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  return metadata;
}

/**
 * Parser for Njoyn engine sites (Vaughan, Oshawa, Queen's, Carleton, etc.).
 */
const NJOYN_FIELD_LABELS = ['Salary', 'Job\\s*Type', 'Hours\\s+of\\s+work', 'Union', 'Vacancy\\s*Type', 'JD#'];

export function parseNjoyn(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary
  const salaryMatch = rawText.match(boundedField('Salary', NJOYN_FIELD_LABELS));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Job Type
  const typeMatch = rawText.match(boundedField('Job\\s*Type', NJOYN_FIELD_LABELS));
  if (typeMatch) {
    const val = typeMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
  }

  // Hours of work
  const hoursMatch = rawText.match(boundedField('Hours\\s+of\\s+work', NJOYN_FIELD_LABELS));
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Union
  const unionMatch = rawText.match(boundedField('Union', NJOYN_FIELD_LABELS));
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Vacancy Type / Duration
  const vacancyMatch = rawText.match(boundedField('Vacancy\\s*Type', NJOYN_FIELD_LABELS));
  if (vacancyMatch) {
    const val = vacancyMatch[1].trim();
    if (/temp|contract/i.test(val)) {
      metadata.duration = 'Contract';
      metadata.employmentType = 'Contract';
    }
  }

  // Standalone tenure directly below JD#:
  const njoynTenureMatch = rawText.match(/JD#:\s*\n+([^\n]+)/i) || rawText.match(/JD#:\s*([^\n]+)/i);
  if (njoynTenureMatch) {
    const val = njoynTenureMatch[1].trim();
    if (/contract|temporary|seasonal|permanent/i.test(val)) {
      metadata.duration = val;
      if (!metadata.employmentType) {
        metadata.employmentType = normalizeEmploymentType(val);
      }
    }
  }

  return metadata;
}

/**
 * Parser for Taleo engine sites (Oakville, Seneca, Catharines, OCAD, Humber).
 */
export function parseTaleo(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Department
  const deptMatch = rawText.match(/Department\s*\n+([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Pay Range
  const salaryMatch = rawText.match(/Pay\s*Range\s*\n+([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Job Details
  const detailsMatch = rawText.match(/Job\s+Details\s*([^\n]+)/i);
  if (detailsMatch) {
    const val = detailsMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
  }

  // Closing Date
  const closingMatch = rawText.match(/Closing\s+Date\s*\n+([^\n]+)/i) || rawText.match(/Closing\s+Date\s*([^\n]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  return metadata;
}

/**
 * Parser for SuccessFactors platform sites (Shared Health Manitoba, Mississauga, Halton Region, Ottawa, TTC).
 */
const SUCCESS_FACTORS_FIELD_LABELS = [
  'Salary', 'Department\\s*/\\s*Unit', 'Department', 'Site', 'City', 'Union',
  'Posting\\s+End\\s+Date', 'Work\\s+Arrangement', 'FTE', 'Requisition ID',
  'Position Number', 'Shift',
];

function successFactorsField(label: string): RegExp {
  return boundedField(label, SUCCESS_FACTORS_FIELD_LABELS);
}

export function parseSuccessFactors(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary
  const salaryMatch = rawText.match(successFactorsField('Salary'));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Department
  const deptMatch = rawText.match(successFactorsField('Department\\s*(?:/\\s*Unit)?'));
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Location / City / Site
  const locMatch = rawText.match(successFactorsField('Site')) || rawText.match(successFactorsField('City'));
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Union
  const unionMatch = rawText.match(successFactorsField('Union'));
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Closing date
  const closingMatch = rawText.match(successFactorsField('Posting\\s+End\\s+Date'));
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  // Work Arrangement
  const arrangementMatch = rawText.match(successFactorsField('Work\\s+Arrangement'));
  if (arrangementMatch) {
    metadata.workModel = normalizeWorkModel(arrangementMatch[1]);
  }

  // FTE / Hours
  const fteMatch = rawText.match(successFactorsField('FTE'));
  if (fteMatch) {
    metadata.hours = `FTE: ${fteMatch[1].trim()}`;
  }

  return metadata;
}

/**
 * Parser for Technomedia (York University).
 */
export function parseTechnomedia(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  const deptMatch = rawText.match(/Department\/Faculty \(BU\)\s*\n+\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  const affMatch = rawText.match(/Affiliation \*\s*\n+\s*([^\n]+)/i);
  if (affMatch) {
    const rawAff = affMatch[1].trim();
    const isUnion = !/work study|non-?union|management|exempt/i.test(rawAff);
    const normalizedUnion = normalizeUnionFields(rawAff, isUnion);
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  const detailsMatch = rawText.match(/Job Details \*\s*\n+\s*([^\n]+)/i);
  if (detailsMatch) {
    metadata.employmentType = normalizeEmploymentType(detailsMatch[1]);
  }

  const endMatch = rawText.match(/Job End Date\s*\n+\s*([^\n]+)/i);
  if (endMatch) {
    const val = endMatch[1].trim();
    if (val && !/ongoing/i.test(val)) {
      metadata.duration = val;
      if (!metadata.employmentType) {
        metadata.employmentType = 'Contract';
      }
    }
  }

  const compMatch = rawText.match(/Compensation \*\s*\n+\s*([^\n]+)/i) || rawText.match(/Compensation\s*\n+\s*([^\n]+)/i);
  if (compMatch) {
    const range = compMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  const hoursMatch = rawText.match(/Total Weekly Hours of Work\s*\n+\s*([^\n]+)/i);
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  const locMatch = rawText.match(/Job Location\s*\n+\s*([^\n]+)/i);
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  return metadata;
}

/**
 * Parser for Jobs2Web platform postings.
 */
export function parseJobs2Web(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  const salaryMatch = rawText.match(/Salary:\s*(.+?)(?=\s*(?:Job Closing Date|Closing Date|Job Description|$))/i)
    || rawText.match(/Rate of Pay:\s*(.+?)(?=\s*(?:Job Closing Date|Closing Date|Job Description|$))/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  const closingMatch = rawText.match(/(?:Job Closing Date|Closing Date)\s*(?:\([^)]*\))?:\s*([^\n;]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Government of Canada custom postings.
 */
export function parseGovernmentOfCanada(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  const closingMatch = rawText.match(/Closing date:\s*\n*\s*([^\n]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  const salaryMatch = rawText.match(/Salary\s*\n+\s*([^\n]+)/i)
    || rawText.match(boundedField('Salary', ['Closing date', 'Location', 'Reference number', 'Selection process number', 'Who can apply']));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Some postings render an empty Location section (all whitespace), in
  // which case this used to keep consuming through the blank lines until it
  // hit unrelated page chrome much further down (a "job alert" widget).
  const locMatch = rawText.match(/Location\s*\n+([\s\S]{1,600}?)(?=\n\s*(?:Salary|Reference number|Selection process number|Who can apply|Select how often|Create Alert|$))/i);
  if (locMatch) {
    const locLines = locMatch[1]
      .split('\n')
      .map(l => l.trim().replace(/,$/, ''))
      .filter(Boolean)
      .join(', ')
      .replace(/\s+/g, ' ');
    metadata.location = locLines;
  }

  return metadata;
}

/** DCC is syndicated through GC Jobs but uses a distinct Taleo field layout. */
export function parseDefenceConstructionCanada(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};
  const salary = rawText.match(/Salary\s+Range\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const parsedSalary = salary ? parseSalaryText(salary, 'yearly') : null;
  if (parsedSalary) {
    metadata.salary = parsedSalary.display;
    metadata.salaryMin = parsedSalary.min;
    metadata.salaryMax = parsedSalary.max;
    metadata.salaryPeriod = parsedSalary.period;
  }
  const location = rawText.match(/\bLocation\s*(?::\s*|\n+\s*)([^\n]+)/i)?.[1]?.trim();
  if (location) metadata.location = location;
  const employment = rawText.match(/Employment\s+status\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (employment) metadata.employmentType = normalizeEmploymentType(employment);
  const workModel = rawText.match(/Flexible\s+work\s+option\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (workModel) metadata.workModel = normalizeWorkModel(workModel);
  const closing = rawText.match(/Closing\s+Date\s*:\s*([^\n]+)/i)?.[1]?.trim();
  if (closing) metadata.closingDate = extractClosingDate(`Closing Date: ${closing}`);
  return metadata;
}

/**
 * Parser for PeopleSoft Fluid tenant postings.
 */
// PeopleSoft sources (Calgary, TMU, TransLink, Western, Winnipeg, McMaster,
// Durham/Niagara Region, Fleming) render their "Position and Pay Information"
// block as label-glued text with no newline between fields at all in some
// postings (e.g. "Union: ExemptPosition Type: Permanent and Temporary
// Compensation: ..."). A capture bounded only by `[^\n]+` silently swallows
// every field after it into the one being captured. Bound each capture with
// a lookahead for the next known label instead, so it stops at whichever
// comes first: the next label, a newline, or the end of the text.
const PEOPLE_SOFT_FIELD_LABELS = [
  'Business Unit', 'Union', 'Position Type', 'Compensation', 'Hours of work',
  'Days of work', 'Location', 'Audience', 'Apply By', 'Job ID', 'Department',
  'Salary Range', 'Salary', 'Closing Date', 'Affiliation', 'Bargaining Unit',
];

function peopleSoftField(label: string): RegExp {
  return boundedField(label, PEOPLE_SOFT_FIELD_LABELS);
}

export function parsePeopleSoft(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  const deptMatch = rawText.match(peopleSoftField('Department')) || rawText.match(/Department\s*\n+([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  const salaryMatch = rawText.match(peopleSoftField('Salary Range'))
    || rawText.match(/Salary\s*Range\s*\n+([^\n]+)/i)
    || rawText.match(peopleSoftField('Salary'));
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  const closingMatch = rawText.match(peopleSoftField('Closing Date'))
    || rawText.match(/Closing Date\s*\n+([^\n]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  const unionMatch = rawText.match(peopleSoftField('Affiliation'))
    || rawText.match(peopleSoftField('Union'))
    || rawText.match(peopleSoftField('Bargaining Unit'));
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const isUnion = !/non-?union|management|exempt/i.test(rawUnion);
    const normalizedUnion = normalizeUnionFields(rawUnion, isUnion);
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  return metadata;
}

/**
 * Dispatcher to select and execute the correct parser based on the job source.
 */
export function extractBoardSpecificMetadata(source: string, rawText: string): ExtractedBoardMetadata {
  if (source === 'City of Hamilton') {
    return parseHamilton(rawText);
  }
  if (source === 'City of Toronto') {
    return parseCityOfToronto(rawText);
  }
  if (source === 'Ontario Health atHome') {
    return parseOntarioHealthAtHome(rawText);
  }
  if (source === 'York University') {
    return parseTechnomedia(rawText);
  }

  // Jobs2Web sources
  const jobs2WebSources = new Set([
    'Canada Post',
    'University of Toronto',
    'CMHC',
    'University of Guelph',
    'City of Vancouver',
    'City of Richmond Hill',
    'City of Brampton',
    'Region of Waterloo',
  ]);
  if (jobs2WebSources.has(source)) {
    return parseJobs2Web(rawText);
  }

  // Government of Canada
  if (source === 'Government of Canada') {
    return parseGovernmentOfCanada(rawText);
  }
  if (source === 'Defence Construction Canada') {
    return parseDefenceConstructionCanada(rawText);
  }

  // PeopleSoft sources
  if (PEOPLE_SOFT_SOURCES.has(source)) {
    return parsePeopleSoft(rawText);
  }

  // SuccessFactors sources
  const successFactorsSources = new Set([
    'Shared Health Manitoba',
    'Mississauga',
    'Halton Region',
    'City of Ottawa',
    'TTC',
  ]);
  if (successFactorsSources.has(source)) {
    return parseSuccessFactors(rawText);
  }

  // ADP sources
  const adpSources = new Set([
    'Municipality of Clarington',
    'City of Markham',
    'Town of Aurora',
    'City of Sarnia',
  ]);
  if (adpSources.has(source)) {
    return parseADP(rawText);
  }

  // Dayforce sources
  const dayforceSources = new Set([
    'TRCA',
    'Infrastructure Ontario',
    'City of St. Thomas',
    'Town of Orangeville',
  ]);
  if (dayforceSources.has(source)) {
    return parseDayforce(rawText);
  }

  // Njoyn sources
  const njoynSources = new Set([
    'City of Oshawa',
    'City of Vaughan',
    'Centennial College',
    'Sheridan College',
    'Carleton University',
    "Queen's University",
  ]);
  if (njoynSources.has(source)) {
    return parseNjoyn(rawText);
  }

  // Taleo sources
  const taleoSources = new Set([
    'Town of Oakville',
    'Seneca College',
    'City of St. Catharines',
    'OCAD University',
    'Humber College',
  ]);
  if (taleoSources.has(source)) {
    return parseTaleo(rawText);
  }

  // Workday sources
  const workdaySources = new Set([
    'University of Waterloo',
    'Brock University',
    'UBC',
    'Algonquin College',
    'Fanshawe College',
    'City of Burlington',
    'Town of Ajax',
    'Town of Whitby',
    'Town of Milton',
    'University of Ottawa',
  ]);
  if (workdaySources.has(source)) {
    return parseWorkday(rawText);
  }

  return {};
}
