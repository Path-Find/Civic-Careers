export interface SoftwareBackfillResult {
  values: string[];
  skippedOptionalLines: number;
}

const SOFTWARE_PATTERNS: Array<[string, RegExp]> = [
  ['Microsoft Office', /(?:Microsoft Office(?: Suite)?|Microsoft Suite|MS Office(?: Suite)?|Office 365)/i],
  ['Microsoft 365', /(?:Microsoft 365|M365)/i],
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
const LANGUAGE_REQUIREMENT_CUE = /\b(?:required|required?\s+language|essential|must|need(?:ed)?|competenc(?:e|y)|proficien(?:cy|t)|fluen(?:cy|t)|native|spoken|oral|written|communicat(?:e|ion)|official\s+languages?|bilingual(?:ism)?|bilingue|language\s+skills?)\b/i;
const LANGUAGE_HEADING = /\b(?:language|bilingual|english|french)\b/i;
const LANGUAGE_LEVEL = /\b(?:[A-C]{2,3}\s*\/\s*[A-C]{2,3}|[A-C]{2,3}\s+level|level\s+[1-5]|essential)\b/i;

const VEHICLE_TERM = /\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|vehicle|reliable\s+transportation|own\s+transportation|personal\s+vehicle|transportation)\b/i;
const VEHICLE_NOT_REQUIRED = /\bno\s+(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b[^.\n]{0,40}\b(?:required|needed|necessary)\b|\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b[^.\n]{0,100}\b(?:not\s+(?:required|needed|necessary)|unnecessary|no\s+requirement)\b|\b(?:not\s+(?:required|needed|necessary)|unnecessary|no\s+requirement)\b[^.\n]{0,100}\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|vehicle|reliable\s+transportation|transportation)\b/i;
const VEHICLE_CONDITIONAL = /\b(?:for|if|where)\s+(?:positions?|roles?|jobs?)?\s*(?:requiring|that require|requiring the use of|driving)\b|\b(?:when|if)\s+driving\s+is\s+required\b/i;
const VEHICLE_REQUIRED_CUE = /\b(?:valid|current|must|possess|hold|maintain|obtain|provide|access\s+to|own|personal|reliable|required|mandatory|license|licence|permit|abstract|ability\s+to\s+drive|must\s+drive)\b/i;
const VEHICLE_SPECIFIC_REQUIREMENT = /\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|(?:access|own|personal|reliable)\s+(?:to\s+)?(?:a\s+)?vehicle|reliable\s+transportation|vehicle\s+(?:is\s+)?(?:required|necessary)|ability\s+to\s+drive|must\s+drive)\b/i;
const VEHICLE_OPTIONAL_REQUIREMENT = /\b(?:asset|preferred|preferable|nice\s+to\s+have|desirable|advantage|optional)\b/i;

