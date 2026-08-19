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
    const moneyMatches = range.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
    if (moneyMatches && moneyMatches.length >= 2) {
      metadata.salaryMin = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
      metadata.salaryMax = parseFloat(moneyMatches[moneyMatches.length - 1].replace(/[$,]/g, ''));
      metadata.salaryPeriod = normalizeSalaryPeriod(range);
    } else if (moneyMatches && moneyMatches.length === 1) {
      metadata.salaryMin = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
      metadata.salaryMax = metadata.salaryMin;
      metadata.salaryPeriod = normalizeSalaryPeriod(range);
    }
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
    const moneyMatches = range.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
    if (moneyMatches && moneyMatches.length >= 2) {
      metadata.salaryMin = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
      metadata.salaryMax = parseFloat(moneyMatches[moneyMatches.length - 1].replace(/[$,]/g, ''));
      metadata.salaryPeriod = normalizeSalaryPeriod(range);
    } else if (moneyMatches && moneyMatches.length === 1) {
      metadata.salaryMin = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
      metadata.salaryMax = metadata.salaryMin;
      metadata.salaryPeriod = normalizeSalaryPeriod(range);
    }
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
    const moneyMatches = range.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g);
    if (moneyMatches && moneyMatches.length >= 2) {
      metadata.salaryMin = parseFloat(moneyMatches[0].replace(/[$,]/g, ''));
      metadata.salaryMax = parseFloat(moneyMatches[moneyMatches.length - 1].replace(/[$,]/g, ''));
      metadata.salaryPeriod = normalizeSalaryPeriod(range);
    }
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
