export interface SoftwareBackfillResult {
  values: string[];
  skippedOptionalLines: number;
}

/** High-school family (Grade 12, GED, OSSD, secondary/high school) — education field. */
const HIGH_SCHOOL_EDUCATION_TERM = /\b(?:grade\s*12|g\.?e\.?d\.?|o\.?s\.?s\.?d\.?|high\s+school|secondary\s+school|mature\s+high\s+school|c\.?a\.?e\.?c\.?)\b/i;

const OTHER_CERTIFICATION_PATTERN = /\b(?:WHMIS|Smart\s+Serve|Food\s+Handler|Nonviolent\s+Crisis\s+Intervention)\b/i;

/**
 * Compact First Aid / CPR / AED requirement lines into a short label.
 * e.g. "Current Standard First Aid with CPR-C Certification." → "Standard First Aid with CPR-C"
 */
export function normalizeFirstAidCertification(text: string): string | null {
  if (!text || !/\bfirst[-\s]?aid\b|\bcpr\b|\baed\b|defibrillator/i.test(text)) return null;
  if (STRUCTURED_OPTIONAL_REQUIREMENT.test(text)) return null;

  const hasFirstAid = /\bfirst[-\s]?aid\b/i.test(text);
  const hasCpr = /\bcpr\b/i.test(text);
  if (!hasFirstAid && !hasCpr && /\baed\b|defibrillator/i.test(text)) return 'AED';

  // These are distinct credentials, not generic First Aid labels. Leave
  // them intact rather than reducing the brand/program name to "First Aid".
  if (/\b(?:mental health|psychological|st\.?\s*john'?s|first responder)\b[^\n]{0,80}\bfirst[-\s]?aid\b/i.test(text)) {
    return null;
  }
  // Basic Cardiac Life Support is an alternative to CPR here, not a synonym.
  if (/\b(?:basic cardiac life support|BLS)\b/i.test(text) && /\b(?:or|and\/or)\b/i.test(text)) {
    return null;
  }

  // Pure soft-skill "ability to provide first aid" with no cert level/CPR — skip.
  if (/\bability to (?:provide|perform|administer)\s+first[-\s]?aid\b/i.test(text)
    && !/\b(?:standard|emergency|basic|intermediate|advanced)\s+first[-\s]?aid\b/i.test(text)
    && !/\bcpr\b/i.test(text)
    && !/\bcertif/i.test(text)) {
    return null;
  }

  let level = 'First Aid';
  const standardAndIntermediate = /\bstandard\s+or\s+intermediate\s+first[-\s]?aid\b/i.test(text)
    || /\bstandard\s+first[-\s]?aid\b[\s\S]{0,80}\b(?:or|and|\/)\b[\s\S]{0,40}\bintermediate\s+first[-\s]?aid\b/i.test(text)
    || /\bintermediate\s+first[-\s]?aid\b[\s\S]{0,80}\b(?:or|and|\/)\b[\s\S]{0,40}\bstandard\s+first[-\s]?aid\b/i.test(text)
    || /\bintermediate\/standard\s+first[-\s]?aid\b/i.test(text);
  if (standardAndIntermediate) level = 'Standard or Intermediate First Aid';
  else if (/\bstandard\s+first[-\s]?aid\b/i.test(text)) level = 'Standard First Aid';
  else if (/\bemergency\s+first[-\s]?aid\b/i.test(text)) level = 'Emergency First Aid';
  else if (/\bintermediate\s+first[-\s]?aid\b/i.test(text)) level = 'Intermediate First Aid';
  else if (/\bbasic\s+first[-\s]?aid\b/i.test(text)) level = 'Basic First Aid';
  else if (/\badvanced\s+first[-\s]?aid\b/i.test(text)) level = 'Advanced First Aid';
  else if (!/\bfirst[-\s]?aid\b/i.test(text) && /\bcpr\b/i.test(text)) level = 'CPR';

  let cpr = '';
  const aedAlternative = /\bcpr\b[^\n]{0,20}\b(?:or|and\/or)\s+aed\b/i.test(text);
  if (/\bcpr(?:\s*[-–—]?\s*|\s+level\s*)["']?c\b/i.test(text)
    || /\blevel\s*["']?c["']?\s+cpr\b/i.test(text)
    || /\bclass\s+c\b/i.test(text)
    || /\bcpr-c\b/i.test(text)) cpr = 'CPR-C';
  else if (/\bcpr(?:\s*[-–—]?\s*|\s+level\s*)["']?b\b/i.test(text) || /\bcpr-b\b/i.test(text)) cpr = 'CPR-B';
  else if (/\bcpr(?:\s*[-–—]?\s*|\s+level\s*)["']?a\b/i.test(text) || /\bcpr-a\b/i.test(text)) cpr = 'CPR-A';
  else if (/\bcpr\b/i.test(text) && level !== 'CPR') cpr = 'CPR';

  const aed = /\baed\b|defibrillator/i.test(text);

  if (level === 'CPR') {
    if (cpr && cpr !== 'CPR') return aed ? `${cpr}/AED` : cpr;
    return aed ? 'CPR/AED' : 'CPR';
  }
  if (cpr && aedAlternative) return `${level} with ${cpr} or AED`;
  if (cpr && aed) return `${level} with ${cpr}/AED`;
  if (cpr) return `${level} with ${cpr}`;
  if (aed) return `${level} with AED`;
  if (level === 'First Aid' && !/\bfirst[-\s]?aid\b/i.test(text)) return null;
  return level;
}

function certificationValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/[,;]/).map(item => item.trim()).filter(Boolean);
  return [];
}

/**
 * Canonicalize safe, recurring certification labels without collapsing
 * meaningful differences such as First Aid level, CPR level, AED, or an
 * "standard or intermediate" alternative.
 */
export function normalizeCertificationRequirements(value: unknown): string[] {
  const normalized: string[] = [];
  for (const item of certificationValues(value)) {
    let compact = compactText(item)
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+([.,])/g, '$1')
      .replace(/[.]$/, '')
      .trim();
    if (!compact) continue;
    if (/\b(?:preferred|preferable|preference|nice\s+to\s+have|desirable|optional)\b/i.test(compact)
      || /\b(?:would|is|are)\s+(?:be\s+)?considered\s+an?\s+asset\b/i.test(compact)
      || /\(\s*asset\s*\)/i.test(compact)) continue;

    // These belong in another field or nowhere in structured requirements;
    // keeping them as certifications makes the field misleading.
    if (/\b(?:criminal records?|vulnerable sector|police|background)\s+(?:check|clearance)|\bsecurity clearance\b/i.test(compact)
      || /\b(?:safety footwear|green patch)\b/i.test(compact)
      || /\b(?:mandatory legislated training|environmental,? safety and any other training required by corporate policy|occupational health and safety workshops)\b/i.test(compact)
      || /\bability to (?:obtain a city of brampton \(cob\) permit|complete re-qualification training and testing)\b/i.test(compact)
      || /\b(?:anti-rabies vaccination|rabies titer|proof of immunity for hepatitis b)\b/i.test(compact)
      || /^(?:active member|current membership in professional governing body)/i.test(compact)) {
      continue;
    }

    const firstAid = normalizeFirstAidCertification(compact);
    if (firstAid) {
      normalized.push(firstAid);
      continue;
    }

    if (/^wh(?:i)?mis(?:\s+(?:training|certification|certificate))?$/i.test(compact)) {
      normalized.push('WHMIS');
      continue;
    }
    if (/^smart\s+serve(?:\s+certification)?$/i.test(compact)) {
      normalized.push('Smart Serve');
      continue;
    }
    if (/^(?:food\s+handlers?(?:\s+certification)?|food\s+handling\s+certification)$/i.test(compact)) {
      normalized.push('Food Handler');
      continue;
    }
    if (/^food\s+safety\s+certification\s+course\s*\(food\s+handlers?\s+training\)/i.test(compact)) {
      normalized.push('Food Handler');
      continue;
    }
    if (/^high\s+five\s+certificate$/i.test(compact)) {
      normalized.push('HIGH FIVE Certificate');
      continue;
    }
    if (/worker\s+health\s+and\s+safety\s+awareness/i.test(compact)) {
      normalized.push('Worker Health and Safety Awareness training');
      continue;
    }
    if (/supervisor\s+health\s+and\s+safety\s+awareness/i.test(compact)) {
      normalized.push('Supervisor Health and Safety Awareness training');
      continue;
    }
    if (/^certified\s+in\s+nccp\s+level\s+2\s+theory\s+and\s+practical$/i.test(compact)) {
      normalized.push('NCCP Level 2 (theory and practical)');
      continue;
    }
    normalized.push(compact);
  }

  const seen = new Set<string>();
  return normalized.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractCertificationRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits') continue;
    if (STRUCTURED_OPTIONAL_REQUIREMENT.test(line.text)) continue;

    const firstAid = normalizeFirstAidCertification(line.text);
    if (firstAid) values.add(firstAid);

    const other = line.text.match(OTHER_CERTIFICATION_PATTERN);
    if (other) values.add(compactText(other[0]).replace(/\s*\/\s*/g, ' / '));
  }
  return dedupeCertificationRequirements([...values]);
}

/** Prefer specific First Aid labels over bare "First Aid" / overlapping variants. */
export function dedupeCertificationRequirements(values: string[]): string[] {
  const out: string[] = [];
  const firstAid: string[] = [];
  for (const v of values) {
    if (/\bfirst\s+aid\b|\bcpr\b/i.test(v)) firstAid.push(v);
    else out.push(v);
  }
  if (firstAid.length <= 1) return [...out, ...firstAid];

  // One First Aid/CPR family label is enough — keep the most specific (longest).
  firstAid.sort((a, b) => b.length - a.length);
  return [...out, firstAid[0]];
}

/** True when a Qualifications bullet is mostly a Grade 12 / high-school education line. */
export function isMostlyGrade12EducationBullet(text: string): boolean {
  if (!HIGH_SCHOOL_EDUCATION_TERM.test(text)) return false;
  if (/\b(?:bachelor|master|ph\.?d|university degree|college diploma|post[- ]secondary)\b/i.test(text)
    && !/\bgrade\s*12\b/i.test(text)) {
    return false;
  }
  // Long multi-requirement walls that mention Grade 12 in passing — leave body alone.
  if (text.length > 280 && !/^\s*(?:proof of\s+)?grade\s*12\b/i.test(text)
    && !/^\s*(?:completion|completed|must|minimum|education)\b/i.test(text)) {
    return false;
  }
  return text.length < 320;
}

/** True when a Qualifications bullet is mostly a First Aid / CPR certification line. */
export function isMostlyFirstAidCertificationBullet(text: string): boolean {
  if (!/\bfirst[-\s]?aid\b|\bcpr\b/i.test(text)) return false;
  // Multi-role aquatic cert lists — keep in body (other certs are unique).
  if (/\b(?:national lifeguard|swim instructor|lifesaving instructor|bronze cross|NLS)\b/i.test(text)
    && text.length > 100) {
    return false;
  }
  if (text.length > 240) return false;
  return true;
}

const SOFTWARE_PATTERNS: Array<[string, RegExp]> = [
  ['Microsoft Office', /(?:Microsoft Office(?: Suite)?|Microsoft Suite|MS Office(?: Suite)?|Office 365)/i],
  ['Microsoft 365', /(?:Microsoft 365|M365)/i],
  ['WordPress', /\bWord\s*Press\b/i],
  ['Lotus Notes', /\bLotus\s+Notes\b/i],
  ['SIS', /\b(?:Student Information System|SIS)\b/i],
  ['Contribute', /\b(?:Adobe\s+)?Contribute\b(?=\s*(?:[,;/.)]|$))/i],
  ['Word', /(?:Microsoft|MS) Word\b|\bWord\b(?!\s+(?:embeddings?|processing|processor|processors)\b)(?=\s*(?:[,.;:)]|and\b|mail\s+merge\b|$))/i],
  ['Excel', /(?:Microsoft|MS) Excel\b|\bExcel\b/i],
  ['PowerPoint', /(?:Microsoft|MS) PowerPoint\b|\bPowerPoint\b/i],
  ['Outlook', /(?:Microsoft|MS) Outlook\b|\bOutlook\b/i],
  ['Access', /(?:Microsoft|MS) Access\b|\bAccess\b(?=\s*(?:,|and\b|\)|database|software|application|$))/i],
  ['Visio', /(?:Microsoft|MS) Visio\b|\bVisio\b/i],
  ['Project', /(?:Microsoft|MS) Project\b/i],
  ['Adobe Acrobat', /(?:Adobe\s+)?(?:Acrobat(?:\s+Pro)?|Adobe Pro)\b/i],
  ['Adobe Creative Cloud', /Adobe Creative Cloud/i],
  ['Photoshop', /(?:Adobe\s+)?Photoshop/i],
  ['Illustrator', /(?:Adobe\s+)?Illustrator/i],
  ['InDesign', /(?:Adobe\s+)?InDesign/i],
  ['Adobe Captivate', /(?:Adobe\s+)?Captivate/i],
  ['AutoCAD', /\bAutoCAD\b/i],
  ['ArcGIS', /\bArcGIS\b/i],
  ['QGIS', /\bQGIS\b/i],
  ['HEC-RAS', /\bHEC-?RAS\b/i],
  ['SAP', /\bSAP\b/i],
  ['Oracle', /\bOracle\b/i],
  ['PeopleSoft', /\bPeopleSoft\b/i],
  ['Workday', /\bWorkday\b/i],
  ['Power BI', /Power\s*BI/i],
  ['Tableau', /\bTableau\b/i],
  ['ACL', /\bACL\b/i],
  ['IDEA', /\bIDEA\b/i],
  ['Brightspace', /\bBrightspace\b/i],
  ['Canvas', /\bCanvas\b/i],
  ['Windows', /\bWindows(?: 10| 11)?\b/i],
  ['SharePoint', /\bSharePoint\b/i],
  ['Microsoft Teams', /(?:Microsoft\s+Teams|\bTeams\b)/],
  ['SQL', /\bSQL(?: Server)?\b/i],
  ['Python', /\bPython\b/i],
  ['JavaScript', /\bJavaScript\b/i],
  ['HTML', /\bHTML\b/i],
  ['CSS', /\bCSS\b/i],
  ['TypeScript', /\bTypeScript\b/i],
  ['Java', /\bJava\b/i],
  ['C#', /\bC#\b/i],
  ['.NET', /\.NET\b/i],
];

const OPTIONAL_REQUIREMENT = /\b(?:asset|assets|preferred|preferable|considered an asset|would be an asset|nice to have|plus|an advantage|familiarity)\b/i;

export function extractSoftwareRequirements(description: string): SoftwareBackfillResult {
  const values = new Set<string>();
  let skippedOptionalLines = 0;

  for (const chunk of description.split(/(?=^#{1,3}\s+)/m)) {
    const heading = chunk.match(/^#{1,3}\s+(.+?)(?:\n|$)/)?.[1]?.trim() || '';
    if (!heading || /nice to have/i.test(heading) || !/qualif|skill|requirement|education|training/i.test(heading)) continue;

    for (const line of chunk.split(/\n+/).slice(1).map(value => value.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean)) {
      if (OPTIONAL_REQUIREMENT.test(line)) {
        if (SOFTWARE_PATTERNS.some(([, pattern]) => pattern.test(line))) skippedOptionalLines++;
        continue;
      }
      for (const [name, pattern] of SOFTWARE_PATTERNS) {
        if (pattern.test(line)) values.add(name);
      }
    }
  }

  return { values: [...values], skippedOptionalLines };
}

const LANGUAGE_NAMES: Array<[string, RegExp]> = [
  ['English', /\b(?:english|anglais)\b/i],
  ['French', /\b(?:french|fran[cç]ais)\b/i],
  ['Cantonese', /\bcantonese\b/i],
  ['Mandarin', /\bmandarin\b/i],
  ['Punjabi', /\bpunjabi\b/i],
  ['Arabic', /\barabic\b/i],
  ['Ukrainian', /\bukrainian\b/i],
  ['Spanish', /\bspanish\b/i],
  ['German', /\bgerman\b/i],
  ['Italian', /\bitalian\b/i],
  ['Portuguese', /\bportuguese\b/i],
  ['Korean', /\bkorean\b/i],
  ['Japanese', /\bjapanese\b/i],
  ['Hindi', /\bhindi\b/i],
  ['Urdu', /\burdu\b/i],
  ['Tamil', /\btamil\b/i],
  ['Somali', /\bsomali\b/i],
  ['Farsi', /\b(?:farsi|persian)\b/i],
  ['Russian', /\brussian\b/i],
  ['Polish', /\bpolish\b/i],
  ['Tagalog', /\btagalog\b/i],
  ['American Sign Language', /\b(?:american sign language|sign language|asl)\b/i],
];

const LANGUAGE_NAME_PATTERN = /\b(?:english|anglais|french|fran[cç]ais|bilingual(?:ism)?|bilingue|cantonese|mandarin|punjabi|arabic|ukrainian|spanish|german|italian|portuguese|korean|japanese|hindi|urdu|tamil|somali|farsi|persian|russian|polish|tagalog|american sign language|sign language|asl)\b/i;
const LANGUAGE_OPTIONAL_REQUIREMENT = /\b(?:asset|assets|preferred|preferable|preference|nice\s+to\s+have|would\s+be\s+an?\s+asset|considered\s+an?\s+asset|desirable|advantage|optional)\b/i;
const LANGUAGE_NON_REQUIREMENT = /\b(?:programming|software|coding|scripting)\s+languages?\b|\b(?:language\s+of\s+(?:instruction|the\s+course)|courses?\s+in\s+(?:english|french)|equivalent\s+in\s+(?:english|french)|language\s+of\s+work|language\s+instructor|english[- ]language\s+(?:arts|literature))\b/i;
const LANGUAGE_REQUIREMENT_CUE = /\b(?:required|required?\s+language|essential|must|need(?:ed)?|competenc(?:e|y)|proficien(?:cy|t)|fluen(?:cy|t(?:ly)?)|native|spoken|oral|written|communicat(?:e|ion)|official\s+languages?|bilingual(?:ism)?|bilingue|language\s+skills?)\b/i;
const LANGUAGE_HEADING = /\b(?:language|bilingual|english|french)\b/i;
const LANGUAGE_LEVEL = /\b(?:[A-C]{2,3}\s*\/\s*[A-C]{2,3}|[A-C]{2,3}\s+level|level\s+[1-5]|essential)\b/i;

const VEHICLE_TERM = /\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|vehicle|reliable\s+transportation|own\s+transportation|personal\s+vehicle|transportation)\b/i;
const VEHICLE_NOT_REQUIRED = /\bno\s+(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b[^.\n]{0,40}\b(?:required|needed|necessary)\b|\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b[^.\n]{0,100}\b(?:not\s+(?:required|needed|necessary)|unnecessary|no\s+requirement)\b|\b(?:not\s+(?:required|needed|necessary)|unnecessary|no\s+requirement)\b[^.\n]{0,100}\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b/i;
const VEHICLE_CONDITIONAL = /\b(?:for|if|where)\s+(?:positions?|roles?|jobs?)?\s*(?:requiring|that require|requiring the use of|driving)\b|\b(?:when|if)\s+driving\s+is\s+required\b/i;
const VEHICLE_REQUIRED_CUE = /\b(?:valid|current|must|possess|hold|maintain|obtain|provide|access\s+to|own|personal|reliable|required|mandatory|license|licence|permit|abstract|ability\s+to\s+drive|must\s+drive)\b/i;
const VEHICLE_SPECIFIC_REQUIREMENT = /\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|(?:access|own|personal|reliable)\s+(?:to\s+)?(?:a\s+)?vehicle|reliable\s+transportation|vehicle\s+(?:is\s+)?(?:required|necessary)|ability\s+to\s+drive|must\s+drive)\b/i;
const VEHICLE_OPTIONAL_REQUIREMENT = /\b(?:asset|preferred|preferable|nice\s+to\s+have|desirable|advantage|optional)\b/i;

type RequirementSection = 'required' | 'optional' | 'benefits' | 'other';
type DescriptionLine = { text: string; section: RequirementSection; heading: boolean };
export type ListingType = 'regular' | 'ongoing_recruitment' | 'inventory';

/**
 * Canonical listing_type tokens only.
 * - regular: ordinary single-role posting
 * - inventory: federal-style candidate inventory (not a specific job; often hidden from default catalogue)
 * - ongoing_recruitment: standing programs / open pools / open-till-filled hiring
 */
export function normalizeListingType(value: unknown, isInventory = false): ListingType {
  if (isInventory === true) return 'inventory';
  const s = String(value ?? '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
  if (!s) return 'regular';

  // Stored-field / short-label synonyms only (not free prose — use extractListingType for that).
  if (
    s === 'inventory'
    || s === 'candidate inventory'
    || s === 'talent inventory'
    || s === 'inventory process'
  ) {
    return 'inventory';
  }

  if (
    s === 'ongoing_recruitment'
    || s === 'ongoing recruitment'
    || s === 'ongoing'
    || s === 'standing'
    || s === 'standing posting'
    || s === 'open till filled'
    || s === 'open until filled'
    || s === 'candidate pool'
    || s === 'talent pool'
    || s === 'recruitment program'
  ) {
    return 'ongoing_recruitment';
  }

  if (s === 'regular' || s === 'standard' || s === 'normal') return 'regular';
  return 'regular';
}

const EDUCATION_TERM = /\b(?:bachelor(?:['’]s)?(?:\s+degree)?|master(?:['’]s)?(?!\s+electrician)(?:\s+degree)?|ph\.?d\.?|doctor(?:ate|al)|diploma|degree\s+(?:in|from|required|or|program)|post[- ]secondary\s+(?:education|program|institution)|associate(?:['’]s)?|bscn|bsn|b\.?a\.?|m\.?a\.?|undergraduate\s+degree|graduate\s+degree)\b/i;
const STUDENT_EDUCATION_TERM = /\b(?:current(?:ly)?\s+enrol(?:l(?:ed|ment)?|ment)?|registration\s+in\s+(?:a\s+)?co-?op\s+program|student\s+(?:status|enrolment|enrollment))\b/i;
const EDUCATION_VERIFICATION = /\b(?:verification|proof)\s+of\s+(?:degree|education|educational|diploma|transcript|equivalenc(?:y|ies))\b/i;
const EDUCATION_REQUIRED_CUE = /\b(?:required|minimum|must|completion|completed|successful|degree\s+in|diploma\s+in|equivalent|eligible|graduate|undergraduate|post[- ]secondary\s+(?:program|institution|education\s+in)|education\s+in)\b|\b(?:a|an|minimum|completion\s+of|completed|required)\s+post[- ]secondary\s+education\b/i;
const EDUCATION_CONTEXT_ONLY = /^\s*(?:familiarity|knowledge|experience|proficiency|understanding|working knowledge|demonstrated|strong|excellent)\b/i;
const FORMAL_EDUCATION_CUE = /\b(?:bachelor|master|ph\.?d|doctor(?:ate|al)|diploma|degree|bscn|bsn|b\.?a\.?|m\.?a\.?|undergraduate|graduate|enrol(?:l|led|ment)|completion of)\b/i;
const STRUCTURED_OPTIONAL_REQUIREMENT = /\b(?:asset|assets|preferred|preferable|preference|nice\s+to\s+have|would\s+be\s+an?\s+asset|considered\s+an?\s+asset|desirable|advantage|optional)\b/i;
// Class letters are often quoted in source text: Class "G", Class “C”, Class 'DZ'.
const LICENSE_CLASS = String.raw`class\s+[\u201c\u201d"'‘’]?[a-z0-9]+[\u201c\u201d"'‘’]?`;
const LICENSE_TERM = new RegExp(
  String.raw`\b(?:licen[cs](?:e|ed|ing|ure)|permit|registration|registered\s+(?:as|with|by)|designation|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification|certificate\s+of\s+authorization|${LICENSE_CLASS}\s+(?:driver.?s?\s+)?licen[cs]e)\b`,
  'i',
);
const LICENSE_REQUIRED_CUE = /\b(?:required|minimum|must|possess|hold(?:er)?|maintain|valid|current|eligible|obtain|provide|registered|registration|designation|certified|possession)\b/i;
const DRIVER_LICENSE_PHRASE = new RegExp(
  String.raw`\b(?:(?:valid|current|must\s+(?:have|hold|possess|maintain)|possession\s+of|holder\s+of)\s+)?(?:(?:a|an)\s+)?(?:${LICENSE_CLASS}\s+)?(?:(?:ontario|bc|alberta|manitoba|canadian|provincial|territorial)\s+)?(?:driver.?s?\s+)?licen[cs]e(?:\s*[-–—:]\s*${LICENSE_CLASS})?\b`,
  'i',
);
const EXPERIENCE_NUMBER = '(?:\\d+(?:\\.\\d+)?\\+?|one|two|three|four|five|six|seven|eight|nine|ten|several)';
const EXPERIENCE_UNIT = '(?:years?|yrs?|months?)';
const EXPERIENCE_WORD_NUMBERS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
};
const EXPERIENCE_SUFFIX = `(?:[’\\']?\\s+(?:of\\s+)?(?:[a-z-]+\\s+){0,5}experience)`;
// "2 years of experience", "Over two months and up to 6 months of related experience"
// (unit may appear on both ends of a range: "two months and up to 6 months").
const EXPERIENCE_AMOUNT = `${EXPERIENCE_NUMBER}(?:\\s*[-–—]?\\s*${EXPERIENCE_UNIT})?(?:\\s*(?:-|–|—|to|and\\s+up\\s+to)\\s*${EXPERIENCE_NUMBER})?\\s*${EXPERIENCE_UNIT}`;
const EXPERIENCE_YEARS_PATTERN = new RegExp(
  `\\b(?:(?:over|more\\s+than|at\\s+least|minimum(?:\\s+of)?)\\s+)?${EXPERIENCE_AMOUNT}${EXPERIENCE_SUFFIX}\\b`,
  'i',
);
const EXPERIENCE_TIME_SIGNAL = /\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?\s*[-–—]?\s*(?:years?|months?|yrs?)\b/i;
const EXPERIENCE_CLAUSE_PATTERN = new RegExp(
  `(?:(?:a\\s+)?minimum\\s+of|minimum|at\\s+least|over|more\\s+than)?\\s*${EXPERIENCE_AMOUNT}${EXPERIENCE_SUFFIX}\\b[^.;\\n]{0,180}`,
  'i',
);
const EXPERIENCE_HISTORY_SIGNAL = new RegExp(
  `\\b(?:with\\s+)?(?:more\\s+than|over)\\s+${EXPERIENCE_NUMBER}\\s*${EXPERIENCE_UNIT}\\s+of\\s+experience\\b`,
  'i',
);
const EXPERIENCE_SKILL_PATTERNS: Array<[string, RegExp]> = [
  ['Cash handling', /\b(?:cash\s+handling|handling\s+cash)\b/i],
];
// Source text often states education and experience as one combined sentence
// ("Degree in X and seven years of experience..."); extractExperienceRequirements
// already isolates its own clause from that same line, so education needs the
// identical tail cut or the two fields end up holding the same sentence twice.
const EDUCATION_EXPERIENCE_TAIL = new RegExp(
  `\\s+and\\s+${EXPERIENCE_AMOUNT}${EXPERIENCE_SUFFIX}\\b[^.;\\n]*$`,
  'i',
);
const NAMED_BENEFITS: Array<[string, RegExp]> = [
  ['OMERS', /\bOMERS\b/i],
  ['HOOPP', /\bHOOPP\b/i],
  ['CAAT Pension Plan', /\bCAAT\s+(?:pension\s+)?plan\b/i],
  ['Municipal Pension Plan', /\bMunicipal\s+Pension\s+Plan\b/i],
  ['Public Service Pension Plan', /\bPublic\s+Service\s+Pension\s+Plan\b/i],
];

const NON_BENEFIT_LABEL = /^(?:benefit(?:s)?(?:\s+package)?|career\s+(?:advancement|development|growth)(?:\s+opportunities?)?|competitive benefits?(?:\s+(?:package|programs?))?|comprehensive benefits? package|continuous\s+learning|education(?:\/training(?:\/staff\s+development)?)?|employee\s+(?:benefits|learning|training)\s+and\s+development|inclusive(?:\s+workplace)?\s+culture|learning(?:\s+and\s+development)?(?:\s+opportunities?|\s+programs?)?|mentorship(?:\s+program)?|mentorship\s+and\s+training|positive\s+workplace\s+culture(?:\s+and\s+work[- ]life\s+balance)?|professional\s+(?:development|learning)(?:\s+(?:days?|funds?|funding))?|recognition\s+programs?|staff\s+development|training(?:\s*(?:,|and|&)\s*(?:mentorship|development))?(?:\s+and\s+more)?|work[- ]life\s+balance)$/i;

/**
 * Benefits are displayed as quick facts, so keep concrete categories short and
 * consistent. Vague employer-pitch items belong in the description, if at all,
 * not in the structured benefits field.
 */
export function normalizeBenefits(values: string[]): string[] {
  const normalized: string[] = [];
  for (const value of values) {
    let label = value
      .replace(/\s+/g, ' ')
      .replace(/[.;,:]+$/, '')
      .trim();
    if (!label || NON_BENEFIT_LABEL.test(label) || /\b(?:training|trainings|mentorship)\b/i.test(label)) continue;

    // Preserve quantified or conditional details instead of collapsing them.
    const hasSpecificDetail = /\d|\bin lieu\b|\bdepending on\b|\bup to\b/i.test(label);
    if (!hasSpecificDetail && /^(?:accrued|annual|annual paid|paid)?\s*(?:vacation|vacation pay|annual leave|paid leave|paid time off|PTO|leave policy)$/i.test(label)) {
      label = 'Vacation';
    } else if (!hasSpecificDetail && /^(?:annual individual\s+)?performance\s+(?:bonus|bonuses|incentive|incentives)|performance pay|variable pay|bonus$/i.test(label)) {
      label = 'Performance Bonuses';
    } else if (!hasSpecificDetail && /^group\s+insurance(?:\s+(?:coverage|plan))?$/i.test(label)) {
      label = 'Group Insurance';
    } else if (!hasSpecificDetail && /^(?:health|healthcare|health\s+insurance|extended health)$/i.test(label)) {
      label = 'Health Insurance';
    } else if (!hasSpecificDetail && /^(?:health\s*care|healthcare|health)\s+spending\s+account$/i.test(label)) {
      label = 'Health Spending Account';
    } else if (!hasSpecificDetail && /^dental(?:\s+insurance)?$/i.test(label)) {
      label = 'Dental Insurance';
    } else if (!hasSpecificDetail && /^(?:vision|vision care)$/i.test(label)) {
      label = 'Vision Care';
    } else if (!hasSpecificDetail && /^(?:group\s+)?(?:basic\s+)?life insurance$/i.test(label)) {
      label = 'Life Insurance';
    } else if (!hasSpecificDetail && /^(?:short[- ]term|long[- ]term)?\s*disability(?: insurance)?$/i.test(label)) {
      label = 'Disability Insurance';
    } else if (!hasSpecificDetail && /^(?:medical|medical insurance)$/i.test(label)) {
      label = 'Health Insurance';
    } else if (!hasSpecificDetail && /^(?:employee(?:\s+and\s+family)?|family) assistance program(?:s)?$/i.test(label)) {
      label = 'Employee Assistance Program';
    } else if (!hasSpecificDetail && /^tuition\s+(?:waiver|remission)$/i.test(label)) {
      label = 'Tuition Waiver';
    } else if (!hasSpecificDetail && /^tuition\s+(?:aid|assistance|reimbursement)$/i.test(label)) {
      label = 'Tuition Assistance';
    } else if (!hasSpecificDetail && /^(?:pension|pension plan|retirement|retirement plan|retirement plans|defined (?:benefit|contribution) pension plan)$/i.test(label)) {
      label = 'Pension';
    } else {
      // Fix source casing for labels that are otherwise already useful.
      label = label.split(/(\s+|\/|&)/).map(part => {
        if (!part || /^\s+$/.test(part) || part === '/' || part === '&') return part;
        const word = part.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
        if (/^[A-Z0-9]{2,}$/.test(word)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join('');
    }

    if (!normalized.includes(label)) normalized.push(label);
  }
  return normalized;
}

const ONGOING_TITLE_SIGNAL = /\b(?:ongoing recruitment|recruitment program|student employment program|talent pool|candidate pool|future opportunities|expression of interest|co-?op students?\s*[-–—:]\s*(?:various|multiple))\b/i;
// Federal "inventory" / talent-pool postings — flexible wording; do not require
// the exact phrase "inventory for future vacancies" (many say "but to an inventory;").
const INVENTORY_TEXT_SIGNALS: RegExp[] = [
  /\bnot\s+applying\s+for\s+a\s+specific\s+(?:job|position)\b[^.\n]{0,120}\binventory\b/i,
  /\bto\s+an\s+inventory(?:\s+for\s+future\s+vacancies)?\b/i,
  /\binventory\s+for\s+future\s+vacancies\b/i,
  /\bstaff\s+current\s+and\s+future\s+vacancies\b[^.\n]{0,200}\binventory\b/i,
  /\bthis\s+(?:is\s+an?\s+)?(?:anticipatory\s+)?(?:staffing\s+)?process\b[^.\n]{0,160}\binventory\b/i,
  /\bselection\s+process\b[^.\n]{0,120}\binventory\b/i,
  // CFIA / common GC pool wording
  /\b(?:a\s+)?pool\s+of\s+(?:qualified\s+)?candidates?\s+will\s+be\s+established\b/i,
  /\bthis\s+pool\s+may\s+be\s+used\s+to\s+staff\b/i,
  /\b(?:build(?:ing)?|creat(?:e|ing)|establish(?:ed|ing)?|maintain(?:ed|ing)?)\s+(?:a\s+)?pool\s+of\s+candidates?\b/i,
  /\b(?:all|both)\s+current\s+and\s+future\s+(?:permanent\s+)?(?:part[- ]time\s+)?vacancies?\b/i,
  /\bvacancy\s+type\s*:\s*this\s+is\s+for\s+all\s+current\s+and\s+future\b/i,
];
const INVENTORY_TITLE_SIGNAL = /\b(?:applicant\s+pool|inventory|talent\s+pool|periodic(?:\s+posting|\s+post)?)\b/i;
const ONGOING_TEXT_SIGNALS: RegExp[] = [
  /\b(?:candidate|talent)\s+pool\b/i,
  /\bopen\s+(?:till|until)\s+filled\b/i,
  /\b(?:general recruitment call|standing job posting)\b/i,
  /\b(?:pool of (?:qualified )?candidates?)\b[^.\n]{0,120}\b(?:future opportunities|future vacancies|future openings)\b/i,
  /\b(?:applications?|applicants?|posting|position|role)\b[^.\n]{0,180}\b(?:kept on file|future opportunities|future vacancies|future openings)\b/i,
  /\b(?:current and future opportunities|future opportunities that become available|does not correspond to an immediate vacancy|intended to (?:build|create) a candidate pool|filled on an as[- ]needed basis)\b/i,
  /\b(?:accepts?|accepting) applications?[^.\n]{0,120}\bthroughout the year\b/i,
  /\b(?:recruitment needs?|recruitment for)[^.\n]{0,120}\b(?:throughout|all) the year\b/i,
  /\bthis recruitment may be utilized for future opportunities\b/i,
  /\b(?:position|role|posting)\b[^.\n]{0,100}\b(?:funded through|part of|eligib(?:le|ility) for)\b[^.\n]{0,80}\bstudent employment program\b/i,
  /\b(?:is|are)\s+(?:hiring|recruiting)\b[^.\n]{0,160}\b(?:9-1-1\s+)?police\s+dispatchers?\b/i,
  /\b(?:is|are)\s+(?:hiring|recruiting)\b[^.\n]{0,160}\bdispatch(?:er|ers|ing)?\b/i,
  /\brecruiting goals?[^.\n]{0,160}\b(?:accepting applications?|future events?)\b/i,
  /\bco-?op students?\b[^.\n]{0,80}\b(?:various|multiple) positions?\b/i,
  /\bpool\s+to\s+be\s+created\b[\s\S]{0,120}\byes\b/i,
];

export function extractListingType(description: string, title = '', isInventory = false): ListingType {
  if (isInventory) return 'inventory';
  const text = `${title}\n${description}`;
  if (INVENTORY_TITLE_SIGNAL.test(title) || INVENTORY_TEXT_SIGNALS.some(signal => signal.test(text))) {
    return 'inventory';
  }
  if (ONGOING_TITLE_SIGNAL.test(title)) return 'ongoing_recruitment';
  const detected = ONGOING_TEXT_SIGNALS.some(signal => signal.test(text)) ? 'ongoing_recruitment' : 'regular';
  return normalizeListingType(detected, false);
}

function compactText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingText(line: string): string | null {
  const trimmed = line.trim();
  const markdown = trimmed.match(/^#{1,6}\s+(.+?)\s*$/)?.[1]
    || trimmed.match(/^\*{1,2}([^*]+?)\*{1,2}:?\s*$/)?.[1]
    || trimmed.match(/^([A-Z][A-Za-z0-9 &'/\-]{3,}):\s*$/)?.[1]
    || trimmed.match(/^([A-Z][A-Z0-9 &'\-/]{3,}):?\s*$/)?.[1];
  return markdown ? compactText(markdown).toLowerCase() : null;
}

function sectionForHeading(heading: string): RequirementSection {
  if (/\b(?:compensation|benefits?|perks?|pension|total\s+rewards)\b/i.test(heading)) return 'benefits';
  if (/\b(?:nice\s+to\s+have|preferred|desirable|assets?|bonus|additional\s+qualifications|would\s+be\s+great)\b/i.test(heading)) return 'optional';
  if (/\b(?:qualifications?|requirements?|minimum|essential|what\s+you\s+(?:need|should)|skills?|education|training|education\s+and\s+(?:experience|qualifications)|knowledge\s+and\s+skills|language|licen[cs]e)\b/i.test(heading)) return 'required';
  return 'other';
}

function descriptionLines(description: string): DescriptionLine[] {
  let section: RequirementSection = 'other';
  const normalizedDescription = description
    .replace(/\\r?\\n/g, '\n')
    // Numbered list split — only after a non-letter so "Grade 12) graduation"
    // is not broken into "High school (Grade" + "12) graduation".
    .replace(/(?<![A-Za-z])\s+(?=\d{1,2}[.)]\s+\S)/g, '\n')
    .replace(/\s+(?=(?:key|minimum|essential|education|licen[cs]e|language|other)\s+qualifications?\s*:)/gi, '\n');
  return normalizedDescription.split(/\r?\n/).map(raw => {
    const heading = headingText(raw);
    if (heading) {
      section = sectionForHeading(heading);
      return { text: heading, section, heading: true };
    }
    const text = compactText(raw.replace(/^\s*[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''));
    return { text, section, heading: false };
  }).filter(line => line.text);
}

function cleanRequirementText(value: string): string {
  return compactText(value)
    .replace(/\s*[([{]\s*(?:master(?:['’]s)?|bachelor(?:['’]s)?|ph\.?d\.?)\s+(?:degree\s+)?(?:is\s+)?(?:preferred|preferable|an?\s+asset|desirable|an?\s+advantage)[^)}\]]*[)}\]]/gi, '')
    .replace(/(?:;|,|\.|\s+-\s+)\s*(?:master(?:['’]s)?|bachelor(?:['’]s)?|ph\.?d\.?)\s+(?:degree\s+)?(?:is\s+)?(?:preferred|preferable|an?\s+asset|desirable|an?\s+advantage).*$/i, '')
    .replace(/[;,.]+$/, '')
    .trim();
}

/**
 * Strip federal/municipal extraction artifacts that are not education content:
 * "Education:", "*Education:**", "ED1:", "AED1 -", "Stream 1 – …:", "AS-01 only:",
 * "Engineers (EN-ENG-03):", "Your application must clearly explain…".
 */
function stripEducationLabelPrefix(value: string): string {
  let text = compactText(value);
  // Repeatedly peel known labels (some rows stack "Education: Stream 1: …").
  for (let i = 0; i < 4; i += 1) {
    const next = text
      // "Your application must clearly explain how you meet the followingEducation:-"
      .replace(/^your\s+application\s+must\s+clearly\s+explain\s+how\s+you\s+meet\s+the\s+following\s*/i, '')
      .replace(/^\*{0,2}education\*{0,2}\s*:\s*/i, '')
      .replace(/^amendment\s+to\s+education\s*:\s*/i, '')
      .replace(/^\*{0,2}ed(?:ucation)?\s*\d+\.?\s*[-–—:]?\s*/i, '')
      .replace(/^\*{0,2}aed\s*\d+\.?\s*[-–—:]?\s*/i, '')
      // Stream 1 – Performance Audit:** / **Stream 2**:
      .replace(/^\*{0,2}stream\s*\d+\s*[-–—:]?[^*:\n]{0,80}\*{0,2}\s*:\s*/i, '')
      // Classification-scoped: "AS-01 only:", "CR-04 only:-", "AS-01 only -"
      .replace(/^(?:[a-z]{1,6}-\d{2}(?:\s*\/\s*[a-z]{1,6}-\d{2})*)\s+only\s*[:\-–—]?\s*/i, '')
      // "Engineers (EN-ENG-03): Graduation…" / "**Engineers (ENG-04):**"
      .replace(/^\*{0,2}[A-Za-z][A-Za-z\s/().-]{1,40}\s*\([A-Z]{2,}(?:-[A-Z0-9]+)+\)\*{0,2}\s*:\s*/i, '')
      // Bare group codes: "EN-ENG-03:" / "SR-APA-00:"
      .replace(/^(?:[A-Z]{2,}(?:-[A-Z0-9]+)+)\s*:\s*/i, '')
      // Leading markdown residue from broken "*Education:**"
      .replace(/^\*+\s*/, '')
      .replace(/^:\s*/, '')
      .replace(/^[-–—]\s*/, '')
      .trim();
    if (next === text) break;
    text = next;
  }
  return text;
}

function cleanEducationRequirement(value: string): string {
  const initial = cleanRequirementText(stripEducationLabelPrefix(value));
  const educationIndex = initial.search(/\b(?:bachelor|master|ph\.?d|doctor(?:ate|al)|diploma|degree|bscn|bsn|undergraduate|graduate|post[- ]secondary|secondary\s+school|high\s+school|successful\s+completion|completion\s+of|currently\s+enrol|enrol(?:l(?:ed|ment)?))\b/i);
  const educationPrefix = educationIndex >= 0 ? initial.slice(0, educationIndex) : '';
  const withoutAdministrativeTail = initial
    .replace(/^your\s+application\s+must\s+clearly\s+explain\s+how\s+you\s+meet\s+the\s+following\s*education\s*:\s*[-–—]?\s*/i, '')
    .replace(/\s*(?:learn more about\b|applied\s*\/\s*assessed\b|competencies?\s*:).*/i, '')
    .replace(/\*\*candidates?\s+invited\b[\s\S]*$/i, '')
    .replace(/\.\s+(?=(?:a|an|the)\s+(?:demonstrated|ability)\b|candidate\s+has\b).*/i, '.');
  const cleaned = (educationIndex >= 0 && LICENSE_TERM.test(educationPrefix) ? withoutAdministrativeTail.slice(educationIndex) : withoutAdministrativeTail)
    .replace(/\s+(?:and\s+)?(?:valid\s+|current\s+|must\s+(?:have|hold|possess)\s+|registered\s+(?:as|with)\s+|registration\s+(?:with|in|as)\s+)(?:[^.]+(?:licen[cs]e|p\.?\s*eng\.?|professional\s+engineer|certificate\s+of\s+qualification|registration)[^.]*).*$/i, '')
    .replace(/\s+(?:and\s+)?registration\s+(?:or|with|in|as|through)\b.*$/i, '')
    .replace(EDUCATION_EXPERIENCE_TAIL, '')
    .replace(/[;,.]+$/, '')
    .replace(/\s+(?:with|and|or)$/i, '')
    .trim();
  return stripEducationLabelPrefix(cleaned);
}

/**
 * Collapse wordy education prose into a short label.
 * e.g. "Completion of a high school diploma – or a combination of education, training and experience deemed equivalent"
 *   → "High school diploma"
 */
export function compactEducationRequirement(value: string): string {
  if (!value) return '';
  const already = value.trim();
  if (/^High school diploma$/i.test(already)) return 'High school diploma';
  if (/^(?:\d|one|two|three|four) years of high school$/i.test(already)) {
    return already.charAt(0).toUpperCase() + already.slice(1);
  }

  let s = cleanEducationRequirement(value).replace(/[;,.]+$/, '').trim();
  if (!s) return '';

  // Drop emoji / ED1 walls and competency dump.
  if (/[🎓💼]|𝐄𝐃𝐔𝐂𝐀𝐓𝐈𝐎𝐍|ED\d+\s*:/i.test(s) && s.length > 120) {
    const secondaryYears = s.match(/(?:successful\s+)?completion of\s+(\w+)\s+years?\s+of\s+secondary school/i);
    if (secondaryYears) {
      const n = secondaryYears[1].toLowerCase();
      const num = ({ one: '1', two: '2', three: '3', four: '4' } as Record<string, string>)[n] || n;
      return `${num} years of high school`;
    }
    if (/secondary school diploma|high school/i.test(s)) return 'High school diploma';
  }

  // Strip leading boilerplate.
  s = s
    .replace(/^(?:successful\s+)?completion of\s+(?:a\s+|an\s+)?/i, '')
    .replace(/^(?:must\s+(?:have|hold|possess)\s+(?:an?\s+)?|minimum(?:\s+of)?\s+(?:an?\s+)?|candidates?\s+must\s+(?:have\s+)?)/i, '')
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/^up to\s+/i, '')
    .trim();

  // High school / secondary school family.
  if (/\b(?:high\s+school|secondary\s+school|grade\s*12|ossd|g\.?e\.?d\.?|c\.?a\.?e\.?c\.?|mature\s+high\s+school)\b/i.test(s)
    || /\bsecondary school (?:graduation\s+)?diploma\b/i.test(s)) {
    // High school + additional program (e.g. Law and Security) — keep the program, drop fluff.
    if (/\bplus\b.+\b(?:program|diploma|certificate)\b/i.test(s) || /\bgraduation,\s*plus\b/i.test(s)) {
      const field = s.match(/\bin\s+([A-Za-z0-9][A-Za-z0-9 ,/-]+?)(?:\s+or\s+equivalent)?\s*$/i)?.[1]?.trim();
      if (field && field.length < 80) return `High school diploma plus program in ${field.replace(/,?\s+or equivalent$/i, '').trim()}`;
      return 'High school diploma plus related program';
    }
    // Partial years (GC two/three years of secondary).
    const years = s.match(/(?:successful\s+)?completion of\s+(\w+)\s+years?\s+of\s+(?:secondary|high)\s+school|(\w+)\s+years?\s+of\s+(?:secondary|high)\s+school/i)
      || value.match(/(?:successful\s+)?completion of\s+(\w+)\s+years?\s+of\s+secondary school/i);
    if (years || /\b(?:two|three|2|3)\s+years?\s+of\s+(?:secondary|high)\s+school\b/i.test(value)) {
      const raw = (years?.[1] || years?.[2] || value.match(/\b(two|three|2|3)\s+years?/i)?.[1] || '').toLowerCase();
      const num = ({ one: '1', two: '2', three: '3', four: '4', '1': '1', '2': '2', '3': '3', '4': '4' } as Record<string, string>)[raw] || raw;
      if (num) return `${num} years of high school`;
    }
    if (/\bpartial\s+(?:secondary|high\s+school)\b/i.test(s)) return 'Partial high school';
    // PSC test alternative alone (no diploma stated as primary).
    if (/\bpublic service commission\b|\bPSC\b/i.test(value) && /alternative to a secondary school/i.test(value) && !/secondary school diploma \(high school\)/i.test(value)) {
      return 'High school diploma or PSC alternative';
    }
    // "Secondary school + PSW certificate" keep both short
    if (/\bpersonal support worker\b/i.test(s)) {
      return 'High school diploma and Personal Support Worker certificate';
    }
    // Technical training tacked on — drop the training clause for the education field.
    if (/\band current technical and practical training\b/i.test(s)) {
      return 'High school diploma';
    }
    return 'High school diploma';
  }

  // Generic equivalent-combo tails on degrees/diplomas (end-of-string only — don't
  // chew through "PhD (… or equivalent experience) in …").
  s = s
    // Metrolinx-style: "– or a combination of education, training and experience deemed equivalent"
    .replace(/\s*[-–—,]\s*or\s+a\s+combination of education,?\s*training and(?:\/or)?\s+experience(?:\s+deemed\s+equivalent)?.*$/i, '')
    .replace(/\s+or\s+a\s+combination of education,?\s*training and(?:\/or)?\s+experience(?:\s+deemed\s+equivalent)?.*$/i, '')
    .replace(/\s+or\s+combination of education,?\s*training and(?:\/or)?\s+experience(?:\s+deemed\s+equivalent)?.*$/i, '')
    // "; an equivalent combination…" / "(or an equivalent combination…)" / "OR an acceptable combination…"
    .replace(/\s*\([^)]*equivalent combination[^)]*\)\s*$/i, '')
    .replace(/\s*[;,]?\s*(?:an?\s+)?equivalent combination of education(?:\s+and\/or\s+experience|\s+and\s+[^.]*)?\s*$/i, '')
    .replace(/\s+OR\s+an?\s+acceptable combination of education.*$/i, '')
    .replace(/\s+or\s+an?\s+acceptable combination of education.*$/i, '')
    .replace(/\s+or\s+an?\s+equivalent combination of education.*$/i, '')
    .replace(/\s+or\s+the\s+equivalent combination of education(?:\s+and(?:\s+related)?\s+experience)?\s*$/i, '')
    .replace(/\s+or\s+(?:the\s+)?equivalent combination of education(?:\s+and(?:\s+related)?\s+experience)?\s*$/i, '')
    .replace(/\s*[-–—,]?\s*or\s+(?:an?\s+)?(?:acceptable\s+|approved\s+|employer[- ]approved\s+)?combination of\s+(?:education|training|experience)(?:\s*,?\s*(?:education|training|experience|and|or|\/|related|relevant)+)*.*$/i, '')
    .replace(/\s+or\s+(?:an?\s+|the\s+)?(?:approved\s+)?equivalent combination(?:\s+of\s+(?:education|experience|related\s+education|related\s+experience)[^.]*)?\s*$/i, '')
    .replace(/\s+or\s+the\s*$/i, '')
    .replace(/\s+or\s+(?:an?\s+)?acceptable combination of equivalent experience\s*$/i, '')
    .replace(/\s+or\s+employer-approved alternatives?(?:\s*\([^)]*\))?\s*$/i, '')
    .replace(/\s+or\s+higher\s*$/i, '')
    .replace(/\s+or\s+(?:the\s+)?equivalent\s*$/i, '')
    .replace(/\.\s*An?\s+equivalent combination.*$/i, '')
    .replace(/\s*[—–-]\s*or an?\s+equivalent combination of education and experience\s*$/i, '')
    .replace(/\s*,\s*with at least .+ years?['']?\s+relevant experience.*$/i, '')
    // Catch-all: remaining "… or equivalent/acceptable combination …" tails
    .replace(/\s*[,;]?\s*(?:OR\s+)?(?:an?\s+)?(?:acceptable|approved|equivalent)\s+combination(?:s)?(?:\s+of\b[^.;]*)?(?:\s+considered)?\s*$/i, '')
    .replace(/\s+or\s+(?:an?\s+)?(?:acceptable|equivalent)\s+combination(?:s)?(?:\s+of\b.*)?\s*$/i, '')
    .replace(/\s+and an?\s+acceptable combination of education.*$/i, '')
    .replace(/\s*;\s*equivalent combination(?:\s+considered)?\s*$/i, '')
    .replace(/\s+or equivalent combination\s*\([^)]*\)\s*$/i, '')
    .replace(/\s+may be considered\.?$/i, '')
    .replace(/\s+will be considered\.?$/i, '')
    .replace(/\s+be considered\.?$/i, '')
    .replace(/^(?:graduation with\s+(?:a\s+)?)/i, '')
    .replace(/^(?:graduation from an accredited community college with\s+(?:a\s+)?)/i, '')
    .replace(/^(?:obtained\s+(?:a\s+)?)/i, '')
    .replace(/^minimum:\s*/i, '')
    .replace(/^OR\s+/i, '')
    // Pure "acceptable combination…" with no credential named first — drop.
    .replace(/^(?:an?\s+)?acceptable combination of education\b.*$/i, '')
    .replace(/\s+from a recognized post[- ]secondary institution\b/i, '')
    .replace(/\s+with acceptable specialization in\b/i, ' in ')
    .replace(/\s*\(already obtained OR obtained before appointment\)\s*/i, ' ')
    .replace(/\s+or an Advanced Diploma in a related field of study.*$/i, ' or college diploma in a related field')
    .replace(/^a\s+bachelor'?s?\s+degree\b/i, "Bachelor's degree")
    .replace(/^bachelor'?s?\s+degree\b/i, "Bachelor's degree")
    .replace(/^undergraduate degree\b/i, "Bachelor's degree")
    .replace(/^a\s+ph\.?d\.?\s+degree\b/i, 'PhD')
    .replace(/^ph\.?d\.?\s+degree\b/i, 'PhD')
    .replace(/^degree\b/i, 'Degree')
    // Broken paren leftovers from partial combo strips
    .replace(/\s*\(\s*or\s*$/i, '')
    .replace(/\s+\(\s*$/i, '')
    .replace(/[,\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Bachelor / Master / College short forms when field is present or not.
  if (/^bachelor(?:['’]s)?(?:\s+degree)?(?:\s+in\s+.+)?$/i.test(s)) {
    return s.replace(/^bachelor(?:['’]s)?(?:\s+degree)?/i, "Bachelor's degree").replace(/^bachelor's degree$/i, "Bachelor's degree");
  }
  if (/^master(?:['’]s)?(?:\s+degree)?(?:\s+in\s+.+)?$/i.test(s)) {
    return s.replace(/^master(?:['’]s)?(?:\s+degree)?/i, "Master's degree");
  }
  if (/^undergraduate degree(?:\s+in\s+.+)?$/i.test(s)) {
    return s.replace(/^undergraduate degree/i, "Bachelor's degree");
  }
  if (/^(?:advanced\s+)?college diploma(?:\s*\(\d+\s*years?\))?(?:\s+in\s+.+)?$/i.test(s)) {
    return s.replace(/^(?:advanced\s+)?college diploma(?:\s*\(\d+\s*years?\))?/i, 'College diploma');
  }

  // Minimum: college diploma in X with N years… → College diploma in X (experience is separate field)
  const minCollege = s.match(/^minimum:\s*college diploma in ([^,]+?)(?:\s+with\s+\w+\s+years?.*)?$/i);
  if (minCollege) return `College diploma in ${minCollege[1].trim()}`;

  // Drop years-of-experience gloms that belong in experience field.
  s = s.replace(/\s+with\s+(?:\w+\s+)?(?:years?|yrs?)[’']?\s+(?:of\s+)?(?:relevant\s+)?experience.*$/i, '');

  // Pure combination-only / empty after combo strips — drop entirely.
  if (!s || /^(?:an?\s+)?acceptable combination\b/i.test(s) || /^OR\b/i.test(s)) return '';
  s = s.charAt(0).toUpperCase() + s.slice(1);
  // If still a novel-length wall, fall back to first clause.
  if (s.length > 160) {
    const first = s.split(/[.;]/)[0]?.trim() || s;
    if (first.length < s.length && first.length >= 12) return first;
  }
  return s;
}

/** Normalize stored or AI education list items (idempotent). */
export function normalizeEducationRequirements(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of toStringList(value)) {
    const cleaned = compactEducationRequirement(item);
    if (!cleaned) continue;
    if (!EDUCATION_TERM.test(cleaned) && !STUDENT_EDUCATION_TERM.test(cleaned)
      && !/\b(?:secondary\s+school|high\s+school|post[- ]secondary|diploma|degree|certificate|education\s+verification|enrol(?:l(?:ed|ment)?)?|grade\s*12|years of high school|BScN|BA\b|BSc\b|MBA|PhD|LL\.?B|J\.?D)\b/i.test(cleaned)) {
      continue;
    }
    const key = normalizedRequirement(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function cleanLicenseRequirement(value: string): string {
  const start = value.match(/\b(?:valid\s+(?:[^.\n]{0,80}\s+)?(?:driver.?s?\s+)?licen[cs]e|current\s+(?:[^.\n]{0,80}\s+)?(?:driver.?s?\s+)?licen[cs]e|must\s+(?:have|hold|possess|maintain|obtain)\b|registered\s+(?:as|with|by)\b|registered\s+professional\s+engineer|registration\s+(?:with|in|as|through)\b|(?:professional|accounting|trade|engineering)\s+designation(?:\s+(?:as|with|required))?|professional\s+engineer|p\.?\s*eng\.?|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|certificate\s+of\s+(?:qualification|authorization))\b/i);
  const cleaned = cleanRequirementText(start ? value.slice(start.index) : value);
  return cleaned
    .replace(/\s*(?:\.\s*[-–—]\s*|[-–—]\s+)(?:travel|overtime|mobility|security|operational requirements?)\s*:.*/i, '')
    // Don't strip the trailing period on abbreviations like P.Eng.
    .replace(/(?<!P\.Eng)[;,.]+$/i, '')
    .replace(/[;,]+\s*$/i, '')
    .trim();
}

/** Known regulatory body long-name → short label. */
const LICENSE_BODIES: Array<[string, RegExp]> = [
  ['CNO', /(?:the\s+)?(?:ontario\s+)?college of nurses(?: of ontario)?|college of nurses of ontario/i],
  ['CRNA', /college of registered nurses of alberta/i],
  ['CRNS', /college of registered nurses of saskatchewan/i],
  ['PEO', /professional engineers(?: of)? ontario|\bPEO\b/i],
  ['EGBC', /engineers(?: and)? geoscientists(?: of)? (?:bc|british columbia)|engineers and geoscientists bc|\bEGBC\b/i],
  ['EGM', /engineers geoscientists manitoba|\bE\.?G\.?M\.?\b/i],
  ['CPSO', /college of physicians and surgeons of ontario|\bCPSO\b/i],
  ['CASLPO', /college of audiologists and speech[- ]language pathologists of ontario|\bCASLPO\b/i],
  ['CPBAO', /college of psychologists and behaviour analysts of ontario|\bCPBAO\b/i],
  ['CRPO', /college of registered psychotherapists of ontario|\bCRPO\b/i],
  ['OCSWSSW', /ontario college of social workers and social service workers/i],
  ['CECE', /(?:ontario\s+)?college of early childhood educators/i],
  ['CDO', /college of dietitians of ontario/i],
  ['OACETT', /\bOACETT\b/i],
  ['OPPI', /\bOPPI\b/i],
  ['Law Society of Ontario', /law society(?:'s)?(?: of ontario)?/i],
  ['CPA Ontario', /\bCPA Ontario\b|chartered professional accountants?(?:\s+(?:of|with))?\s+ontario/i],
  ['CIPHI', /canadian institute of public health inspectors|\bCIPHI\b/i],
  ['CSMLS', /\bCSMLS\b/i],
  ['HSCPOA', /\bHSCPOA\b/i],
  ['MMAH', /ministry of municipal affairs(?: and housing)?|\bMMAH\b/i],
  // Ontario College of Trades is an issuer, not a credential — handled separately.
];

/** Credential / role short labels — more specific patterns first. */
const LICENSE_ROLES: Array<[string, RegExp]> = [
  ['Nurse Practitioner (RN-EC)', /registered nurse in the extended class|nurse(?:\s+in the)?\s+extended class|nurse practitioner|\bRN[- ]?EC\b|extended class\s*\([^)]*primary health/i],
  ['Registered Practical Nurse (RPN)', /registered practical nurse|\blicensed practical nurse\b|\bRPN\b|\bLPN\b/i],
  ['Registered Nurse (RN)', /registered nurse|\bRN\b(?!\s*[- ]?EC)/i],
  ['P.Eng.', /professional engineer(?:ing)?(?:\s+licen[cs]e)?|p\.?\s*eng\.?/i],
  ['EIT', /engineering intern|\bEIT\b|limited license with the peo/i],
  ['CET', /certified engineering technologist|\bC\.?E\.?T\.?\b/i],
  ['RPP', /\bRPP\b|registered professional planner/i],
  ['CPA', /\bchartered professional accountant\b|\bCPA\b(?!\s+ontario)/i],
  ['Psychotherapist', /psychotherapist/i],
  ['Lawyer', /\blawyer\b|barrister|solicitor/i],
  ['MLT', /\bgeneral MLT\b|\bmedical laboratory technologist\b|\bMLT\b/i],
  ['Landscape Architect', /professional landscape architect|landscape architect/i],
  ['Architect (OAA)', /professional architect|\bOAA\b/i],
];

function detectLicenseBody(text: string): string | null {
  for (const [label, pattern] of LICENSE_BODIES) {
    if (pattern.test(text)) return label;
  }
  // Already-compacted short labels / jurisdictions (idempotent second pass).
  if (/\(\s*CNO\s*\)|\bCNO\b/i.test(text) && !/\bcollege of nurses\b/i.test(text)) {
    /* fall through — CNO already handled above when bare */
  }
  // Generic "provincial/territorial regulatory body" nursing without named college.
  if (/\bprovince or territory of canada\b|\bprovincial(?:\/territorial)?\s+(?:nursing\s+)?regulatory\b|\bprovince of (?:work|practice|position)\b|\bcanadian province\b|\bin canada\b|\(\s*Canada\s*\)|\b,\s*Canada\b/i.test(text)
    && !/\bcanadian airline|transport canada\b/i.test(text)) {
    return 'Canada';
  }
  if (/\bin ontario\b|\bprovince of ontario\b|\(\s*Ontario\s*\)|\b,\s*Ontario\b|\bOntario\b/i.test(text)
    && /\b(?:engineer|p\.?\s*eng|nurse|registration|RN|RPN)\b/i.test(text)) {
    return 'Ontario';
  }
  if (/\bin british columbia\b|\bin bc\b|\(\s*BC\s*\)|\b,\s*BC\b/i.test(text)
    && /\b(?:engineer|registration|architect|p\.?\s*eng)\b/i.test(text)) {
    return 'BC';
  }
  // Compacted "P.Eng. (Ontario)" / "RN (CNO)" — body already in parens.
  const parenBody = text.match(/\(([A-Za-z0-9./-]+)\)\s*$/);
  if (parenBody) {
    const inner = parenBody[1];
    if (/^(?:CNO|CRNA|CRNS|PEO|EGBC|EGM|CPSO|CASLPO|CPBAO|CRPO|CECE|CDO|OACETT|OPPI|CIPHI|CSMLS|Ontario|Canada|BC)$/i.test(inner)) {
      return /ontario/i.test(inner) ? 'Ontario' : /canada/i.test(inner) ? 'Canada' : /^(?:bc)$/i.test(inner) ? 'BC' : inner.toUpperCase() === inner || inner.length <= 6 ? inner : inner;
    }
  }
  return null;
}

function detectLicenseRole(text: string): string | null {
  for (const [label, pattern] of LICENSE_ROLES) {
    if (pattern.test(text)) return label;
  }
  return null;
}

function isNonLicenseJunk(value: string): boolean {
  return /\bregistered as a (?:full[- ]time|part[- ]time)?\s*student\b/i.test(value)
    || /\b(?:full[- ]time|part[- ]time)\s+(?:secondary|post[- ]secondary)\s+student\b/i.test(value)
    || /\breturning to full[- ]time studies\b/i.test(value)
    || /\bin final year and not intending to return\b/i.test(value)
    || /\bwe are seeking an experienced professional\b/i.test(value)
    || /\bexperience requirements correspond to the licen/i.test(value)
    || /\bprepares death registration\b/i.test(value)
    || /\bsupports the registration of deaths\b/i.test(value)
    || /\bthe eit will engage in the technical work\b/i.test(value)
    || /\bprofessional engineer\/architect applicant for building permit\b/i.test(value)
    || /\bforge a career with the municipality\b/i.test(value)
    || /\bmust have been trained and registered as a volunteer\b/i.test(value)
    || /\bregistered with academic accommodations\b/i.test(value)
    || /\bregistered with the university of toronto\b/i.test(value)
    || /\binclude license number and province\b/i.test(value)
    || /\bprofessional engineer \(include license number\b/i.test(value)
    || /\blicense number and province of (?:registration|issuance)\b/i.test(value)
    // Vague fragments that never name a real credential (not "College of Nurses…").
    || /^registration with a college\s*$/i.test(value)
    || /^registration with regulated college\b/i.test(value)
    || /\bregistered with the ontario ministry of skills and development\b/i.test(value);
}

function formatProfessionalLicense(role: string | null, body: string | null, eligible: boolean): string {
  let core = '';
  if (role && body) {
    // Prefer short form when role already has a parenthetical acronym: "RN (CNO)".
    const acronym = role.match(/\(([A-Z0-9.-]+)\)$/)?.[1];
    if (acronym) {
      core = `${acronym} (${body})`;
    } else {
      core = `${role} (${body})`;
    }
  } else if (role) {
    core = role;
  } else if (body) {
    core = body;
  }
  if (!core) return '';
  if (eligible && !/\beligib/i.test(core)) core = `${core} or eligible`;
  return core;
}

/** True when the text is primarily a driver's / vehicle licence requirement. */
function looksLikeDriverLicense(text: string): boolean {
  if (/\b(?:aircraft maintenance|ame\b|professional engineer|p\.?\s*eng|nurse|wastewater|pesticide|software\s+licen|certificate of qualification|college of nurses|truck and coach|(?:marine|acv|operating|stationary) engineer(?:ing)?|security guard|gas fitter|exterminator|backflow|arborist|pilot licen|dental licen|veterinary)\b/i.test(text)
    && !/\bdriver/i.test(text)) {
    return false;
  }
  return /\bdriver.?s?['’]?\s+licen[cs]e\b|\bclass\s*[\u201c\u201d"'‘’]?[a-z0-9]{1,3}[\u201c\u201d"'‘’]?\b|\b[a-z0-9]{1,3}-class\b|\bendorsement\b|\bDND\s*404\b|\bG2\b|\bDZ\b|\bAZ\b|\bCZ\b|\b[A-FG][12]?\s+driver/i.test(text);
}

/**
 * Collapse wordy driver-licence prose to a short label.
 * e.g. 'Must have a valid Ontario Class "G" driver’s licence and meet the corporate standard…'
 *   → "Ontario Class G"
 */
export function compactDriverLicense(value: string): string | null {
  if (!value || !looksLikeDriverLicense(value)) return null;

  let s = value.replace(/\s+/g, ' ').trim();

  // Isolate the licence clause from multi-requirement walls.
  s = s
    .replace(/[;,]?\s*physical ability to perform.*$/i, '')
    .replace(/[;,]?\s*demonstrated ability to (?:communicate|lead).*$/i, '')
    .replace(/[;,]?\s*Benefits include.*$/i, '')
    .replace(/[;,]?\s*Health Canada Medical.*$/i, '')
    .replace(/[;,]?\s*proficient in Microsoft.*$/i, '')
    .replace(/[;,]?\s*good interpersonal skills.*$/i, '')
    .replace(/[;,]?\s*Well-developed human relations.*$/i, '')
    .replace(/[;,]?\s*This is a unionized position.*$/i, '')
    .replace(/\s+and (?:will be )?required to (?:use|provide|pass|have access).*$/i, '')
    .replace(/\s+(?:and|,)\s*(?:have )?access to (?:a )?(?:reliable )?(?:vehicle|transportation|personal vehicle).*$/i, '')
    .replace(/\s+(?:and|,)\s*insurance for \$?[\d,]+.*$/i, '')
    .replace(/\s+(?:and|,)\s*(?:use of )?(?:own|a reliable) vehicle.*$/i, '')
    .replace(/\s+would be required to complete travel.*$/i, '')
    .replace(/\s+are required for travel\b.*$/i, '')
    .replace(/\s+Note:.*$/i, '')
    .replace(/\s+The successful (?:applicant|candidate).*$/i, '')
    .replace(/\s+Applicants with \d+ or more points.*$/i, '')
    .replace(/\s+new hires must provide.*$/i, '')
    .replace(/\s+Provision of a driver.?s? abstract.*$/i, '')
    .replace(/\s+and (?:you )?must provide a (?:current )?(?:satisfactory )?driver.?s? abstract.*$/i, '')
    .replace(/\s+with (?:a )?(?:satisfactory|acceptable|clean|good) (?:driver.?s?\s+)?(?:abstract|driving record|record).*$/i, '')
    .replace(/\s+with no more than \d+ demerit.*$/i, '')
    .replace(/\s+free of serious offences.*$/i, '')
    .replace(/\s+and meet(?:s)? (?:the )?corporate standard.*$/i, '')
    .replace(/\s+and must meet corporate standard.*$/i, '')
    .replace(/\s+must meet corporate standard.*$/i, '')
    .replace(/\s+meet the definition of a competent driver.*$/i, '')
    .replace(/\s+in accordance with the Highway Traffic Act.*$/i, '')
    .replace(/\s+and an abstract clear of demerit.*$/i, '')
    .replace(/\s+and\/or a record found to be satisfactory.*$/i, '')
    .replace(/\s*\(mileage compensated\).*$/i, '')
    .replace(/\s*\(6\+ points disqualifies\).*$/i, '')
    .replace(/\s*with a driving record that demonstrates.*$/i, '')
    .replace(/\s*with a driving record demonstrating.*$/i, '')
    .trim();

  if (/\bDND\s*404\b/i.test(s)) {
    return /\bability to obtain|able to obtain|willing|eligibility/i.test(value)
      ? "DND 404 driver's licence (able to obtain)"
      : "DND 404 driver's licence";
  }

  // Travel-if-driving boilerplate with no specific class.
  if (/\bability to travel to off[- ]?site\b/i.test(value) && /\bif method of travel is by vehicle\b/i.test(value)) {
    return "Driver's licence";
  }

  // Real licence class codes only — not "class vehicle", "passenger-class", etc.
  const isValidClass = (code: string): boolean =>
    /^(?:G[12]?|[A-F]|[1-6]|AZ|BZ|CZ|DZ|EZ|FZ|MZ)$/i.test(code);

  const classes: string[] = [];
  for (const m of s.matchAll(/\bclass\s*[\u201c\u201d"'‘’]?([A-Za-z0-9]{1,3})[\u201c\u201d"'‘’]?/gi)) {
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }
  for (const m of s.matchAll(/\b([A-Za-z0-9]{1,3})-class\b/gi)) {
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }
  // "G class driver's licence" / "5 class" — not the article in "a Class G".
  for (const m of s.matchAll(/\b([A-Za-z0-9]{1,3})\s+class\b/gi)) {
    if (/^(?:a|an|the|this|that|any|our|your|no|one)$/i.test(m[1])) continue;
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }
  for (const m of s.matchAll(/\(\s*class\s*([A-Za-z0-9]{1,3})\s*\)/gi)) {
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }
  // Bare quoted class next to licence wording (not endorsement alone).
  for (const m of s.matchAll(/[\u201c\u201d"'‘’]([A-Za-z0-9]{1,3})[\u201c\u201d"'‘’]\s*(?:driver|licen|class)\b/gi)) {
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }
  // "Ontario G driver's licence" / "Valid G Drivers' license" — not the article "a driver".
  for (const m of s.matchAll(/\b([BCDEFG][12]?|DZ|AZ|CZ|BZ|[1-6])\s+driver/gi)) {
    if (isValidClass(m[1])) classes.push(m[1].toUpperCase());
  }

  const endorsements: string[] = [];
  if (/\b[\u201c\u201d"'‘’]?Z[\u201c\u201d"'‘’]?\s*endorsement|\bendorsement\s*[\u201c\u201d"'‘’]?Z[\u201c\u201d"'‘’]?/i.test(s)) {
    endorsements.push('Z');
  }
  if (/\bair[- ]?brake/i.test(s)) endorsements.push('air brake');

  let province = '';
  if (/\bontario\b|\bMTO\b|province of ontario/i.test(s)) province = 'Ontario';
  else if (/\bbritish columbia\b|\bBC\b(?!\s*Class)/i.test(s) || /\bClass\s+\d+\s+BC\b/i.test(s) || /\bBC\s+Driver/i.test(s) || /\bBC Class\b/i.test(s)) province = 'BC';
  else if (/\balberta\b/i.test(s)) province = 'Alberta';
  else if (/\bmanitoba\b/i.test(s)) province = 'Manitoba';
  else if (/\bsaskatchewan\b/i.test(s)) province = 'Saskatchewan';
  else if (/\bnova scotia\b/i.test(s)) province = 'Nova Scotia';

  // Fold D + Z endorsement → DZ (standard Ontario air-brake combo class label).
  // Drop bare "A" when it co-occurs with another class — almost always the article in
  // "a Class G" / "and an abstract", not Ontario Class A (rare; usually written "Class A").
  let unique = [...new Set(classes.filter(Boolean))];
  if (unique.includes('A') && unique.some(c => c !== 'A')) {
    unique = unique.filter(c => c !== 'A');
  }
  if (unique.includes('D') && endorsements.includes('Z') && !unique.some(c => c.includes('Z'))) {
    unique = unique.map(c => (c === 'D' ? 'DZ' : c));
  }
  // C + Z stays "C with Z endorsement" (not always a formal CZ class).
  const zAbsorbed = unique.some(c => /Z/i.test(c));
  const remainingEnd = endorsements.filter(e => !(e === 'Z' && zAbsorbed));

  const ableToObtain = /\b(?:ability|able|willing(?:ness)?)\s+to\s+obtain\b|\beligibility and willingness to obtain\b|\bobtain and maintain\b/i.test(value)
    && !/\b(?:must|currently)\s+have\s+a\s+valid\b/i.test(value.slice(0, 80));
  // "ability to obtain Class C" while also "must have Class G" is multi-clause — handled by split.
  const pureObtain = /\b(?:ability|able|willing(?:ness)?)\s+to\s+obtain\b|\bobtain and maintain\b/i.test(s);

  if (unique.length === 0) {
    if (!/\bdriver.?s?\s+licen[cs]e\b/i.test(s)) return null;
    const base = province ? `${province} driver's licence` : "Driver's licence";
    if (/\bor (?:other )?provincial(?:\/territorial)? equivalen/i.test(value)) {
      return pureObtain ? `${base} or equivalent (able to obtain)` : `${base} or equivalent`;
    }
    return pureObtain || ableToObtain ? `${base} (able to obtain)` : base;
  }

  const classLabel = unique.join('/');
  let out = province ? `${province} Class ${classLabel}` : `Class ${classLabel}`;
  if (remainingEnd.includes('Z') && !/Z/i.test(classLabel)) {
    out += ' with Z endorsement';
  } else if (remainingEnd.filter(e => e !== 'Z').length) {
    out += ` with ${remainingEnd.filter(e => e !== 'Z').join(' & ')} endorsement`;
  } else if (remainingEnd.includes('air brake')) {
    out += ' with air brake endorsement';
  }

  if (/\bor (?:other )?provincial(?:\/territorial)? equivalen|\bor equivalent\b/i.test(value)) {
    out += ' or equivalent';
  }
  if (pureObtain || (ableToObtain && /\bobtain\b/i.test(s))) {
    out += ' (able to obtain)';
  }
  return out;
}

/** True when a licence value describes driving/vehicle eligibility, not a professional licence. */
export function isDriverLicenseRequirement(value: string): boolean {
  return looksLikeDriverLicense(value);
}

/** Split multi-licence walls into separate clauses before compacting. */
function splitLicenseClauses(value: string): string[] {
  // Erroneous merge from earlier pass: "Ontario Class G/C with Z endorsement"
  const gcMerge = value.match(/^(.*?\b)?Class\s+G\/C\b(.*)$/i);
  if (gcMerge && /\bZ\b|endorsement/i.test(value)) {
    const prov = /\bOntario\b/i.test(value) ? 'Ontario ' : '';
    const able = /\(able to obtain\)/i.test(value) ? ' (able to obtain)' : '';
    return [
      `${prov}Class G`.trim(),
      `${prov}Class C with Z endorsement${able}`.trim(),
    ];
  }
  const gCz = value.match(/^(.*?\b)?Class\s+G\/CZ\b(.*)$/i);
  if (gCz) {
    const prov = /\bOntario\b/i.test(value) ? 'Ontario ' : '';
    const able = /\(able to obtain\)/i.test(value) ? ' (able to obtain)' : '';
    return [`${prov}Class G`.trim(), `${prov}Class CZ${able}`.trim()];
  }

  const parts = value
    .split(
      /(?<=[.!?])\s+(?=Must\b)|;\s+(?=Must\b)|,\s*(?=Must\b)|\.\s*(?=Must have the ability)|\band must have the ability to\b|\band must be able to obtain\b/i,
    )
    .map(part => part.trim().replace(/^and\s+/i, ''))
    .filter(part => part.length > 8);
  return parts.length > 1 ? parts : [value];
}

/**
 * Collapse wordy professional-registration / driver-licence prose into a short label.
 * e.g. "registration as Registered Nurse (RN) with the College of Nurses of Ontario"
 *   → "RN (CNO)"
 * e.g. 'Must have a valid Ontario Class "G" driver’s licence and meet corporate standard…'
 *   → "Ontario Class G"
 */
export function normalizeLicenseRequirement(value: string): string {
  if (!value) return '';
  // Already compact (e.g. "RN (CNO)", "P.Eng. (PEO)", "Ontario Class G") — leave alone.
  const compactProbe = value.trim().replace(/[;]+$/g, '').replace(/\bP\.?\s*Eng\.*/gi, 'P.Eng.');
  if (/^(?:RN|RPN|LPN|RN-EC|P\.Eng\.|EIT|CET|RPP|CPA|MLT)(?:\s*\([A-Za-z0-9./-]+\))?(?:\s+or eligible)?$/i.test(compactProbe)
    || /^(?:CNO|CRNA|CRNS|PEO|EGBC|CPSO|CASLPO|CPBAO|CRPO|CECE|CDO|OACETT|OPPI)(?:\s+or eligible)?$/i.test(compactProbe)
    || /^(?:CET \(OACETT\) or P\.Eng\. \(PEO\))(?: or eligible)?$/i.test(compactProbe)
    || /^(?:(?:Ontario|BC|Alberta|Manitoba|Saskatchewan|Nova Scotia)\s+)?(?:Class\s+[A-Z0-9/]+(?:\s+with\s+[\w\s]+ endorsement)?|Driver'?s licence)(?:\s+or equivalent)?(?:\s+\(able to obtain\))?$/i.test(compactProbe)
    || /^DND 404 driver'?s licence(?:\s+\(able to obtain\))?$/i.test(compactProbe)) {
    return compactProbe;
  }

  // Multi-clause driver walls → first clause only here; list normalizer expands the rest.
  if (looksLikeDriverLicense(value) && splitLicenseClauses(value).length === 1) {
    const driver = compactDriverLicense(value);
    if (driver) return driver;
  }

  let s = cleanLicenseRequirement(value);
  if (!s || isNonLicenseJunk(s)) return '';

  // Chop experience / travel / multi-requirement gloms that rode along.
  s = s
    .replace(/\s*(?:;|,)?\s*(?:and\s+)?(?:a\s+)?minimum of \d+.*$/i, '')
    .replace(/\s*(?:;|,)?\s*(?:and\s+)?\d+\s*(?:to\s*\d+\s+)?years?[’']?\s+(?:of\s+)?(?:related\s+)?experience.*$/i, '')
    .replace(/\s*(?:;|,)?\s*(?:and\s+)?three years?[’']? experience.*$/i, '')
    .replace(/\s*(?:;|,)?\s*with one year in the occupational health field.*$/i, '')
    .replace(/\s*(?:;|,)?\s*(?:valid\s+)?unrestricted driver.?s?\s+licen[cs]e.*$/i, '')
    .replace(/\s*(?:;|,)?\s*basic life support.*$/i, '')
    .replace(/\s*(?:;|,)?\s*willingness and ability to travel.*$/i, '')
    .replace(/\s+accompanied with minimum \d+ years?.*$/i, '')
    .replace(/\s+with progressive relevant work experience.*$/i, '')
    .replace(/\s+with a degree in civil engineering.*$/i, '')
    .replace(/\s+and forge a career.*$/i, '')
    .replace(/\s+and at least \d+ years?.*$/i, '')
    .replace(/\s*,?\s*including direct development.*$/i, '')
    .replace(/\s*[-–—:]\s*include license number.*$/i, '')
    .replace(/\s*\(to be met at the time of appointment\)\s*$/i, '')
    .replace(/\s+as a condition of (?:continued\s+)?employment.*$/i, '')
    .replace(/\s+and entitled to practise.*$/i, '')
    .replace(/\s+with no conditions or restrictions.*$/i, '')
    .replace(/\s*\(must attain designation to teach in the program\)\s*$/i, '')
    .replace(/\s+or actively involved with the graduate studies.*$/i, '')
    .trim();

  // Prefer compact driver form whenever this clause is driver-shaped.
  if (looksLikeDriverLicense(s)) {
    const driver = compactDriverLicense(s);
    if (driver) return driver;
  }

  const looksProfessional = /\b(?:registration|registered|college of|professional engineer|p\.?\s*eng|membership with|designation|licen[cs]e to practi[cs]e|certificate of registration|regulatory|oacett|law society|early childhood educator|psycholog|dietitian|audiolog|social worker|nurse|architect)\b/i.test(s);
  const isDriverHeavy = /\bdriver/i.test(s) && !/\b(?:nurse|engineer|college of|p\.?\s*eng|oacett|psycholog|dietitian|lawyer|law society|early childhood|architect|accountant|cpa)\b/i.test(s);

  if (looksProfessional && !isDriverHeavy) {
    const eligible = /\beligib(?:le|ility)\b|\bor eligibility\b/i.test(s);
    const role = detectLicenseRole(s);
    const body = detectLicenseBody(s);

    // "Full membership with OPPI and RPP designation"
    if (/\bOPPI\b/i.test(s) && /\bRPP\b/i.test(s)) {
      return formatProfessionalLicense('RPP', 'OPPI', eligible);
    }
    // "Registration with OACETT with CET ... or ... P.Eng"
    if (/\bOACETT\b/i.test(s) && /\b(?:CET|P\.?\s*Eng)\b/i.test(s) && /\bor\b/i.test(s) && /\bPEO\b|professional engineers/i.test(s)) {
      return eligible ? 'CET (OACETT) or P.Eng. (PEO) or eligible' : 'CET (OACETT) or P.Eng. (PEO)';
    }
    // Trade tickets: keep the trade name + code, not just the issuer.
    if (/\bontario college of trades\b|\bcertificate of qualification\b/i.test(s)) {
      const asTrade = s.match(/\bas an?\s+([A-Za-z][A-Za-z0-9 /&'-]{2,50}?)(?:\s*\(([0-9A-Z-]+)\))/i)
        || s.match(/\bas an?\s+([A-Za-z][A-Za-z0-9 /&'-]{3,50})(?:\s*[,;.]|$)/i);
      const namedTicket = s.match(/\bvalid\s+([A-Za-z][^,(]{2,40}?)\s+certificate of qualification\s*\(([0-9A-Z-]+)\)/i);
      const coqCode = s.match(/\bcertificate of qualification\s*\(([0-9A-Z-]+)\)/i);
      if (namedTicket) {
        return `${compactText(namedTicket[1])} (${namedTicket[2]})`;
      }
      if (asTrade) {
        const trade = compactText(asTrade[1]);
        return asTrade[2] ? `${trade} (${asTrade[2]})` : trade;
      }
      if (coqCode) return `Certificate of Qualification (${coqCode[1]})`;
    }

    // "Registration with PEO as a licensed Engineer"
    if (!role && /\b(?:PEO|professional engineers(?: of)? ontario)\b/i.test(s)
      && /\b(?:licensed engineer|professional engineer|p\.?\s*eng|engineer)\b/i.test(s)) {
      return formatProfessionalLicense('P.Eng.', detectLicenseBody(s) || 'PEO', eligible);
    }

    // Optional-only designations ("is ideal" / "highly desired") aren't hard requirements.
    if (/\b(?:is ideal|is preferred|would be (?:an?\s+)?(?:asset|ideal)|highly desired)\b/i.test(s)) {
      return '';
    }

    const formatted = formatProfessionalLicense(role, body, eligible);
    if (formatted) return formatted;

    // Body-only "registration with the College of Nurses of Ontario"
    if (body && /\b(?:registration|registered|member|membership|licen[cs]e)\b/i.test(s)) {
      return formatProfessionalLicense(null, body, eligible);
    }
  }

  // Non-driver leftovers: light fluff strip only.
  s = s
    .replace(/\s+in good standing\b/gi, '')
    .replace(/(?<!P\.Eng)[;,.]+$/i, '')
    .replace(/[;,]+\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s || s.length < 3) return cleanLicenseRequirement(value);
  // Last chance driver compact after light clean.
  if (looksLikeDriverLicense(s)) {
    const driver = compactDriverLicense(s);
    if (driver) return driver;
  }
  return s;
}

function isAcceptableNormalizedLicense(value: string): boolean {
  if (!value) return false;
  if (LICENSE_TERM.test(value)) return true;
  if (detectLicenseRole(value) || detectLicenseBody(value)) return true;
  // Short body/role-only labels after compaction (e.g. "CNO", "P.Eng.").
  if (/^(?:CNO|CRNA|CRNS|PEO|EGBC|EGM|CPSO|CASLPO|CPBAO|CRPO|CECE|CDO|OACETT|OPPI|CIPHI|CSMLS|HSCPOA|MMAH|CPA|RPP|EIT|CET|MLT|P\.Eng\.?|RN|RPN|LPN|RN-EC)$/i.test(value)) return true;
  if (/^(?:RN|RPN|LPN|RN-EC|P\.Eng\.?|EIT|CET|RPP|CPA|MLT|Landscape Architect)\s*\(/i.test(value)) return true;
  // Compacted driver labels: "Ontario Class G", "Class 5 or equivalent", "Driver's licence"
  if (/^(?:(?:Ontario|BC|Alberta|Manitoba|Saskatchewan|Nova Scotia)\s+)?(?:Class\s+[A-Z0-9/]+|Driver'?s licence)\b/i.test(value)) return true;
  if (/^DND 404 driver'?s licence\b/i.test(value)) return true;
  // Trade tickets: "Metal Fabricator (437A)", "Industrial Electrician (442-A)", "Certificate of Qualification (437A)"
  if (/\([0-9A-Z-]{2,}\)\s*$/.test(value) && value.length <= 80) return true;
  if (/^certificate of qualification\b/i.test(value)) return true;
  return false;
}

/** Normalize stored or AI licence list items (idempotent). */
export function normalizeLicenseRequirements(value: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of toStringList(value)) {
    // Expand multi-clause walls ("Must have Class G. Must obtain Class C…") into separate labels.
    const clauses = looksLikeDriverLicense(item) ? splitLicenseClauses(item) : [item];
    for (const clause of clauses) {
      const cleaned = normalizeLicenseRequirement(clause);
      if (!isAcceptableNormalizedLicense(cleaned)) continue;
      const key = normalizedRequirement(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}

/** Values appropriate for the Licences field; driver licences belong under Vehicle. */
export function normalizeProfessionalLicenseRequirements(value: unknown): string[] {
  return normalizeLicenseRequirements(value).filter(value => !isDriverLicenseRequirement(value));
}

function normalizedRequirement(value: string): string {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function retainExistingEducation(value: string): boolean {
  const cleaned = cleanEducationRequirement(value);
  if (cleaned.length > 300 || (!EDUCATION_TERM.test(cleaned) && !STUDENT_EDUCATION_TERM.test(cleaned)
    && !/\b(?:secondary\s+school|high\s+school|post[- ]secondary|education\s+verification)\b/i.test(cleaned))) {
    return false;
  }
  if (/\b(?:leading|supports? students|position is|this role|post[- ]secondary institution offering|navigate|campus events)\b/i.test(cleaned)) return false;
  return /^\s*(?:a|an|minimum|completion|completed|successful|degree|diploma|education\s+verification|post[- ]secondary|undergraduate|graduate|secondary\s+school|high\s+school|your\s+educational|candidates?\s+must|must|current(?:ly)?\s+enrol(?:l(?:ed|ment)?|ment)?|registration\s+in\s+(?:a\s+)?co-?op|we\s+are\s+seeking|\d+[- ]year|university|college|bachelor|master|ph\.?d|graduation)/i.test(cleaned)
    || /\b(?:completion\s+of|degree\s+in|diploma\s+in|equivalent\s+combination|secondary\s+school\s+diploma)\b/i.test(cleaned);
}

function retainExistingLicense(value: string): boolean {
  const cleaned = normalizeLicenseRequirement(value);
  if (!cleaned || cleaned.length > 300) return false;
  if (isNonLicenseJunk(value)) return false;
  if (/\b(?:software|application|product|patent|open[- ]source)\s+licen[cs]e|licen[cs]e\s+information\b/i.test(value)) return false;
  return isAcceptableNormalizedLicense(cleaned);
}

export function extractEducationRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits') continue;
    const text = stripEducationLabelPrefix(line.text);
    if (EDUCATION_VERIFICATION.test(text)) {
      values.add('Education verification');
      continue;
    }
    if (!EDUCATION_TERM.test(text) && !STUDENT_EDUCATION_TERM.test(text)
      && !HIGH_SCHOOL_EDUCATION_TERM.test(text)) {
      continue;
    }
    if (/\b(?:leading|post[- ]secondary institution offering|supports? students|position is|campus events)\b/i.test(text)) continue;
    if (line.section !== 'required' && text.length > 300) continue;
    if (EDUCATION_CONTEXT_ONLY.test(text) && !FORMAL_EDUCATION_CUE.test(text) && !HIGH_SCHOOL_EDUCATION_TERM.test(text)) continue;
    if (line.section !== 'required' && !HIGH_SCHOOL_EDUCATION_TERM.test(text)
      && !/^\s*(?:a|an|minimum|completion|completed|successful|degree|diploma|post[- ]secondary|undergraduate|graduate|secondary\s+school|your\s+educational|candidates?\s+must|must|currently\s+enrolled|we\s+are\s+seeking|graduation)\b/i.test(text)) {
      continue;
    }
    const educationIndex = text.search(EDUCATION_TERM);
    const educationContext = educationIndex >= 0
      ? text.slice(Math.max(0, educationIndex - 80), educationIndex + 40)
      : text;
    if (line.section !== 'required' && !STUDENT_EDUCATION_TERM.test(text) && !HIGH_SCHOOL_EDUCATION_TERM.test(text)
      && !EDUCATION_REQUIRED_CUE.test(educationContext)
      && !/\b(?:secondary\s+school|successful\s+completion)\b/i.test(text)) {
      continue;
    }
    const value = cleanEducationRequirement(text);
    if (value && (EDUCATION_TERM.test(value) || STUDENT_EDUCATION_TERM.test(value) || HIGH_SCHOOL_EDUCATION_TERM.test(value))
      && !STRUCTURED_OPTIONAL_REQUIREMENT.test(value)) {
      values.add(value);
    }
  }
  return normalizeEducationRequirements([...values]);
}

function licenseLineCandidates(text: string): string[] {
  // Federal "COE3: Must possess … Class 5 driver's license" walls and dense
  // conditions paragraphs need splitting before the line filter runs.
  if (/\bCOE\d+\s*:/i.test(text) || text.length > 220) {
    return text
      .split(/(?:COE\d+\s*:|[.;](?=\s*[A-Z0-9])|\n+)/i)
      .map(chunk => compactText(chunk))
      .filter(Boolean);
  }
  return [text];
}

function tryExtractLicenseFromText(text: string, section: RequirementSection): string | null {
  if (section === 'optional' || section === 'benefits' || !LICENSE_TERM.test(text)) return null;
  // "Must hold Class C licence. Experience as a bus driver is an asset." — the
  // asset clause is a separate fact; don't let it poison the licence half.
  // Only strip a *new sentence* (capital after period) so "P.Eng. designation
  // is an asset" stays intact and is rejected as optional below.
  const licenseFocus = text
    .replace(/\.\s+(?=[A-Z])[^.]*\b(?:asset|preferred|nice\s+to\s+have|desirable)\b[^.]*\.?\s*$/i, '')
    .trim();
  if (STRUCTURED_OPTIONAL_REQUIREMENT.test(licenseFocus)) return null;
  if (/\bregistered\s+as\s+(?:a\s+)?(?:full[- ]time|part[- ]time)?\s*student\b/i.test(text)) return null;
  if (/\b(?:software|application|product|patent|open[- ]source)\s+licen[cs]e|licen[cs]e\s+information\b/i.test(text)) return null;
  // Job duties about issuing/revoking licences are not candidate requirements.
  if (/\b(?:approve|refuse|revoke|issue|issuing|administering\s+a\s+driver.?s?\s+licen[cs]ing)\b/i.test(text)
    && !/\b(?:must|valid|possess|hold|possession|required)\b/i.test(text)) {
    return null;
  }
  if (section !== 'required' && text.length > 300) return null;
  if (section !== 'required' && !LICENSE_REQUIRED_CUE.test(text) && !new RegExp(LICENSE_CLASS, 'i').test(text)) return null;

  const explicitLicense = new RegExp(
    String.raw`\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|${LICENSE_CLASS}\s+(?:driver.?s?\s+)?licen[cs]e|licen[cs]e|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification|certificate\s+of\s+authorization)\b`,
    'i',
  ).test(licenseFocus);
  const explicitRegistration = /\b(?:registration\s+(?:with|in|as|through)|registered\s+(?:as|with|by)|professional\s+registration|designation\s+(?:as|with|required)|registration\b[^\n]{0,30}\b(?:required|must|valid|eligible))\b/i.test(licenseFocus);
  if (!explicitLicense && !explicitRegistration) return null;
  if (explicitRegistration && !/\b(?:college|university|association|board|professional|regulatory|ontario|nurse|engineer|architect|inspector|MMAH|PEO|CPA|CET|designation|accounting)\b/i.test(licenseFocus)) return null;
  if (!LICENSE_REQUIRED_CUE.test(licenseFocus) && !new RegExp(String.raw`(?:valid|current|${LICENSE_CLASS}|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification)`, 'i').test(licenseFocus)) return null;

  const value = normalizeLicenseRequirement(licenseFocus);
  if (!value || STRUCTURED_OPTIONAL_REQUIREMENT.test(value)) return null;
  if (!LICENSE_TERM.test(value) && !isAcceptableNormalizedLicense(value)) return null;
  return value;
}

export function extractLicenseRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading) continue;
    for (const chunk of licenseLineCandidates(line.text)) {
      const value = tryExtractLicenseFromText(chunk, line.section);
      if (value) values.add(value);
    }
  }
  return normalizeLicenseRequirements([...values]);
}

/** Extract only professional licences/registrations for the Licences field. */
export function extractProfessionalLicenseRequirements(description: string): string[] {
  return extractLicenseRequirements(description).filter(value => !isDriverLicenseRequirement(value));
}

function licenseCoreKey(value: string): string {
  return normalizedRequirement(value)
    .replace(/\b(?:valid|current|must|have|hold|possess|maintain|obtain|provide|a|an|the|and|or|with|in|good|standing|clean|clear|abstract|no more than \d+ demerit points?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function licenseKeysOverlap(left: string, right: string): boolean {
  const a = licenseCoreKey(left);
  const b = licenseCoreKey(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // Both are driver-licence requirements of some class.
  const aDriver = /\bdriver/.test(a) || /\bclass\b/.test(a);
  const bDriver = /\bdriver/.test(b) || /\bclass\b/.test(b);
  if (aDriver && bDriver) {
    const classOf = (value: string) => value.match(/\bclass\s*([a-z0-9]+)/)?.[1] ?? '';
    const ca = classOf(a);
    const cb = classOf(b);
    return !ca || !cb || ca === cb;
  }
  return false;
}

function isQualificationsHeading(raw: string): boolean {
  const heading = raw
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\*{1,2}/, '')
    .replace(/\*{1,2}:?\s*$/, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase();
  if (!heading || heading.length > 80) return false;
  return /\b(?:qualifications?|requirements?|skills?|conditions?(?:\s+of\s+employment)?|minimum|essential|what you (?:need|should)|knowledge and skills|education and experience)\b/i.test(heading)
    && !/\bnice to have|preferred|asset|benefit|compensation|responsibilit|overview\b/i.test(heading);
}

function educationCoreKey(value: string): string {
  return normalizedRequirement(value)
    .replace(/\b(?:must|have|hold|completion|completed|successful|minimum|required|a|an|the|of|in|or|and|equivalent|combination|education|training|experience|degree|diploma|certificate|plus|program)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function experienceCoreKey(value: string): string {
  return normalizedRequirement(value)
    .replace(/\b\d+(?:\.\d+)?\s*\+?\s*[-–—]?\s*(?:years?|months?|yrs?)\b/g, ' ')
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|several)\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\b(?:must|have|possess|minimum|required|of|in|related|relevant|experience|years?|months?|yrs?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize Experience to a duration-only value for storage + display.
 * Domain detail stays in Qualifications, where it can be read in context.
 */
export function normalizeExperienceRequirement(value: string): string | null {
  let s = value.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  s = s.replace(/^Experience with\s+(?=(?:\d+(?:\+|–\d+)?\s*(?:years?|months?)|Recent|Several years)(?:\s+—|$))/i, '');
  const durationOnly = s.match(/^(\d+(?:\+|–\d+)?\s*(?:years?|months?))\s+—\s+(.+)$/i);
  if (durationOnly) {
    return durationOnly[1].replace(/\s+/g, ' ');
  }
  // Non-numeric requirements remain in Qualifications rather than the
  // duration-only Experience property.
  if (/^(?:Recent|Several years)(?:\s+—\s+.*)?$/i.test(s)) return null;

  if (EXPERIENCE_SKILL_PATTERNS.some(([, pattern]) => pattern.test(s))
    && /^experience\b/i.test(s)) {
    return null;
  }

  // Definition / glossary lines (federal "Experience is defined as…", BC "Recent… is defined as…")
  if (/\bis defined as\b/i.test(s) || /^experience is defined\b/i.test(s)) {
    const within = s.match(/within the past\s+(?:\w+\s*)?\(?(\d+)\)?\s*years?/i);
    if (within) return null;
    const approx = s.match(/approximately\s+(?:\w+\s*)?\((\d+)\)\s*years?/i)
      || s.match(/(?:period of\s+)?(?:approximately\s+)?(\d+)\s*\+?\s*years?\s+or\s+more/i)
      || s.match(/\((\d+)\)\s*years?\s+or\s+more/i)
      || s.match(/(\d+)\s*\+?\s*years?\s+or\s+more/i)
      || s.match(/(\d+)\s*\+?\s*years?/i);
    if (approx?.[1]) return `${approx[1]}+ years`;
    const word = s.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+or\s+more/i);
    if (word) {
      return `${EXPERIENCE_WORD_NUMBERS[word[1].toLowerCase()]}+ years`;
    }
    return null; // pure glossary noise
  }

  s = s
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*\(\s*(\d+)\s*\)(?=\s*(?:years?|months?)\b)/gi, '$2')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)(?=\s*(?:years?|months?)\b)/gi, raw => EXPERIENCE_WORD_NUMBERS[raw.toLowerCase()]);

  const number = (raw: string): string => EXPERIENCE_WORD_NUMBERS[raw.toLowerCase()] ?? raw;
  const range = s.match(/^(?:(?:a\s+)?minimum(?:\s+of)?|at\s+least|over|more\s+than)?\s*(\d+(?:\.\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(years?|yrs?|months?)?\s*(?:-|–|—|to|and\s+up\s+to)\s*(\d+(?:\.\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(years?|yrs?|months?)\b/i);
  const single = s.match(/^(?:(?:a\s+)?minimum(?:\s+of)?|at\s+least|over|more\s+than)?\s*(\d+(?:\.\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten)\s*[-–—]?\s*(years?|yrs?|months?)\b/i);
  const duration = range || single;

  if (duration) {
    const minimum = number(duration[1]);
    const maximum = range ? number(duration[3]) : null;
    const rawUnit = range ? duration[4] || duration[2] : duration[2];
    const unit = rawUnit.toLowerCase().startsWith('month') ? 'month' : 'year';
    const hasThreshold = /^(?:a\s+)?(?:minimum|at\s+least|over|more\s+than)\b/i.test(s);
    const minimumLabel = minimum.endsWith('+') ? minimum : hasThreshold ? `${minimum}+` : minimum;
    const plural = maximum || minimumLabel.endsWith('+') || minimum !== '1' ? 's' : '';
    const label = maximum
      ? `${minimum.replace(/\+$/, '')}–${maximum.replace(/\+$/, '')} ${unit}s`
      : `${minimumLabel} ${unit}${plural}`;
    let domain = s.slice(duration[0].length).replace(/[.;\s]+$/g, '').trim();
    const experiencePhrase = domain.match(/^[’']?\s*(?:of\s+)?((?:[a-z-]+\s+){0,4}experience)\b(.*)$/i);
    if (experiencePhrase) {
      const afterExperience = experiencePhrase[2].replace(/^[,;:–—-]\s*/, '').trim();
      domain = /^(?:in|with|using)\b/i.test(afterExperience)
        ? afterExperience.replace(/^(?:in|with|using)\s+(?:the\s+)?/i, '').trim()
        : afterExperience
          ? experiencePhrase[1].trim().toLowerCase() === 'experience'
            ? afterExperience
            : experiencePhrase[1].trim() + ', ' + afterExperience
          : experiencePhrase[1].trim().toLowerCase() === 'experience' ? '' : experiencePhrase[1].trim();
    }
    domain = domain.replace(/^[,;:–—-]\s*/, '').replace(/[.;\s]+$/g, '').trim();
    return label;
  }
  return null;
}

function experienceDetailBullet(value: string): string | null {
  const compact = value.replace(/\s+/g, ' ').trim().replace(/[.;]+$/, '');
  if (!compact || normalizeExperienceRequirement(compact) === null) {
    return compact || null;
  }

  const duration = compact.match(/^(?:(?:a\s+)?minimum(?:\s+of)?|at\s+least|over|more\s+than)?\s*(?:\d+(?:\.\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?\s*[-–—]?\s*(?:years?|yrs?|months?)\b/i);
  if (!duration) return null;
  const remainder = compact.slice(duration[0].length)
    .replace(/^\s*(?:of\s+)?experience\b\s*/i, '')
    .replace(/^[,;:–—-]\s*/, '')
    .trim();
  if (!remainder || /^(?:related|relevant|progressive)\s+experience$/i.test(remainder)) return null;

  // Keep the full source wording for alternatives and conditions. This avoids
  // changing the relationship between education, credentials, and durations.
  return compact;
}

/** Return source requirements that belong in the Qualifications narrative. */
export function experienceQualificationBullets(values: string[]): string[] {
  return [...new Set(values
    .map(experienceDetailBullet)
    .filter((value): value is string => Boolean(value)))];
}

/** Add moved Experience detail to Qualifications without duplicating exact bullets. */
export function appendExperienceQualificationBullets(description: string, values: string[]): string {
  const bullets = experienceQualificationBullets(values)
    .filter(bullet => !description.toLowerCase().includes(bullet.toLowerCase()));
  if (bullets.length === 0) return description;

  const lines = description.trim() ? description.trim().split('\n') : [];
  const qualificationIndex = lines.findIndex(line => /^#{1,6}\s+/.test(line) && isQualificationsHeading(line.trim()));
  if (qualificationIndex >= 0) {
    lines.splice(qualificationIndex + 1, 0, ...bullets.map(bullet => `- ${bullet}`));
    return lines.join('\n');
  }
  const suffix = `## Qualifications\n${bullets.map(bullet => `- ${bullet}`).join('\n')}`;
  return lines.length > 0 ? `${lines.join('\n')}\n\n${suffix}` : suffix;
}

/** Extract concrete skills that are also stated as experience domains. */
export function extractExperienceSkills(values: string[]): string[] {
  return EXPERIENCE_SKILL_PATTERNS
    .filter(([, pattern]) => values.some(value => pattern.test(value)))
    .map(([skill]) => skill);
}

/** True when a stored value ends inside an opening parenthesized clause. */
export function isTruncatedExperienceRequirement(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')' && depth > 0) depth--;
  }
  return depth > 0;
}

/** Normalize a list to unique duration-only items and drop non-duration text. */
export function normalizeExperienceRequirements(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const compact = normalizeExperienceRequirement(raw);
    if (!compact) continue;
    const key = compact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(compact);
  }
  return out;
}

function keysOverlapLoose(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  // Shared substantial token (e.g. "high school", "bachelor", "nursing")
  const leftTokens = left.split(' ').filter(t => t.length > 3);
  const rightSet = new Set(right.split(' '));
  const shared = leftTokens.filter(t => rightSet.has(t));
  return shared.length >= 2 || (shared.length === 1 && shared[0].length >= 6);
}

const CERTIFICATION_RESTATEMENT_NOISE = new Set([
  'a', 'an', 'and', 'be', 'by', 'certificate', 'certificates', 'certification', 'certifications',
  'certified', 'complete', 'completed', 'completion', 'course', 'courses', 'current', 'from',
  'have', 'hold', 'in', 'maintain', 'may', 'must', 'obtain', 'of', 'offer', 'on', 'or', 'prior',
  'ontario', 'required', 'successfully', 'the', 'to', 'training', 'valid', 'within', 'willing', 'willingness',
]);

function certificationRestatementTokens(value: string): string[] {
  return normalizedRequirement(value)
    .split(' ')
    .map(token => token === 'handlers' ? 'handler' : token)
    .filter(token => token.length > 2 && !CERTIFICATION_RESTATEMENT_NOISE.has(token));
}

function isCertificationRestatementBullet(text: string, certifications: string[]): boolean {
  if (!certifications.length) return false;
  const focus = text
    .replace(/^\s*(?:required\s+)?certifications?\s*:\s*/i, '')
    .replace(/^\s*(?:current|valid|required)\s+certifications?\s+(?:include|are|:)?\s*/i, '')
    .trim();
  if (!focus || focus.length > 320) return false;

  const hasCertificationCue = /\b(?:certificat(?:e|ion)|credential|qualification|training|first[-\s]?aid|\bcpr\b|\baed\b|\bwhmis\b|smart\s+serve|food\s+handler|high\s+five)\b/i.test(focus);
  if (!hasCertificationCue) return false;

  const certificationTokens = new Set(certifications.flatMap(certificationRestatementTokens));
  const bulletTokens = certificationRestatementTokens(focus);
  if (!bulletTokens.length) return false;

  // Keep a mixed bullet when it contains a distinct qualification that is not
  // represented by the Certifications field (for example HIGH FIVE plus First Aid).
  return bulletTokens.every(token => certificationTokens.has(token));
}

const SKILL_RESTATEMENT_NOISE = new Set([
  'a', 'an', 'and', 'be', 'by', 'can', 'demonstrated', 'excellent', 'experience', 'familiar',
  'familiarity', 'good', 'have', 'in', 'including', 'knowledge', 'of', 'proficiency', 'proficient',
  'application', 'applications', 'e', 'g', 'platform', 'platforms', 'process', 'processes',
  'required', 'skill', 'skills', 'skilled', 'strong', 'system', 'systems', 'the', 'to', 'tool',
  'tools', 'use', 'using', 'version', 'versions', 'with', 'working',
]);
const MISCLASSIFIED_SKILL_PATTERN = /\b(?:criminal\s+record|vulnerable\s+sector|security\s+clearance|certification|certificate)\b/i;

function skillRestatementTokens(value: string): string[] {
  return normalizedRequirement(value)
    .split(' ')
    .filter(token => token.length > 1 && !/^\d+$/.test(token) && !SKILL_RESTATEMENT_NOISE.has(token));
}

function isRequiredSkillRestatementBullet(text: string, skills: string[]): boolean {
  if (!skills.length || text.length > 320 || MISCLASSIFIED_SKILL_PATTERN.test(text)) return false;
  if (!/\b(?:skill|proficien|knowledge|experience|familiar|ability|competenc|expert|adept|literacy|command|using|use|practic)\w*\b/i.test(text)) return false;

  // Agile-framework wording is often paraphrased instead of copied from the
  // structured value ("Scrum ceremonies", "Agile principles", etc.).
  if (skills.some(skill => /\b(?:scrum|kanban|agile)\b/i.test(skill))
    && /\b(?:scrum|kanban|agile)\b/i.test(text)
    && /\b(?:certif|ceremon|framework|principle|practic|understanding|knowledge|working)\w*\b/i.test(text)
    && text.length < 220) {
    return true;
  }

  let remaining = skillRestatementTokens(text);
  const phrases = skills
    .filter(skill => typeof skill === 'string' && !MISCLASSIFIED_SKILL_PATTERN.test(skill))
    .map(skillRestatementTokens)
    .filter(tokens => tokens.length > 0)
    .sort((left, right) => right.length - left.length);

  for (const phrase of phrases) {
    for (let index = 0; index <= remaining.length - phrase.length; index++) {
      if (!phrase.every((token, offset) => remaining[index + offset] === token)) continue;
      remaining.splice(index, phrase.length);
      break;
    }
  }

  return remaining.length === 0;
}

function removeStructuredParentheticalMentions(text: string, values: string[]): string | null {
  if (!values.length) return null;
  const keys = values.map(normalizedRequirement).filter(Boolean);
  let changed = false;
  const cleaned = text.replace(/\([^()]*\)/g, group => {
    const normalized = normalizedRequirement(group);
    if (!keys.some(key => normalized.includes(key))) return group;
    changed = true;
    return '';
  })
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return changed && cleaned !== text ? cleaned : null;
}

function replaceStructuredSoftwareMentions(text: string, software: string[]): string | null {
  const values = software
    .filter(value => normalizedRequirement(value).length >= 2 || /^r$/i.test(normalizedRequirement(value)))
    .sort((left, right) => right.length - left.length);
  if (!values.length) return null;

  const categoryFor = (value: string): string => {
    if (/\b(?:microsoft|office|word|excel|powerpoint|outlook|sharepoint|teams|access|project|visio)\b/i.test(value)) return 'office software';
    if (/\b(?:arcgis|qgis|gis|envi|pix4d|hec[- ]?ras)\b/i.test(value)) return 'GIS software';
    if (/\b(?:mysql|postgres(?:ql)?|oracle|mongodb|redis|sql|database|peoplesoft)\b/i.test(value)) return 'database software';
    if (/\bsap\b/i.test(value)) return 'enterprise software';
    if (/\b(?:python|matlab|javascript|java|r|ruby|c\+\+|programming)\b/i.test(value)) return 'programming tools';
    return 'software';
  };

  let cleaned = text;
  let changed = false;
  const markers = new Map<string, string>();
  for (const value of values) {
    const normalized = normalizedRequirement(value);
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'gi');
    if (/^(?:access|(?:microsoft|ms)\s+access)$/i.test(normalized)) pattern = /(?:Microsoft|MS)\s+Access\b|\bAccess\b/gi;
    if (/^project$/i.test(normalized)) pattern = /(?:Microsoft|MS)\s+Project\b/gi;
    if (/^word$/i.test(normalized)) pattern = /(?:Microsoft|MS)\s+Word\b|\bWord\b(?!\s+processing)/gi;
    if (/^excel$/i.test(normalized)) pattern = /(?:Microsoft|MS)\s+Excel\b|\bExcel\b(?!\s+in\b)/gi;
    if (/^microsoft\s+(?:word|excel|powerpoint|outlook|sharepoint|teams?|access|project|visio)$/i.test(normalized)) {
      const product = normalized.replace(/^microsoft\s+/i, '');
      const productPattern = product === 'word' ? '\\bWord\\b(?!\\s+processing)' : `\\b${product}s?\\b`;
      pattern = new RegExp(`(?:Microsoft|MS)\\s+${productPattern}|${productPattern}`, 'gi');
    }
    if (/^r$/i.test(normalized)) pattern = /\bR\b(?=\s*(?:,|and|or|programming|language|statistical))/gi;
    if (/^teams?$/i.test(normalized)) pattern = /Microsoft\s+Teams\b/gi;
    if (/^sap$/i.test(normalized)) {
      // A stored SAP value also covers named SAP products in source prose.
      // Consume the product name so no fragment such as "software SuccessFactors" remains.
      pattern = /\bSAP(?:\s+(?:SuccessFactors|Payroll|S\/4\s+HANA(?:\s+Payroll)?))?\b/gi;
    }
    if (/^rosi$/i.test(normalized)) pattern = /\bROSI(?:\s+Express)?\b/gi;
    if (/(?:system|application|program|tool)s?$/i.test(normalized)) {
      pattern = new RegExp(`(?<![A-Za-z0-9])${escaped}s?(?![A-Za-z0-9])`, 'gi');
    }
    const marker = `\uE000${markers.size}\uE001`;
    markers.set(marker, categoryFor(value));
    const next = cleaned.replace(pattern, (match, offset: number, full: string) => {
      if (/^\s+(?:software|tools?|applications?)\b/i.test(full.slice(offset + match.length))) return match;
      if (/^(?:access|(?:microsoft|ms)\s+access)$/i.test(normalized)
        && /\b(?:corridor|flagging|facility|building|site|road|physical|remote)\s+access\b|\baccess\s+(?:and\s+)?flagging\b/i.test(full.slice(Math.max(0, offset - 70), offset + match.length + 70))) {
        return match;
      }
      return marker;
    });
    if (next !== cleaned) changed = true;
    cleaned = next;
  }

  for (const [marker, category] of markers) cleaned = cleaned.replaceAll(marker, category);

  const category = '(?:office software|GIS software|database software|programming tools|enterprise software|software)';
  cleaned = cleaned
    .replace(new RegExp(`(${category})\\s*(?:,\\s*|\\s+and(?:\\/or)?\\s+|\\s+or\\s+)+\\1(?=\\s*(?:applications?|tools?|software)?(?:\\s|,|\\.|$))`, 'gi'), '$1')
    .replace(new RegExp(`(${category})\\s+and\\s+\\1\\s+(?=applications?|tools?|software)`, 'gi'), '$1 ')
    .replace(/\boffice software\s+(?:suite|processing)\b/gi, 'office software')
    .replace(/\bsoftware\s+(?:suite|processing)\b/gi, 'software')
    .replace(/\boffice software\s*(?:,|and|or)\s+software\b/gi, 'office software')
    .replace(/\bsoftware\s*(?:,|and|or)\s+office software\b/gi, 'office software')
    .replace(/\b(?:office software|software)(?:\s*,\s*(?:office software|software))+\b/gi, match => /office software/i.test(match) ? 'office software' : 'software')
    .replace(/\b(office|GIS|database|programming|enterprise)\s+\1\s+software\b/gi, '$1 software')
    .replace(/\b(office|GIS|database|programming|enterprise)\s+software(?:\s*,\s*\1\s+software)+\b/gi, '$1 software')
    .replace(/\bprogramming tools(?:\s*,\s*programming tools)+/gi, 'programming tools')
    .replace(/\bGIS software(?:\s*,\s*GIS software)+/gi, 'GIS software')
    .replace(/\bdatabase software(?:\s*,\s*database software)+/gi, 'database software')
    .replace(/\benterprise software(?:\s*,\s*enterprise software)+/gi, 'enterprise software')
    .replace(/\bservice management application\s*[-–—:]\s*software\b/gi, 'service management software')
    .replace(/\bapplications?\s*[-–—:]\s*software\b/gi, 'software')
    .replace(/,\s*(?=(?:and|or)\b)/gi, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return changed && cleaned !== text ? cleaned : null;
}

function removeStructuredSkillMentions(text: string, skills: string[]): string | null {
  const values = skills
    .filter(value => normalizedRequirement(value).length >= 4)
    .sort((left, right) => right.length - left.length);
  if (!values.length) return null;

  let cleaned = text;
  let changed = false;
  for (const value of values) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Portals sometimes join alternatives with a slash, e.g. "mechanical/chemical
    // engineering". Consume the preceding alternative when removing the
    // structured phrase so it cannot leave a dangling fragment.
    const next = cleaned.replace(new RegExp(`(?<![A-Za-z0-9])(?:[A-Za-z][A-Za-z-]*\\/)?${escaped}s?(?![A-Za-z0-9])`, 'gi'), (match, offset: number, full: string) => {
      if (/^\s+software\b/i.test(full.slice(offset + match.length))) return match;
      if (/^cash\s+register$/i.test(normalizedRequirement(value))
        && /(?:^|\s)computerized\s*$/i.test(full.slice(Math.max(0, offset - 20), offset))) return match;
      return '';
    });
    if (next !== cleaned) changed = true;
    cleaned = next;
  }
  if (!changed) return null;

  cleaned = cleaned
    .replace(/\bprovide\s+(?:a\s+)?technical\s+peer\s+reviews?\s+for\b/gi, 'Review')
    .replace(/\bprovide\s+for\b/gi, 'Review')
    .replace(/\b(such as|including|of|with|using)\s*,/gi, '$1 ')
    .replace(/\b(?:such as)\s*(?=[.!?]|$)/gi, '')
    .replace(/,\s*(?:and|or)\s*(?=[.!?]|$)/gi, '')
    .replace(/\b(?:and|or)\s*(?=[.!?]|$)/gi, '')
    .replace(/(software|coverage|retirement|leave)(and|or)\b/gi, '$1 $2')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/,\s*(?=(?:and|or)\b)/gi, ' ')
    .replace(/\b(?:and|or)\s*(?=[,.;:]|$)/gi, '')
    .replace(/:\s*(?=[,.;]|$)/g, '')
    .replace(/,\s*,+/g, ',')
    .replace(/\b(?:of|with|using|including|in|and|or)\s*[.!?]?$/i, '')
    .replace(/\(\s*[,.;:]*\s*\)/g, '')
    .replace(/\b(of|with)\s+and\b/gi, '$1')
    .replace(/\band\s+(?=\()/gi, '')
    .replace(/\(\s*level\s+/gi, 'level ')
    .replace(/(\blevel\s+\d+(?:\s+on\s+a\s+\d+[-–]\d+\s+scale)?)\s*\)/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
    .trim();
  return cleaned;
}

function removeStructuredEducationMentions(text: string, education: string[]): string | null {
  const values = education
    .filter(value => /\b(?:degree|diploma|certificate)\b/i.test(value))
    .sort((left, right) => right.length - left.length);
  if (!values.length) return null;

  let cleaned = text;
  let changed = false;
  for (const value of values) {
    const coreValue = value.replace(/^\s*(?:completed\s+)?(?:\d+[- ]year\s+)?/i, '');
    const escaped = coreValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/,\s+(and|or)\s+/gi, ',?\\s+$1\\s+')
      .replace(/(\d+)\s+year\b/gi, '$1[- ]year');
    const pattern = new RegExp(`(?<!related\\s)(?:a\\s+|an\\s+|the\\s+)?${escaped}`, 'gi');
    const next = cleaned.replace(pattern, match => {
      const article = /^an\s/i.test(match) ? 'An' : /^the\s/i.test(match) ? 'The' : 'A';
      return /\bdiploma\b/i.test(match) ? `${article} related diploma` : `${article} related degree`;
    });
    if (next !== cleaned) changed = true;
    cleaned = next;
  }
  if (!changed) return null;
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function removeStructuredExperienceDurations(text: string, experience: string[]): string | null {
  const durationWords: Record<string, string> = {
    one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
    seven: '7', eight: '8', nine: '9', ten: '10',
  };
  const structuredDurationKeys = new Set(experience.flatMap(value => {
    const match = value.match(/^(\d+(?:\.\d+)?)(?:\+|[–-]\d+)?\s*(years?|months?)/i);
    return match ? [`${match[1]}:${match[2].toLowerCase().startsWith('month') ? 'month' : 'year'}`] : [];
  }));
  if (!structuredDurationKeys.size) return null;

  const durationMention = /\b(?:(?:a\s+)?(?:minimum(?:\s+of)?|at\s+least|over|more\s+than)\s+)?(?:\d+(?:\.\d+)?(?:\s*\+|\s*[–-]\s*\d+(?:\.\d+)?)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?\s*(?:years?|months?)\b/gi;
  let changed = false;
  const cleaned = text.replace(durationMention, match => {
    const duration = match.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?(?:\s*\+|\s*[–-]\s*\d+(?:\.\d+)?)?\s*(years?|months?)/i);
    if (!duration) return match;
    const number = durationWords[duration[1].toLowerCase()] ?? duration[1];
    const key = `${number}:${duration[2].toLowerCase().startsWith('month') ? 'month' : 'year'}`;
    if (!structuredDurationKeys.has(key)) return match;
    changed = true;
    return ' ';
  })
    .replace(/^\s*[-–—,:]\s*/, '')
    .replace(/^\s*(?:in|of)\s+/i, '')
    .replace(/[.;]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!changed) return null;
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

function isMalformedStructuredFragment(text: string): boolean {
  return /^(?:and|or|with|of|in)\b/i.test(text)
    || (/^(?:must\s+have\s+)?(?:completed|graduate|graduated|major)\b/i.test(text) && /\b(?:with|in|or|and|grade|average)\b/i.test(text))
    || /(?:^|\s)(?:completed|graduate|graduated|major|excellent|familiar|skills?|knowledge|proficiency|experience|ability)\s+(?:of|in|with|at|for|to|or|and)\s*(?:and|or|with|in|at)?\s*$/i.test(text)
    || /^(?:completed|graduate|graduated|major|excellent|familiar|skills?|knowledge|proficiency|experience|ability)\s*$/i.test(text);
}

function isStructuredValueFragment(text: string, values: string[]): boolean {
  const candidate = normalizedRequirement(text);
  if (candidate.length < 4) return false;
  return values.some(value => {
    const normalized = normalizedRequirement(value);
    return normalized === candidate || normalized.startsWith(`${candidate} `);
  });
}

function qualificationBulletTokens(value: string): string[] {
  return normalizedRequirement(value)
    .replace(/\bartificial intelligence\b/g, 'ai')
    .split(' ')
    .filter(token => token.length > 2 && !SKILL_RESTATEMENT_NOISE.has(token));
}

function deduplicateQualificationBullets(description: string): string {
  const lines = description.split('\n');
  const remove = new Set<number>();
  let inQuals = false;
  let sectionBullets: Array<{ index: number; tokens: string[] }> = [];

  const flush = () => {
    for (let left = 0; left < sectionBullets.length; left++) {
      if (remove.has(sectionBullets[left].index)) continue;
      for (let right = left + 1; right < sectionBullets.length; right++) {
        if (remove.has(sectionBullets[right].index)) continue;
        const a = sectionBullets[left];
        const b = sectionBullets[right];
        const shorter = a.tokens.length < b.tokens.length ? a : b;
        const longer = shorter === a ? b : a;
        if (shorter.tokens.length < 2) continue;
        const longerSet = new Set(longer.tokens);
        if (shorter.tokens.every(token => longerSet.has(token))) {
          remove.add(shorter.index);
        }
      }
    }
    sectionBullets = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line) || /^\*{1,2}[^*]+\*{1,2}:?\s*$/.test(line.trim()) || /^[A-Z][A-Za-z0-9 /&'’-]{2,60}:\s*$/.test(line.trim())) {
      flush();
      inQuals = isQualificationsHeading(line.trim());
      continue;
    }
    if (!inQuals) continue;
    const bullet = line.match(/^\s*[-•*]\s+(.+)$/);
    if (bullet) sectionBullets.push({ index, tokens: qualificationBulletTokens(bullet[1]) });
  }
  flush();
  return lines.filter((_, index) => !remove.has(index)).join('\n');
}

function repairStructuredCleanupArtifacts(description: string): string {
  return description
    .replace(/\bsuch\s+as\s+and\b/gi, 'such as')
    .replace(/\bprogramming\s+languages\s+such\s+as\s*\.?/gi, 'programming languages')
    .replace(/\bknowledge\s+of\s+level\s+(\d+)\b/gi, 'Knowledge of language at level $1')
    .replace(/\bknowledge\s+of\s+language\s+at\s+level\s+(\d+)\b/gi, 'Language proficiency at level $1')
    .replace(/(^|\n)(\s*[-•*]\s*)level\s+(\d+)\b/gi, '$1$2Language proficiency at level $3')
    .replace(/^\s*level\s+(\d+)\b/gi, 'Language proficiency at level $1')
    .replace(/\bexcellent\s+in\s+programming\s+languages\b/gi, 'Excellent with programming tools')
    .replace(/\bGIS\s+software\s+(?:Pro|Desktop|Online)\b/gi, 'GIS software')
    .replace(/\bGIS\s+software(?:\s+software)+\b/gi, 'GIS software')
    .replace(/\b(?:a\s+)?completed\s+\d+[- ]year\s+a\s+related\s+diploma\b/gi, 'A related diploma')
    .replace(/\benterprise\s+software\/Linux\b/gi, 'enterprise Linux')
    .replace(/\bexperience\s+with\s+or\s+equivalent\s+rail\s+network\s+simulation\s+software\b/gi, 'Experience with rail network simulation software')
    .replace(/\bproficiency\s+in\s+Microsoft;\s*basic\s+proficiency\s+in\s*\.?/gi, 'Proficiency in office software')
    .replace(/\b(?:expertise|experience|proficiency|knowledge|skills|ability)\s+(in|with|of),\s+/gi, '$1 ')
    .replace(/\b(incorporating|including|using|applying|supporting|leveraging),\s+/gi, '$1 ')
    .replace(/\bexperience\s+with\s+with\s+and\s+aptitude\b/gi, 'Experience with aptitude')
    .replace(/\bexperience\s+with\s+or\s+similar\s+student\s+systems\b/gi, 'Experience with student information systems')
    .replace(/\bUBC['’]s\s+software\b/gi, "UBC's information systems")
    .replace(/\bAll staff must complete a to work with children\b/gi, 'All staff must complete screening to work with children')
    .replace(/\bstrong\s+and\s+consultation\s+skills\b/gi, 'Strong consultation skills')
    .replace(/\bDemonstrated in mental health assessment\b/gi, 'Demonstrated expertise in mental health assessment')
    .replace(/\bHonours Baccalaureate in or equivalent\b/gi, 'Honours Baccalaureate or equivalent')
    .replace(/\binterdisciplinary office software\b/gi, 'interdisciplinary teams')
    .replace(/\bExperience using or similar systems\b/gi, 'Experience using similar systems')
    .replace(/\bWorking of or similar systems\b/gi, 'Working knowledge of similar systems')
    .replace(/\bMember in good standing of the\s*$/gim, 'Member in good standing with the relevant professional body')
    .replace(/\bdesignation and\/or certified\b/gi, 'relevant designations and/or certifications')
    .replace(/\bStrong knowledge of software system and operating procedures\b/gi, 'Strong knowledge of operating procedures')
    .replace(/\bStrong knowledge of software and operating procedures\b/gi, 'Strong knowledge of operating procedures')
    .replace(/\bAbility to operate a computerized cash register\b/gi, 'Ability to operate computerized equipment')
    .replace(/\bProficient in case management software\b/gi, 'Proficient in relevant software')
    .replace(/\bdesignation and\/or Lean Six Sigma certified\b/gi, 'relevant designations and/or certifications')
    .replace(/\bcomputerized software system\/cash register\b/gi, 'computerized cash register')
    .replace(/\bcomputerized software\/cash register\b/gi, 'computerized cash register')
    .replace(/\bcomputerized software\b/gi, 'computerized cash register')
    .replace(/\bwith\s+and\s+data acquisition\s+and\s+is\s+an\s+asset\b/gi, 'with data acquisition tools')
    .replace(/\bmust complete and pass associated\b/gi, 'Must complete and pass the associated training program')
    .replace(/\bcomprehensive from day one, including medical\b/gi, 'Comprehensive coverage from day one')
    .replace(/\bExperience with and advanced skills with a variety of computer applications i\.e\. office software, data management, software and social media\b/gi, 'Experience with a variety of computer applications and advanced skills in office software, data management and social media')
    .replace(/\bother tools such as software Pro\b/gi, 'other tools such as software')
    .replace(/\bsmall and and performing preventative equipment maintenance\b/gi, 'small equipment and performing preventative equipment maintenance')
    .replace(/\bsmall and and performing\b/gi, 'small equipment and performing')
    .replace(/\bsmall(?:\s+and){2,}\s+performing\b/gi, 'small equipment and performing')
    .replace(/\bStrong skills and strong City of Winnipeg layout awareness\b/gi, 'Strong City of Winnipeg layout awareness')
    .replace(/\bskills including the ability to comprehend\b/gi, 'Ability to comprehend')
    .replace(/\bskills with the ability to handle\b/gi, 'Ability to handle')
    .replace(/\bexperience with considered an asset\b/gi, 'experience with relevant software considered an asset')
    .replace(/\bOMERS\)\s+eligibility\b/gi, 'OMERS eligibility')
    .replace(/\bProficiency with applications and software; with data acquisition tools\b/gi, 'Proficiency with applications and data acquisition tools')
    .replace(/\bOR\s+or\s+/gi, 'OR ')
    .replace(/\bOR\s+['’]\s*diversified\b/gi, 'OR diversified')
    .replace(/\bExcellent working knowledge of software Administration\b/gi, 'Excellent working knowledge of system administration')
    .replace(/\boffice software including ([^\n]*?),\s*office software\b/gi, 'office software including $1')
    .replace(/\bsoftwareand\b/gi, 'software and')
    .replace(/\boffice software and\.?$/gim, 'office software.')
    .replace(/\bMicrosoft office software\b/gi, 'office software')
    .replace(/\bcomputer\s+experience\s+with\s+and\s+applications\b/gi, 'Computer experience with software applications')
    .replace(/\b(?:proficiency|proficient)\s+in\s+suite,\s+especially\s+and\s+and\s+other\s+division-specific\s+software\b/gi, 'Proficiency in office software and other division-specific software')
    .replace(/\b(?:proficiency|proficient)\s+in\s+suite,\s+especially\s+and\s+other\s+division-specific\s+software\b/gi, 'Proficiency in office software and other division-specific software')
    .replace(/\b(?:proficiency|proficient)\s+in,\s+including\b/gi, 'Proficiency in relevant software, including')
    .replace(/\bintermediate\s+to\s+advanced\s+programming\s+skills\s+in,\s+including\b/gi, 'Intermediate to advanced programming skills in relevant tools, including')
    .replace(/\bintermediate\s+to\s+advanced\s+skills\s+in,\s+including\b/gi, 'Intermediate to advanced technical skills, including')
    .replace(/\bproficient\s+in,\s+activenet\s+and\b/gi, 'Proficient in recreation-management software')
    .replace(/\bbasic\s+computer\s+skills\s+in,\s+including\s+and\b/gi, 'Basic computer skills, including common office software')
    .replace(/\bexpertise\s+with,\s+github,\s+power\s+apps\s+and\s+power\s+automate\b/gi, 'Expertise with development and automation tools')
    .replace(/\bexperience\s+with,\s+microsoft,\s+word\s+processors,\s+spreadsheets,\s+publishing\s+and\s+database\s+software\b/gi, 'Experience with word processors, spreadsheets, publishing and database software')
    .replace(/\bproficiency\s+with\s+enterprise\s+hr\s+and\s+financial\s+systems\s+and\s+advanced\s+skills\s+in,\b/gi, 'Proficiency with enterprise HR and financial systems and advanced analytical skills')
    .replace(/\bproficiency\s+in,\s+ms,\s+ms\b/gi, 'Proficiency in relevant engineering software')
    .replace(/\bproficiency\s+in,\s+(?=[A-Za-z])/gi, 'Proficiency in relevant software, ')
    .replace(/\bhighly\s+functional\s+in,\s+gis\b/gi, 'Highly functional in GIS')
    .replace(/\badvanced\s+skills\s+in,\s*\./gi, 'advanced skills in relevant software.')
    .replace(/\bexperience\s+with\s+and\s+data\s+security\b/gi, 'Experience with infrastructure and data security')
    .replace(/\bexperience\s+with\s+advanced\s+knowledge\s+of\s+and\s+experience\s+in,\s+research\b/gi, 'Experience with advanced knowledge of and experience in research')
    .replace(/\bfamiliarity\s+with\s+or\s+is\s+an\s+asset\b/gi, 'familiarity with database technologies is an asset')
    .replace(/\b(?:supporting|administering|working\s+with)\s+-based\b/gi, '$1')
    .replace(/\b(or|and)(?=(?:experience|recent|related|relevant)\b)/gi, '$1 ')
    .replace(/\bwith\s+with\b/gi, 'with')
    .replace(/\bproficient\s+in\s+and\s+software\b/gi, 'Proficient in case management software')
    .replace(/\bapply,\s+/gi, 'apply ')
    .replace(/\b(in|with|of|for|on),\s+(?=(?:including|research|finance|Microsoft|MS|word|database|and|or)\b)/gi, '$1 ')
    .replace(/,\s*,+/g, ',')
    .replace(/,\s*(?=(?:or|and)\b)/gi, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n +(?=[-•*])/g, '\n')
    .replace(/(^|\n)(\s*[-•*]\s*)['’]+\s*/g, '$1$2')
    .replace(/(^|\n)(\s*[-•*]\s*)Providing\s*$/gim, '$1')
    .replace(/(^|\n)(\s*[-•*]\s+)(?:of|in|with|and|or)\b[^\n]*/gim, '$1')
    .replace(/(^|\n)(\s*[-•*]\s+.*?)\s+(?:and|or)\s*$/gim, '$1$2')
    .trim();
}

const LANGUAGE_RESTATEMENT_NOISE = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'both', 'by', 'can', 'communicate', 'communication',
  'able', 'ability', 'competence', 'competency', 'documentation', 'effectively', 'either', 'excellent', 'essential', 'fluent',
  'fluency', 'fluently', 'have', 'in', 'imperative', 'is', 'language', 'languages', 'level', 'meet', 'minimum',
  'must', 'native', 'near', 'of', 'official', 'or', 'oral', 'passive', 'proficiency', 'profile', 'publish',
  'publishing', 'read', 'reading', 'required', 'skills', 'solid', 'speak', 'spoken', 'strong',
  'teach', 'teaching', 'the', 'to', 'various', 'written', 'writing', 'for', 'tenure', 'requirements', 'second', 'specialist', 'manager', 'knowledge', 'with',
]);

function structuredLanguageAliases(languages: string[]): string[] {
  const aliases = new Set<string>();
  for (const language of languages) {
    if (/\bbilingual\b/i.test(language)) {
      aliases.add('english');
      aliases.add('anglais');
      aliases.add('french');
      aliases.add('français');
      aliases.add('bilingual');
      aliases.add('bilingue');
    } else if (/american\s+sign\s+language/i.test(language)) {
      aliases.add('american sign language');
      aliases.add('sign language');
      aliases.add('asl');
    } else {
      aliases.add(language.toLowerCase());
    }
  }
  return [...aliases].sort((left, right) => right.length - left.length);
}

function hasStructuredLanguageMention(text: string, languages: string[]): boolean {
  return structuredLanguageAliases(languages).some(alias => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  });
}

function isLanguageRestatementOnly(text: string, languages: string[]): boolean {
  if (!hasStructuredLanguageMention(text, languages)) return false;
  if (LANGUAGE_NON_REQUIREMENT.test(text)
    || /\b(?:other|different)\s+than\s+(?:english|anglais|french|fran[cç]ais)\b/i.test(text)
    || /\b(?:ba|bachelor|degree|diploma|course|program|major|minor|literature)\b[^.\n]{0,60}\b(?:english|anglais|french|fran[cç]ais)\b/i.test(text)) {
    return false;
  }
  if (!LANGUAGE_REQUIREMENT_CUE.test(text) && !/\b(?:english|french|bilingual|bilingue|asl)\s+(?:essential|required|only)\b/i.test(text)) return false;

  let remaining = normalizedRequirement(text);
  for (const alias of structuredLanguageAliases(languages)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    remaining = remaining.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ');
  }
  remaining = remaining
    .replace(/\b[a-c]{1,3}\b(?:\s+[a-c]{1,3})?\b/gi, ' ')
    .split(' ')
    .filter(token => token && !/^[abc]{1,3}$/i.test(token) && !LANGUAGE_RESTATEMENT_NOISE.has(token))
    .join(' ');
  return remaining.length === 0;
}

function stripTrailingLanguageRestatement(text: string, languages: string[]): string | null {
  if (/^language\s+requirements?\s*:/i.test(text)) return null;
  const separator = text.match(/^(.*?)[,;]\s*(.+)$/);
  if (!separator || !isLanguageRestatementOnly(separator[2], languages)) return null;
  const kept = separator[1].replace(/[,:;\s]+$/, '').trim();
  return kept || null;
}

/**
 * Drop Qualifications (and similar) bullets that only restate a licence already
 * captured in license_requirements — QUALITY.md rule 1.
 */
export function stripLicenseBulletsFromDescription(
  description: string,
  licenses: string[],
  vehicleRequired: boolean | null = null,
): string {
  return stripStructuredQualBullets(description, { licenses, vehicleRequired });
}

/**
 * Drop Qualifications bullets that restate structured education / experience /
 * licence / language fields (QUALITY.md rule 1: no fact in two places).
 */
export function stripStructuredQualBullets(
  description: string,
  fields: {
    licenses?: string[];
    education?: string[];
    experience?: string[];
    languages?: string[];
    requiredSkills?: string[];
    software?: string[];
    studentRequired?: boolean;
    certifications?: string[];
    vehicleRequired?: boolean | null;
    securityRequired?: boolean;
    allSections?: boolean;
  },
): string {
  if (!description.trim()) return description;
  const licenses = fields.licenses ?? [];
  const education = fields.education ?? [];
  const experience = fields.experience ?? [];
  const languages = fields.languages ?? [];
  const requiredSkills = fields.requiredSkills ?? [];
  const software = fields.software ?? [];
  const studentRequired = fields.studentRequired === true;
  const certifications = fields.certifications ?? [];
  const securityRequired = fields.securityRequired === true;
  const allSections = fields.allSections === true;
  if (!licenses.length && !education.length && !experience.length && !languages.length && !certifications.length
    && !requiredSkills.length && !software.length && !studentRequired
    && fields.vehicleRequired !== true && !securityRequired) {
    return repairStructuredCleanupArtifacts(deduplicateQualificationBullets(description));
  }

  const eduKeys = education.map(educationCoreKey).filter(Boolean);
  const expKeys = experience.map(experienceCoreKey).filter(Boolean);
  const hasLanguage = languages.some(l => l.trim().length > 0);
  const hasBilingualLanguage = languages.some(l => /\bbilingual\b/i.test(l));
  const namedLanguages = languages.filter(l => !/\bbilingual\b/i.test(l)).join(' ');
  const hasHighSchoolEdu = education.some(e =>
    /\b(?:high\s+school|secondary\s+school|grade\s*12|years of high school)\b/i.test(e)
    || /^high school diploma\b/i.test(e),
  );
  const hasEducationVerification = education.some(e => /\beducation\s+verification\b/i.test(e));
  const hasFirstAidCert = certifications.some(c => /\bfirst\s+aid\b|\bcpr\b/i.test(c));
  const concreteSkillKeys = new Set(requiredSkills.map(concreteQualificationSkillKey));
  const structuredSkills = [...new Set([...requiredSkills, ...software])];
  const softwareLikeSkills = requiredSkills.filter(value =>
    /\b(?:software|system|application|program|database|tool|SAP|ERP|HRIS|GIS|CADD|Excel|Word|Outlook|Power\s*BI|Teams?)\b/i.test(value),
  );
  const softwareToStrip = [...new Set([...software, ...softwareLikeSkills])];

  const lines = description.split('\n');
  let inQuals = false;
  let requirementSection = false;
  const kept: string[] = [];
  let removed = 0;

  for (const line of lines) {
    // Some postings put a sentence-style label inside Qualifications before
    // the bullets. Keep the section active for those nested labels.
    if (inQuals && /^(?:applicants?|candidates?)\b[^.\n]{0,100}:\s*$/i.test(line.trim())) {
      kept.push(line);
      continue;
    }
    if (/^#{1,6}\s+/.test(line) || /^\*{1,2}[^*]+\*{1,2}:?\s*$/.test(line.trim()) || /^[A-Z][A-Za-z0-9 /&'’-]{2,60}:\s*$/.test(line.trim())) {
      const heading = line.trim();
      inQuals = allSections ? Boolean(heading) : isQualificationsHeading(heading);
    requirementSection = (allSections && (isQualificationsHeading(heading)
        || /nice\s+to\s+have|requirement|eligib|condition|education|licen[cs]e|certif|language|experience|skill/i.test(heading)))
      || isQualificationsHeading(heading)
      || /nice\s+to\s+have|requirement|eligib|condition|education|licen[cs]e|certif|language|experience|skill/i.test(heading);
      kept.push(line);
      continue;
    }

    const bullet = line.match(/^\s*[-•*]\s+(.+)$/);
    if (inQuals && bullet) {
      const text = bullet[1].trim();
      const focus = text
        .replace(/\.\s+(?=[A-Z])[^.]*\b(?:asset|preferred|nice\s+to\s+have|desirable)\b[^.]*\.?\s*$/i, '')
        .trim();

      // Language already shown in the Languages property. Remove pure
      // language bullets, or only the trailing language clause from a mixed
      // bullet when another requirement remains.
      if (requirementSection && languages.length && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)) {
        const languageLabelOnly = /^(?:language\s+requirements?|official\s+language\s+proficiency|various)\s*:/i.test(focus);
        const languageClauses = focus.split(/[;,]/).map(clause => clause.trim()).filter(Boolean);
        const compoundLanguageOnly = languageClauses.length > 1
          && languageClauses.every(clause => isLanguageRestatementOnly(clause, languages));
        const languageOnly = languageLabelOnly || compoundLanguageOnly || isLanguageRestatementOnly(focus, languages);
        const withoutTrailingLanguage = stripTrailingLanguageRestatement(focus, languages);
        if (withoutTrailingLanguage) {
          if (hasStructuredLanguageMention(withoutTrailingLanguage, languages)) {
            removed += 1;
            continue;
          }
          const prefix = line.match(/^\s*[-•*]\s+/)?.[0] ?? '- ';
          kept.push(`${prefix}${withoutTrailingLanguage}`);
          removed += 1;
          continue;
        }
        if (languageOnly) {
          removed += 1;
          continue;
        }
      }

      // Language already in Languages property (federal "Language requirements: Bilingual…")
      if (requirementSection && hasLanguage
        && !/\b(?:other|different)\s+than\s+(?:english|anglais|french|fran[cç]ais)\b/i.test(focus)
        && (
        /^(?:language\s+requirements?|languages?)\s*:/i.test(focus)
        || /^(?:various\s+)?language\s+requirements?\b/i.test(focus)
        || (/^bilingual\b/i.test(focus) && languages.some(l => /bilingual/i.test(l)) && focus.length < 140)
        || (hasBilingualLanguage && /\b(?:french|français)\b/i.test(focus) && /\b(?:english|anglais)\b/i.test(focus) && focus.length < 220)
        || (namedLanguages && namedLanguages.split(/\s+/).filter(Boolean).every(language => new RegExp(`\\b${language}\\b`, 'i').test(focus)) && /\b(?:proficien|fluen|speak|read|writ|language)\w*/i.test(focus) && focus.length < 220)
      )) {
        removed += 1;
        continue;
      }

      // Licence restatement
      if (requirementSection && fields.vehicleRequired === true && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && isDriverLicenseRequirement(focus)
        && !detectLicenseRole(focus)
        && !detectLicenseBody(focus)) {
        removed += 1;
        continue;
      }

      if (requirementSection && licenses.length && LICENSE_TERM.test(focus) && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)) {
        const restates = licenses.some(license => licenseKeysOverlap(license, focus));
        const pureDriver = DRIVER_LICENSE_PHRASE.test(focus) && focus.length < 220
          && licenses.some(license => /\bdriver|class\b/i.test(license));
        if (restates || pureDriver) {
          removed += 1;
          continue;
        }
      }

      // Vehicle and security requirements already shown as structured flags.
      if (requirementSection && fields.vehicleRequired === true && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && VEHICLE_SPECIFIC_REQUIREMENT.test(focus) && focus.length < 220
        && !/\b(?:travel|transport|commut|delivery|fieldwork)\b/i.test(focus)) {
        removed += 1;
        continue;
      }
      if (requirementSection && securityRequired && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && /\b(?:security|reliability)\s+(?:status\s+)?(?:clearance|check)\b/i.test(focus)
        && focus.length < 220) {
        removed += 1;
        continue;
      }

      // Any other certification/training restatement. Keep mixed bullets when
      // they contain an additional fact that is not in the structured field.
      if (requirementSection && certifications.length && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && isCertificationRestatementBullet(focus, certifications)) {
        removed += 1;
        continue;
      }

      // First Aid / CPR variants that are equivalent to the structured value,
      // while preserving bullets that add another named credential.
      if (requirementSection && hasFirstAidCert && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && isMostlyFirstAidCertificationBullet(focus)
        && !/\b(?:high\s+five|smart\s+serve|whmis|food\s+handler|nonviolent\s+crisis)\b/i.test(focus)) {
        removed += 1;
        continue;
      }

      // Skills already shown in the structured Skills property.
      if (requirementSection && structuredSkills.length && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && isRequiredSkillRestatementBullet(focus, structuredSkills)) {
        removed += 1;
        continue;
      }

      // Remove named tools from parenthetical examples and direct structured
      // mentions while preserving any surrounding duty or qualification.
      const withoutStructuredExamples = removeStructuredParentheticalMentions(focus, structuredSkills);
      let structuredCandidate = withoutStructuredExamples ?? focus;
      let structuredMentionsChanged = Boolean(withoutStructuredExamples);
      if (requirementSection) {
        const withoutExperienceDuration = removeStructuredExperienceDurations(structuredCandidate, experience);
        if (withoutExperienceDuration !== null) {
          structuredCandidate = withoutExperienceDuration;
          structuredMentionsChanged = true;
        }
        const withoutSoftware = replaceStructuredSoftwareMentions(structuredCandidate, softwareToStrip);
        if (withoutSoftware !== null) {
          structuredCandidate = withoutSoftware;
          structuredMentionsChanged = true;
        }
        const withoutSkills = removeStructuredSkillMentions(structuredCandidate, requiredSkills.filter(value => !softwareLikeSkills.includes(value)));
        if (withoutSkills !== null) {
          structuredCandidate = withoutSkills;
          structuredMentionsChanged = true;
        }
        const withoutOtherStructuredValues = removeStructuredSkillMentions(
          structuredCandidate,
          [...licenses, ...education, ...certifications],
        );
        if (withoutOtherStructuredValues !== null) {
          structuredCandidate = withoutOtherStructuredValues;
          structuredMentionsChanged = true;
        }
        const withoutEducation = removeStructuredEducationMentions(structuredCandidate, education);
        if (withoutEducation !== null) {
          structuredCandidate = withoutEducation;
          structuredMentionsChanged = true;
        }
        const languageValues = languages.flatMap(value => /\bbilingual\b/i.test(value)
          ? ['English', 'French', 'Bilingual']
          : [value]);
        if (hasLanguage
          && /\b(?:language|bilingual|proficien|fluen|knowledge|speak|read|writ|level)\w*/i.test(focus)
          && !/\b(?:other|different)\s+than\s+(?:english|anglais|french|fran[cç]ais)\b/i.test(focus)
          && !/\b(?:studies|course|literature)\b/i.test(focus)) {
          const withoutLanguages = removeStructuredSkillMentions(structuredCandidate, languageValues);
          if (withoutLanguages !== null) {
            structuredCandidate = withoutLanguages;
            structuredMentionsChanged = true;
          }
        }
      }
      if (structuredMentionsChanged) {
        if (!structuredCandidate
          || isMalformedStructuredFragment(structuredCandidate)
          || isStructuredValueFragment(structuredCandidate, structuredSkills)
          || (requirementSection && isRequiredSkillRestatementBullet(structuredCandidate, structuredSkills))) {
          removed += 1;
          continue;
        }
        const prefix = line.match(/^\s*[-•*]\s+/)?.[0] ?? '- ';
        kept.push(`${prefix}${structuredCandidate}`);
        removed += 1;
        continue;
      }

      // Remove duration text from Experience bullets while retaining the
      // domain/context that does not belong in the structured field.
      if (requirementSection && experience.length) {
        const durationPattern = /\b(?:\d+(?:\.\d+)?(?:\s*\+|\s*[–-]\s*\d+(?:\.\d+)?)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?\s*(?:years?|months?)\b/i;
        const hasStructuredDuration = experience.some(value => {
          const match = value.match(/^(\d+(?:\.\d+)?)(?:\+|–\d+)?\s*(years?|months?)/i);
          if (!match || !durationPattern.test(focus)) return false;
          const number = match[1];
          const word = ({ '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten' } as Record<string, string>)[number];
          const numberPattern = word ? `(?:${number}|${word})(?:\\s*\\(\\s*${number}\\s*\\))?` : number;
          return new RegExp(`\\b${numberPattern}\\s*(?:\\+|[-–]\\s*\\d+)?\\s*(?:years?|months?)\\b`, 'i').test(focus);
        });
        if (hasStructuredDuration && /\b(?:experience|years?|months?)\b/i.test(focus)) {
          const durationWords: Record<string, string> = {
            one: '1', two: '2', three: '3', four: '4', five: '5', six: '6',
            seven: '7', eight: '8', nine: '9', ten: '10',
          };
          const structuredDurationKeys = new Set(experience.flatMap(value => {
            const match = value.match(/^(\d+(?:\.\d+)?)(?:\+|[–-]\d+)?\s*(years?|months?)/i);
            return match ? [`${match[1]}:${match[2].toLowerCase().startsWith('month') ? 'month' : 'year'}`] : [];
          }));
          const durationMention = /\b(?:(?:a\s+)?(?:minimum(?:\s+of)?|at\s+least|over|more\s+than)\s+)?(?:\d+(?:\.\d+)?(?:\s*\+|\s*[–-]\s*\d+(?:\.\d+)?)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?\s*(?:years?|months?)\b/gi;
          const withoutDuration = focus
            .replace(durationMention, match => {
              const duration = match.match(/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*\(\s*\d+\s*\))?(?:\s*\+|\s*[–-]\s*\d+(?:\.\d+)?)?\s*(years?|months?)/i);
              if (!duration) return match;
              const number = durationWords[duration[1].toLowerCase()] ?? duration[1];
              const key = `${number}:${duration[2].toLowerCase().startsWith('month') ? 'month' : 'year'}`;
              return structuredDurationKeys.has(key) ? ' ' : match;
            })
            .replace(/^\s*[-–—,:]\s*/, '')
            .replace(/^\s*(?:in|of)\s+/i, '')
            .replace(/[.;]+$/, '')
            .trim();
          const normalizedRemainder = withoutDuration
            ? withoutDuration.charAt(0).toUpperCase() + withoutDuration.slice(1)
            : withoutDuration;
          if (!normalizedRemainder || /^(?:experience|related|relevant|progressive)\s*$/i.test(normalizedRemainder)) {
            removed += 1;
            continue;
          }
          if (structuredSkills.length && isRequiredSkillRestatementBullet(normalizedRemainder, structuredSkills)) {
            removed += 1;
            continue;
          }
          const prefix = line.match(/^\s*[-•*]\s+/)?.[0] ?? '- ';
          kept.push(`${prefix}${normalizedRemainder}`);
          removed += 1;
          continue;
        }
      }

      // Education restatement (high school / degree / diploma already structured)
      const eduFocus = focus.replace(/^education\s*:\s*/i, '');
      if (requirementSection && eduKeys.length && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus)
        && /\b(?:high\s+school|secondary\s+school|grade\s*12|bachelor|master|ph\.?d|phd|m\.?sc|m\.?a\.?|b\.?sc|b\.?a\.?|diploma|degree|post[- ]secondary|college|university|ossd|g\.?e\.?d\.?|certificate\s+in)\b/i.test(eduFocus)) {
        const bulletKey = educationCoreKey(eduFocus);
        const restatesEdu = eduKeys.some(key => keysOverlapLoose(key, bulletKey))
          // Grade 12 / GED bullets restate "High school diploma" even when token keys differ
          || (hasHighSchoolEdu && isMostlyGrade12EducationBullet(eduFocus));
        const mostlyEdu = eduFocus.length < 280
          || /^(?:must\s+(?:have|hold|possess|complete)|completion|completed|successful|minimum|a|an|education|proof of|grade\s*12)\b/i.test(focus)
          || /^education\s*:/i.test(focus)
          || isMostlyGrade12EducationBullet(eduFocus);
      if (restatesEdu && mostlyEdu) {
        removed += 1;
        continue;
      }
      if (hasEducationVerification && EDUCATION_VERIFICATION.test(focus)) {
        removed += 1;
        continue;
      }
      }

      // Measurable typing/keyboarding requirements already shown in Skills.
      if (requirementSection && concreteSkillKeys.size > 0
        && extractConcreteQualificationSkills(focus).some(skill => concreteSkillKeys.has(concreteQualificationSkillKey(skill)))) {
        removed += 1;
        continue;
      }

      // Student status already shown in the Student field.
      if (requirementSection && studentRequired && /^(?:currently\s+)?(?:attending|enrolled|registered)\s+(?:a\s+)?(?:full[- ]time|part[- ]time)\s+(?:program|course|school|college|university)\b/i.test(focus)) {
        removed += 1;
        continue;
      }

      // Experience restatement (years lines OR "Experience: analyzing…" already structured)
      if (requirementSection && expKeys.length && !STRUCTURED_OPTIONAL_REQUIREMENT.test(focus) && /\bexperience\b/i.test(focus)) {
        const bulletKey = experienceCoreKey(focus);
        const restatesExp = expKeys.some(key => keysOverlapLoose(key, bulletKey));
        const bothHaveTime = focus.length < 180
          && /\b\d+\s*(?:\+)?\s*(?:years?|months?)\b/i.test(focus)
          && experience.some(e => /\b\d+\s*(?:\+)?\s*(?:years?|months?)\b/i.test(e));
        const experienceColonBullet = /^experience\s*:/i.test(focus) || /^experience\s+(?:analyzing|drafting|in\b|with\b|using\b)/i.test(focus);
        const definitionLine = /\bis defined as\b/i.test(focus);
        if ((restatesExp || bothHaveTime || (experienceColonBullet && restatesExp) || definitionLine)
          && (EXPERIENCE_YEARS_PATTERN.test(focus) || EXPERIENCE_TIME_SIGNAL.test(focus) || experienceColonBullet || definitionLine)
          && !/\b(?:and\s+)?(?:excellent|strong|proven)\s+(?:communication|organizational|leadership)\b/i.test(focus.slice(0, 40))) {
          removed += 1;
          continue;
        }
      }

      // Abilities/competencies: drop clauses that only restate Experience domains
      // (e.g. "analyze complex information…" when Experience already has that).
      if (requirementSection && expKeys.length && /^(?:abilities?|competencies?)\s*:/i.test(focus)) {
        const labelMatch = focus.match(/^(abilities?|competencies?)\s*:?\s*/i);
        const label = labelMatch?.[0] ?? '';
        const body = focus.slice(label.length);
        const clauses = body.split(/;\s*/).map(c => c.trim()).filter(Boolean);
        if (clauses.length > 0) {
          const keptClauses = clauses.filter(c => !expKeys.some(key => keysOverlapLoose(key, experienceCoreKey(c))));
          if (keptClauses.length === 0) {
            removed += 1;
            continue;
          }
          if (keptClauses.length < clauses.length) {
            const prefix = line.match(/^\s*[-•*]\s+/)?.[0] ?? '- ';
            kept.push(`${prefix}${label}${keptClauses.join('; ')}`);
            removed += 1;
            continue;
          }
        }
      }
    }
    kept.push(line);
  }

  if (removed === 0) return repairStructuredCleanupArtifacts(deduplicateQualificationBullets(description));
  // Drop a Qualifications heading that has no remaining bullets before the next heading.
  let cleaned = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  cleaned = repairStructuredCleanupArtifacts(deduplicateQualificationBullets(cleaned));
  cleaned = cleaned.replace(
    /(?:^|\n)(#{1,6}\s+[^\n]+\n)(?:\s*\n)*(?=(?:#{1,6}\s+|\s*$))/gi,
    '\n',
  ).replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

export function licensesImplyVehicle(licenses: string[]): boolean {
  return licenses.some(license => looksLikeDriverLicense(license));
}

export function prepareExperienceSourceText(rawText: string): string {
  return rawText
    // Raw portals often concatenate blocks without line breaks. Recreate
    // boundaries before duration-led qualification clauses and sentences.
    .replace(/(?=(?:(?:a\s+)?minimum|at\s+least|over|more\s+than)\s+(?:\w+|\d+)|(?<!\d)(?:\d+(?:\.\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten)\s*[-–—]?\s*(?:years?|months?))/gi, '\n')
    .replace(/(?<=[.)])(?=[A-Z])/g, '\n');
}

export function extractExperienceRequirementsFromSources(description: string, rawText = ''): string[] {
  return extractExperienceRequirements(description + '\n' + prepareExperienceSourceText(rawText));
}

export function extractExperienceRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits' || STRUCTURED_OPTIONAL_REQUIREMENT.test(line.text) || EXPERIENCE_HISTORY_SIGNAL.test(line.text)) continue;
    // Federal "Experience: drafting…" / "Experience analyzing…" bullets (no years on the line).
    if (/^experience(?:\s*:|\s+in\s+|\s+)/i.test(line.text) && !/\bis defined as\b/i.test(line.text)) {
      const value = compactText(line.text).replace(/^[,;:–—-]\s*/, '').trim();
      if (value) values.add(value);
      continue;
    }
    // "Experience is defined as… two (2) years…" meta line → capture for normalization.
    if (/\bexperience is defined as\b/i.test(line.text) || /\bexperience\b.{0,40}\bis defined as\b/i.test(line.text)) {
      const value = compactText(line.text).replace(/^[,;:–—-]\s*/, '').trim();
      if (value) values.add(value);
      continue;
    }
    if (!EXPERIENCE_YEARS_PATTERN.test(line.text)) continue;
    const startsAsExperience = /^(?:(?:a\s+)?minimum|at\s+least|over|more\s+than|\d|one\b|two\b|three\b|four\b|five\b|six\b|seven\b|eight\b|nine\b|ten\b|several\b|recent\b)/i.test(line.text);
    const match = startsAsExperience ? null : line.text.match(EXPERIENCE_CLAUSE_PATTERN);
    const value = compactText(match?.[0] || line.text).replace(/^[,;:–—-]\s*/, '').trim();
    if (value) values.add(value);
  }
  return normalizeExperienceRequirements([...values]);
}

/** Extract concrete measurable skills that belong in the Skills property. */
export function extractConcreteQualificationSkills(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits') continue;
    const match = line.text.match(/\b(?:typing|keyboarding|type(?:s|ing)?)\s*(?:speed\s*)?(?:of\s*)?(\d+(?:\s*[-–—]\s*\d+)?)\s*(?:w\.?\s*p\.?\s*m\.?|words?\s+per\s+minute)\b/i);
    if (!match) continue;
    const range = match[1].replace(/\s*[-–—]\s*/g, '–');
    values.add(`Typing ${range} w.p.m.`);
  }
  return [...values];
}

function concreteQualificationSkillKey(value: string): string {
  return value.toLowerCase()
    .replace(/\bw\.?\s*p\.?\s*m\.?\b/g, 'wpm')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function mergeConcreteQualificationSkills(current: string[], description: string): string[] {
  const extracted = extractConcreteQualificationSkills(description);
  const extractedKeys = new Set(extracted.map(concreteQualificationSkillKey));
  const preserved = current.filter(value => !extractedKeys.has(concreteQualificationSkillKey(value)));
  return [...new Set([...preserved, ...extracted])];
}

export function extractNamedBenefits(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section !== 'benefits') continue;
    for (const [name, pattern] of NAMED_BENEFITS) {
      if (pattern.test(line.text)) values.add(name);
    }
  }
  return [...values];
}

export interface StructuredRequirementValues {
  experience_requirements: string[];
  education_requirements: string[];
  license_requirements: string[];
  benefits: string[];
  required_skills: string[];
}

export function reconcileStructuredRequirements(description: string, current: Partial<StructuredRequirementValues>, rawText = ''): StructuredRequirementValues {
  const experienceRequirements = extractExperienceRequirementsFromSources(description, rawText);
  const educationRequirements = extractEducationRequirements(description);
  const licenseRequirements = extractProfessionalLicenseRequirements(description);
  const namedBenefits = extractNamedBenefits(description);
  const currentEducation = toStringList(current.education_requirements).filter(retainExistingEducation);
  const currentExperienceValues = toStringList(current.experience_requirements);
  const currentExperience = normalizeExperienceRequirements(currentExperienceValues);
  const currentLicenses = normalizeProfessionalLicenseRequirements(
    toStringList(current.license_requirements).filter(retainExistingLicense),
  );
  const currentBenefits = normalizeBenefits(toStringList(current.benefits));
  const experienceSkills = extractExperienceSkills(currentExperienceValues);
  const currentSkills = mergeConcreteQualificationSkills(
    [...toStringList(current.required_skills), ...experienceSkills],
    description,
  );
  const requiredLines = descriptionLines(description).filter(line => !line.heading && line.section === 'required').map(line => normalizedRequirement(line.text));
  const skills = [...new Set(currentSkills)].filter(skill => {
    if (isLanguageProficiencySkill(skill)) return false;
    if (isDriverLicenseRequirement(skill)) return false;
    if (licenseRequirements.length > 0 && LICENSE_TERM.test(skill)) return false;
    const skillKey = normalizedRequirement(skill);
    const benefitOnly = namedBenefits.some(benefit => normalizedRequirement(benefit) === skillKey)
      && !requiredLines.some(line => line.includes(skillKey));
    return !benefitOnly;
  });
  const benefits = [...new Set(currentBenefits)];
  for (const benefit of namedBenefits) {
    const benefitKey = normalizedRequirement(benefit);
    const matching = benefits
      .map((currentBenefit, index) => ({ currentBenefit, index }))
      .filter(({ currentBenefit }) => normalizedRequirement(currentBenefit).includes(benefitKey));
    if (matching.length === 0) {
      benefits.push(benefit);
    } else {
      const keep = matching.reduce((best, candidate) => candidate.currentBenefit.length > best.currentBenefit.length ? candidate : best);
      for (const candidate of matching.reverse()) {
        if (candidate.index !== keep.index) benefits.splice(candidate.index, 1);
      }
    }
  }
  const normalizedCurrentEducation = normalizeEducationRequirements(currentEducation);
  const education = educationRequirements.length
    ? educationRequirements.some(value => !/^Education verification$/i.test(value))
      ? educationRequirements
      : [...new Set([...normalizedCurrentEducation, ...educationRequirements])]
    : normalizedCurrentEducation;
  return {
    experience_requirements: experienceRequirements.length
      ? experienceRequirements
      : currentExperience,
    education_requirements: education,
    license_requirements: licenseRequirements.length ? licenseRequirements : currentLicenses,
    benefits,
    required_skills: skills,
  };
}

// Same canonical names SOFTWARE_PATTERNS already assigns during extraction —
// reused here so "Microsoft Word" (skills) and "Word" (software) collapse to
// the same key instead of surviving as separate-looking duplicates.
function canonicalSoftwareKey(value: string): string {
  for (const [canonical, pattern] of SOFTWARE_PATTERNS) {
    if (pattern.test(value)) return normalizedRequirement(canonical);
  }
  return normalizedRequirement(value);
}

// required_skills and software_requirements are extracted independently (the
// latter isn't part of reconcileStructuredRequirements's inputs), so a named
// product like "Microsoft Office" can end up tagged in both. Software is the
// more specific field — drop the overlap from the skills list.
export function dedupeSkillsAgainstSoftware(skills: string[], software: string[]): string[] {
  const softwareKeys = new Set(software.map(canonicalSoftwareKey));
  return skills.filter(skill => !softwareKeys.has(canonicalSoftwareKey(skill)));
}

/**
 * Skills that are really language requirements (or bilingualism), not tools/
 * competencies. Keep academic subjects (Ph.D. in English), teaching methods
 * (French L2 / FLS), NLP/LLMs, translation craft, and speech-language pathology.
 */
const LANGUAGE_SKILL_KEEP = /\b(?:ph\.?d|doctorate|master(?:['’]s)?|degree|diploma|certificate|literature|revolution|teaching|enseignant|l2\b|fls\b|langue\s+seconde|natural\s+language|language\s+models?|speech[- ]language|patholog|translation|traduction|translating|traduire|ancient\s+language|latin|greek|hebrew)\b/i;

export function isLanguageProficiencySkill(skill: string): boolean {
  const text = compactText(skill);
  if (!text || LANGUAGE_SKILL_KEEP.test(text)) return false;

  if (/^bilingual(?:ism)?(?:\b.*)?$/i.test(text)) return true;
  if (/\bbilingual(?:ism)?\b/i.test(text) && /\b(?:english|french|fran[cç]ais|anglais)\b/i.test(text)) return true;
  if (/\blanguage\s+proficiency\b/i.test(text)) return true;
  // "Advanced Level II proficiency in French (oral and comprehension)"
  if (/\bproficiency\s+in\s+(?:english|french|fran[cç]ais|anglais)\b/i.test(text)) return true;
  if (/^(?:english|french|fran[cç]ais|anglais)(?:\s+language)?(?:\s+proficiency)?$/i.test(text)) return true;
  if (/^(?:english|french|fran[cç]ais|anglais)\s+(?:oral\s+)?(?:communication|proficiency)$/i.test(text)) return true;
  if (/^(?:english|french)\s+essential$/i.test(text)) return true;
  if (/^english\s*\(\s*language\s*\)$/i.test(text)) return true;
  if (/^fran[cç]ais\s*\|\s*french$/i.test(text)) return true;
  if (/\bsecond\s+language\b/i.test(text)
    && /\b(?:reading|writing|oral|comprehension|intermediate|passive|active|competence|competency)\b/i.test(text)) {
    return true;
  }
  // Bare language name only (common AI dump).
  if (/^(?:english|french|fran[cç]ais|anglais)$/i.test(text)) return true;
  return false;
}

/** Map a stripped skill token into plain language field values. */
export function languagesImpliedBySkill(skill: string): string[] {
  const text = compactText(skill);
  if (/\bbilingual(?:ism)?\b/i.test(text)) return ['Bilingual'];
  const out: string[] = [];
  if (/\b(?:english|anglais)\b/i.test(text)) out.push('English');
  if (/\b(?:french|fran[cç]ais)\b/i.test(text)) out.push('French');
  // "English or French communication" → both named languages, not bilingual.
  return out;
}

/**
 * Pull language-proficiency items out of skills and return the languages they
 * imply so the caller can merge them into language_requirements.
 */
export function splitLanguageOutOfSkills(skills: string[]): { skills: string[]; languages: string[] } {
  const kept: string[] = [];
  const languages: string[] = [];
  for (const skill of skills) {
    if (isLanguageProficiencySkill(skill)) {
      languages.push(...languagesImpliedBySkill(skill));
    } else {
      kept.push(skill);
    }
  }
  return { skills: kept, languages: normalizeLanguageRequirements(languages) };
}

function isOptionalLanguageLine(line: DescriptionLine): boolean {
  return line.section === 'optional' || LANGUAGE_OPTIONAL_REQUIREMENT.test(line.text);
}

function canonicalLanguageName(value: string): string {
  if (/\b(?:french|français)\b/i.test(value)) return 'French';
  if (/\banglais\b/i.test(value)) return 'English';
  const match = LANGUAGE_NAMES.find(([, pattern]) => pattern.test(value));
  return match?.[0] || value;
}

function namedLanguages(line: string): string[] {
  const values: string[] = [];
  for (const [name, pattern] of LANGUAGE_NAMES) {
    if (pattern.test(line) && !values.includes(name)) values.push(name);
  }
  return values;
}

function isBilingualPhrase(text: string, languages: string[] = []): boolean {
  return /\b(?:bilingual(?:ism)?|bilingue)\b/i.test(text)
    || (languages.length >= 2 && /\b(?:both|official\s+languages?|english\s+and\s+french|french\s+and\s+english)\b/i.test(text))
    || (/\bimperative\b/i.test(text) && LANGUAGE_LEVEL.test(text));
}

/** Extract plain language names + bare "Bilingual". No PSC levels, no "Essential". */
function canonicalLanguageLine(line: string): string[] {
  const text = compactText(line);
  if (!text || LANGUAGE_NON_REQUIREMENT.test(text)) return [];
  const languages = namedLanguages(text);
  if (isBilingualPhrase(text, languages)) return ['Bilingual'];
  // Pure CBC/BBB tokens with no language name are not useful on their own.
  if (!languages.length) return [];
  return languages.map(canonicalLanguageName);
}

function isLanguageRequirementLine(line: DescriptionLine): boolean {
  if (line.heading || isOptionalLanguageLine(line) || LANGUAGE_NON_REQUIREMENT.test(line.text)) return false;
  if (!LANGUAGE_NAME_PATTERN.test(line.text) && !LANGUAGE_LEVEL.test(line.text)) return false;
  if (line.section === 'required') return true;
  if (/^\s*(?:language|language\s+requirements?|languages?|bilingual(?:ism)?)\s*[:\-]/i.test(line.text)) return true;
  return LANGUAGE_REQUIREMENT_CUE.test(line.text);
}

export function extractExplicitLanguageRequirements(text: string): string[] {
  const values = new Set<string>();
  const hasLanguageLabel = /\blanguage\s+requirements?\b|\blanguage\s+requirement\s*:/i.test(text);
  if (hasLanguageLabel) {
    const hasBilingualPair = /\bbilingual\b[^.!?\n]{0,100}\b(?:english\s+and\s+french|french\s+and\s+english)\b/i.test(text);
    if (/\benglish\s+essential\b|\benglish\s+only\b/i.test(text)
      || (!hasBilingualPair && /\benglish\b/i.test(text))) {
      values.add('English');
    }
    if (/\bfrench\s+essential\b|\bfran[cç]ais\s+essential\b|\bfrench\s+only\b|\bfran[cç]ais\s+only\b/i.test(text)
      || (!hasBilingualPair && /\bfrench\b|\bfran[cç]ais\b/i.test(text))) {
      values.add('French');
    }
    if (/\bbilingual(?:ism)?\b|\bbilingue\b/i.test(text)
      || /\bbilingual\s+(?:imperative|proficien(?:cy|t)|required)/i.test(text)) {
      values.add('Bilingual');
    }
  }
  const instruction = text.match(/\blanguage\s+of\s+instruction\s*:\s*([^.!?\n]{0,100})/i)?.[1] || '';
  for (const language of namedLanguages(instruction)) values.add(language);
  return [...values];
}

export function extractLanguageRequirements(description: string, title = ''): string[] {
  const values = new Set<string>();
  const hasVariousLanguageLabel = /\bvarious\s+language\s+requirements?\b/i.test(description);
  if (/\bbilingual\b/i.test(title)) values.add('Bilingual');
  for (const value of extractExplicitLanguageRequirements(description)) values.add(value);
  for (const line of descriptionLines(description)) {
    if (!isLanguageRequirementLine(line)) continue;
    if (hasVariousLanguageLabel && /\bvarious\s+language\s+requirements?\b/i.test(line.text)) continue;
    for (const value of canonicalLanguageLine(line.text)) values.add(value);
  }
  return normalizeLanguageRequirements([...values]);
}

function isVehicleRequirementLine(line: DescriptionLine): boolean {
  if (line.heading || !VEHICLE_TERM.test(line.text)) return false;
  if (/\bdriver.?s?\s+abstract\b/i.test(line.text) && !/\b(?:licen[cs]e|permit|class\s+[a-z0-9]+)\b/i.test(line.text)) return false;
  if (VEHICLE_CONDITIONAL.test(line.text)) return false;
  if (VEHICLE_NOT_REQUIRED.test(line.text)) return false;
  if (VEHICLE_OPTIONAL_REQUIREMENT.test(line.text)) return false;
  if (line.section === 'optional') return false;
  if (line.section === 'required') return VEHICLE_SPECIFIC_REQUIREMENT.test(line.text);
  return VEHICLE_SPECIFIC_REQUIREMENT.test(line.text) && VEHICLE_REQUIRED_CUE.test(line.text);
}

export function extractVehicleRequired(description: string): boolean | null {
  const lines = descriptionLines(description).filter(line => !line.heading && VEHICLE_TERM.test(line.text));
  const required = lines.filter(isVehicleRequirementLine);
  if (required.length > 0) return true;
  if (lines.some(line => VEHICLE_NOT_REQUIRED.test(line.text))) return false;
  return null;
}

export function extractLanguageVehicleRequirements(description: string, title = ''): { language_requirements: string[]; vehicle_required: boolean | null } {
  return {
    language_requirements: extractLanguageRequirements(description, title),
    vehicle_required: extractVehicleRequired(description),
  };
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(/[,;]/).map(item => item.trim()).filter(Boolean);
  return [];
}

/**
 * Canonical language tokens for display/filter:
 *   English | French | Bilingual | Mandarin | …named languages
 *
 * Drop PSC profiles (CBC/CBC), "Essential" suffixes, and parenthetical
 * bilingual detail — a job either needs English, French, both (Bilingual),
 * or some other named language.
 */
function expandLanguageItem(item: string): string[] {
  const compact = compactText(item).replace(/^[-*]\s*/, '');
  if (!compact || LANGUAGE_OPTIONAL_REQUIREMENT.test(compact)) return [];

  // Legacy stored bilingual tokens (any parenthetical form) → plain Bilingual.
  if (/^Bilingual(?:\b|\s*\()/i.test(compact) && compact.length < 80) {
    return ['Bilingual'];
  }

  // "English Essential" / "French needed" / "English required" → plain name only.
  if (/^(?:English|Anglais)(?:\s+(?:Essential|Only|Needed|Required|Proficiency|Fluency|Fluent))?$/i.test(compact)) {
    return ['English'];
  }
  if (/^(?:French|Fran[cç]ais)(?:\s+(?:Essential|Only|Needed|Required|Proficiency|Fluency|Fluent))?$/i.test(compact)) {
    return ['French'];
  }

  // Pure PSC profile leftovers (BBB/BBB) — not a language.
  if (/^[A-C]{2,3}\s*\/\s*[A-C]{2,3}$/i.test(compact)) return [];
  // Bare "Bilingual (BBB/BBB)"-style with only levels after bilingual already handled above.
  if (/^[A-C]{2,3}\s*\/\s*[A-C]{2,3}\s*(?:,\s*[A-C]{2,3}\s*\/\s*[A-C]{2,3})*$/i.test(compact)) return [];

  // Language of instruction on teaching posts.
  if (/\blanguage\s+of\s+instruction\b/i.test(compact) && !/\bbilingual/i.test(compact)) {
    return namedLanguages(compact).map(canonicalLanguageName);
  }

  if (LANGUAGE_NON_REQUIREMENT.test(compact)) return [];

  // "Active competence in second language" with no named language — drop.
  if (/\b(?:competence|competency|comp[eé]tence)\b/i.test(compact)
    && !LANGUAGE_NAME_PATTERN.test(compact)
    && !/\bbilingual/i.test(compact)) {
    return [];
  }

  return canonicalLanguageLine(compact);
}

function languageSortKey(value: string): [number, string] {
  if (value === 'English') return [0, value];
  if (value === 'French') return [1, value];
  if (value === 'Bilingual') return [3, value];
  return [2, value];
}

function dedupeLanguageTokens(values: string[]): string[] {
  const unique = [...new Set(values.map(v => v.trim()).filter(Boolean))];
  // Sort: English, French, other named languages, Bilingual last.
  return unique.sort((a, b) => {
    const [ai, as] = languageSortKey(a);
    const [bi, bs] = languageSortKey(b);
    return ai - bi || as.localeCompare(bs);
  });
}

export function normalizeLanguageRequirements(value: unknown): string[] {
  const expanded: string[] = [];
  for (const item of toStringList(value)) {
    for (const token of expandLanguageItem(item)) {
      expanded.push(token);
    }
  }
  // extractLanguageRequirements already returns simple tokens; still run expand
  // so re-normalize of stored legacy forms is consistent.
  return dedupeLanguageTokens(expanded);
}

/** Coerce stored/AI vehicle flag to tri-state boolean. */
export function normalizeVehicleRequired(value: unknown): boolean | null {
  if (value == null || value === '' || value === 'null' || value === 'unknown' || value === 'undefined') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'number' && !Number.isNaN(value)) {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  const s = String(value).toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  if (!s) return null;
  if (/^(true|yes|y|required)$/.test(s)) return true;
  if (/^(false|no|n|not required|none|n\/a)$/.test(s)) return false;
  return null;
}

/** Coerce stored/AI security flag to tri-state boolean (same rules as vehicle). */
export function normalizeSecurityCheckRequired(value: unknown): boolean | null {
  return normalizeVehicleRequired(value);
}

/** DB integer 1 | 0 | null for flag columns. */
export function requirementFlagToDb(value: boolean | null): number | null {
  if (value === true) return 1;
  if (value === false) return 0;
  return null;
}

export const LANGUAGE_VEHICLE_CANDIDATE = /\b(?:english|french|fran[cç]ais|anglais|bilingual(?:ism)?|bilingue|cantonese|mandarin|punjabi|arabic|ukrainian|spanish|german|italian|portuguese|korean|japanese|hindi|urdu|tamil|somali|farsi|persian|russian|polish|tagalog|american sign language|sign language|asl|language\s+requirements?|language\s+proficiency|fluency|fluent|driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|reliable\s+(?:transportation|vehicle)|access\s+to\s+(?:a\s+)?vehicle|own\s+vehicle|personal\s+vehicle|vehicle\s+(?:is\s+)?required|ability\s+to\s+drive|must\s+drive)\b/i;

export function hasLanguageVehicleCandidate(description: string): boolean {
  return LANGUAGE_VEHICLE_CANDIDATE.test(description);
}

const WORK_YEAR_MONTHS_A = /(\d{1,2})[\s-]*months?\s+work\s+year/i;
const WORK_YEAR_MONTHS_B = /work\s+year:?\s*(\d{1,2})\s*months?/i;

// Narrow on purpose: only matches an explicit "N-month work year" phrase, not
// school-calendar day-count schedules ("Work Year: 194 + 3 days") or other
// duration phrasing — those need a human to interpret, not a regex.
export function extractWorkYearDuration(description: string): string | null {
  const match = description.match(WORK_YEAR_MONTHS_A) ?? description.match(WORK_YEAR_MONTHS_B);
  return match ? `${match[1]}-month work year` : null;
}

const SECURITY_REQUIREMENT_LABEL = /\*{0,2}Security Requirement:\*{0,2}\s*([^\n]+)/i;
const SECURITY_REQUIREMENT_NONE = /^(?:none|not required|n\/a)\b/i;

// CMHC / Government of Canada postings state this as a labeled field
// ("Security Requirement: Reliability Status" / "Secret") rather than a
// sentence — the existing AI-driven security_check_required extraction
// doesn't recognize the label format, so it was landing null.
export function extractSecurityRequirementLabel(description: string): boolean | null {
  const match = description.match(SECURITY_REQUIREMENT_LABEL);
  if (!match) return null;
  const value = match[1].trim();
  return SECURITY_REQUIREMENT_NONE.test(value) ? false : true;
}