type RequirementSection = 'required' | 'optional' | 'other';
type DescriptionLine = { text: string; section: RequirementSection; heading: boolean };

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
    || trimmed.match(/^([A-Z][A-Z0-9 &'\-/]{3,}):?\s*$/)?.[1];
  return markdown ? compactText(markdown).toLowerCase() : null;
}

function sectionForHeading(heading: string): RequirementSection {
  if (/\b(?:nice\s+to\s+have|preferred|desirable|assets?|bonus|additional\s+qualifications|would\s+be\s+great)\b/i.test(heading)) return 'optional';
  if (/\b(?:qualifications?|requirements?|minimum|essential|what\s+you\s+(?:need|should)|skills?|education\s+and\s+(?:experience|qualifications)|knowledge\s+and\s+skills|language|licen[cs]e)\b/i.test(heading)) return 'required';
  return 'other';
}

function descriptionLines(description: string): DescriptionLine[] {
  let section: RequirementSection = 'other';
  return description.split(/\r?\n/).map(raw => {
    const heading = headingText(raw);
    if (heading) {
      section = sectionForHeading(heading);
      return { text: heading, section, heading: true };
    }
    const text = compactText(raw.replace(/^\s*[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''));
    return { text, section, heading: false };
  }).filter(line => line.text);
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

function canonicalLanguageLine(line: string): string[] {
  const text = compactText(line);
  if (!text || LANGUAGE_NON_REQUIREMENT.test(text)) return [];
  const languages = namedLanguages(text);
  const bilingual = /\b(?:bilingual(?:ism)?|bilingue)\b/i.test(text)
    || (languages.length >= 2 && /\b(?:both|official\s+languages?|english\s+and\s+french|french\s+and\s+english)\b/i.test(text));
  const level = text.match(/\b[A-C]{2,3}\s*\/\s*[A-C]{2,3}\b/i)?.[0]?.replace(/\s+/g, '')
    || text.match(/\b[A-C]{2,3}\s+level\b/i)?.[0];
  if (bilingual) {
    const pair = languages.length >= 2 ? ` (${languages.slice(0, 3).join('/')})` : '';
    return [`Bilingual${pair}${level ? ` (${level})` : ''}`];
  }
  if (!languages.length) {
    const officialLevel = text.match(/\b[A-C]{2,3}\s*\/\s*[A-C]{2,3}\b/i)?.[0]?.replace(/\s+/g, '');
    return officialLevel && LANGUAGE_LEVEL.test(text) ? [officialLevel] : [];
  }
  return languages.map(language => {
    const canonical = canonicalLanguageName(language);
    return /\bessential\b/i.test(text) ? `${canonical} Essential` : canonical;
  });
}

function isLanguageRequirementLine(line: DescriptionLine): boolean {
  if (line.heading || isOptionalLanguageLine(line) || LANGUAGE_NON_REQUIREMENT.test(line.text)) return false;
  if (!LANGUAGE_NAME_PATTERN.test(line.text) && !LANGUAGE_LEVEL.test(line.text)) return false;
  if (line.section === 'required') return true;
  if (/^\s*(?:language|language\s+requirements?|languages?|bilingual(?:ism)?)\s*[:\-]/i.test(line.text)) return true;
  return LANGUAGE_REQUIREMENT_CUE.test(line.text);
}

export function extractLanguageRequirements(description: string, title = ''): string[] {
  const values = new Set<string>();
  if (/\bbilingual\b/i.test(title)) values.add('Bilingual');
  for (const line of descriptionLines(description)) {
    if (!isLanguageRequirementLine(line)) continue;
    for (const value of canonicalLanguageLine(line.text)) values.add(value);
  }
  return [...values];
}

function isVehicleRequirementLine(line: DescriptionLine): boolean {
  if (line.heading || !VEHICLE_TERM.test(line.text)) return false;
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

export function normalizeLanguageRequirements(value: unknown): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of toStringList(value)) {
    const compact = compactText(item).replace(/^[-*]\s*/, '');
    if (!compact || LANGUAGE_OPTIONAL_REQUIREMENT.test(compact) || LANGUAGE_NON_REQUIREMENT.test(compact)) continue;
    for (const value of canonicalLanguageLine(compact)) {
      const key = value.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        normalized.push(value);
      }
    }
  }
  return normalized;
}

export function normalizeVehicleRequired(value: unknown): boolean | null {
  if (value == null || value === '' || value === 'null' || value === 'unknown') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

export const LANGUAGE_VEHICLE_CANDIDATE = /\b(?:english|french|fran[cç]ais|anglais|bilingual(?:ism)?|bilingue|cantonese|mandarin|punjabi|arabic|ukrainian|spanish|german|italian|portuguese|korean|japanese|hindi|urdu|tamil|somali|farsi|persian|russian|polish|tagalog|american sign language|sign language|asl|language\s+requirements?|language\s+proficiency|fluency|fluent|driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|reliable\s+(?:transportation|vehicle)|access\s+to\s+(?:a\s+)?vehicle|own\s+vehicle|personal\s+vehicle|vehicle\s+(?:is\s+)?required|ability\s+to\s+drive|must\s+drive)\b/i;

export function hasLanguageVehicleCandidate(description: string): boolean {
  return LANGUAGE_VEHICLE_CANDIDATE.test(description);
}
