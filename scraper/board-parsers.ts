import { extractClosingDate } from './closing-date';
import { extractLocation } from './location';
import {
  normalizeWorkModel,
  normalizeEmploymentType,
  normalizeSalaryPeriod,
  normalizeDepartment,
  normalizeUnionFields,
} from './validate';

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

  // Extract Union
  const unionMatch = rawText.match(/Union:\s*([^\n]+)/i);
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
  const durationMatch = rawText.match(/Duration:\s*([^\n]+)/i);
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
export function parseCityOfToronto(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Department
  const deptMatch = rawText.match(/Division\s*&\s*Section:\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Location
  const locMatch = rawText.match(/Work Location:\s*([^\n]+)/i);
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Job Type & Duration
  const typeDurationMatch = rawText.match(/Job Type\s*&\s*Duration:\s*([^\n]+)/i);
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
  const salaryMatch = rawText.match(/Salary Range:\s*([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Shift Information / Hours
  const shiftMatch = rawText.match(/Shift Information:\s*([^\n]+)/i);
  if (shiftMatch) {
    metadata.hours = shiftMatch[1].trim();
  }

  // Affiliation / Union
  const unionMatch = rawText.match(/Affiliation:\s*([^\n]+)/i);
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Posting Period
  const periodMatch = rawText.match(/Posting Period:\s*([^\n]+)/i);
  if (periodMatch) {
    metadata.closingDate = extractClosingDate(periodMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Workday engine sites (Waterloo, Brock, Algonquin, etc.).
 */
export function parseWorkday(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Location and Time Type
  const workdayHeaderMatch = rawText.match(/locations\s*(.*?)\s*time type\s*(.*?)\s*posted on/i);
  if (workdayHeaderMatch) {
    metadata.location = workdayHeaderMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(workdayHeaderMatch[2]);
  }

  // Department
  const deptMatch = rawText.match(/Department:\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Salary
  const salaryMatch = rawText.match(/Salary Range:\s*([^\n]+)/i) || rawText.match(/Hiring Range:\s*([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Scheduled Weekly Hours
  const hoursMatch = rawText.match(/Scheduled Weekly Hours:\s*([^\n]+)/i);
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Term / Length of Contract
  const termMatch = rawText.match(/Term:\s*([^\n]+)/i) || rawText.match(/Length of Contract:\s*([^\n]+)/i);
  if (termMatch) {
    const term = termMatch[1].trim();
    if (term && !/^(?:n\/?a|none)$/i.test(term)) {
      metadata.duration = term;
      metadata.employmentType = 'Contract';
    }
  }

  // Closing date
  const closingMatch = rawText.match(/Posting Closing Date:\s*([^\n]+)/i) || rawText.match(/Closing Date:\s*([^\n]+)/i);
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
export function parseADP(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary Range
  const salaryMatch = rawText.match(/Salary Range:\s*([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Department
  const deptMatch = rawText.match(/Department\s*(?:and\s*Commission)?:\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Vacancy Type / Employment Type
  const typeMatch = rawText.match(/(?:Vacancy|Employment)\s*Type:\s*([^\n]+)/i)
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
  const closingMatch = rawText.match(/Application\s*Deadline:\s*([^\n]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  return metadata;
}

/**
 * Parser for Dayforce candidate portal.
 */
export function parseDayforce(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Rate of Pay / Salary
  const salaryMatch = rawText.match(/(?:Rate\s+of\s+Pay|Salary\s+Range):\s*([^\n]+)/i)
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
  const typeMatch = rawText.match(/Employment\s*type:\s*([^\n]+)/i);
  if (typeMatch) {
    const val = typeMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
  }

  // Duration
  const durationMatch = rawText.match(/Duration\s+of\s+employment:\s*([^\n]+)/i) || rawText.match(/Duration:\s*([^\n]+)/i);
  if (durationMatch) {
    metadata.duration = durationMatch[1].trim();
    metadata.employmentType = 'Contract';
  }

  // Hours
  const hoursMatch = rawText.match(/Hours\s+of\s+work:\s*([^\n]+)/i);
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Location
  const locMatch = rawText.match(/Work\s+location:\s*([^\n]+)/i) || rawText.match(/Location\s*[:\-]?\s*([^\n]+)/i);
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Department / Division / Business Unit
  const deptMatch = rawText.match(/Business\s*unit:\s*([^\n]+)/i) || rawText.match(/Division:\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  return metadata;
}

/**
 * Parser for Njoyn engine sites (Vaughan, Oshawa, Queen's, Carleton, etc.).
 */
export function parseNjoyn(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary
  const salaryMatch = rawText.match(/Salary:\s*([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Job Type
  const typeMatch = rawText.match(/Job\s*Type:\s*([^\n]+)/i);
  if (typeMatch) {
    const val = typeMatch[1].trim();
    metadata.employmentType = normalizeEmploymentType(val);
  }

  // Hours of work
  const hoursMatch = rawText.match(/Hours\s+of\s+work:\s*([^\n]+)/i);
  if (hoursMatch) {
    metadata.hours = hoursMatch[1].trim();
  }

  // Union
  const unionMatch = rawText.match(/Union:\s*([^\n]+)/i);
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Vacancy Type / Duration
  const vacancyMatch = rawText.match(/Vacancy\s*Type:\s*([^\n]+)/i);
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
export function parseSuccessFactors(rawText: string): ExtractedBoardMetadata {
  const metadata: ExtractedBoardMetadata = {};

  // Salary
  const salaryMatch = rawText.match(/Salary:\s*([^\n]+)/i);
  if (salaryMatch) {
    const range = salaryMatch[1].trim();
    metadata.salary = range;
    const parsed = parseSalaryMinMax(range);
    metadata.salaryMin = parsed.min;
    metadata.salaryMax = parsed.max;
    metadata.salaryPeriod = normalizeSalaryPeriod(range);
  }

  // Department
  const deptMatch = rawText.match(/Department\s*(?:\/\s*Unit)?:\s*([^\n]+)/i);
  if (deptMatch) {
    metadata.department = normalizeDepartment(deptMatch[1]);
  }

  // Location / City / Site
  const locMatch = rawText.match(/Site:\s*([^\n]+)/i) || rawText.match(/City:\s*([^\n]+)/i);
  if (locMatch) {
    metadata.location = locMatch[1].trim();
  }

  // Union
  const unionMatch = rawText.match(/Union:\s*([^\n]+)/i);
  if (unionMatch) {
    const rawUnion = unionMatch[1].trim();
    const normalizedUnion = normalizeUnionFields(rawUnion, !/non-?union/i.test(rawUnion));
    metadata.isUnionized = normalizedUnion.is_unionized ? 1 : 0;
    metadata.unionName = normalizedUnion.union_name || null;
  }

  // Closing date
  const closingMatch = rawText.match(/Posting\s+End\s+Date:\s*([^\n]+)/i);
  if (closingMatch) {
    metadata.closingDate = extractClosingDate(closingMatch[0]);
  }

  // Work Arrangement
  const arrangementMatch = rawText.match(/Work\s+Arrangement:\s*([^\n]+)/i);
  if (arrangementMatch) {
    metadata.workModel = normalizeWorkModel(arrangementMatch[1]);
  }

  // FTE / Hours
  const fteMatch = rawText.match(/FTE:\s*([^\n]+)/i);
  if (fteMatch) {
    metadata.hours = `FTE: ${fteMatch[1].trim()}`;
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
