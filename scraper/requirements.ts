export interface SoftwareBackfillResult {
  values: string[];
  skippedOptionalLines: number;
}

const CERTIFICATION_PATTERN = /\b(?:(?:basic|standard|intermediate|advanced|emergency)\s+)?first\s+aid(?:\s*(?:\/|and)\s*|\s+)cpr(?:\s+[a-c])?\b|\b(?:WHMIS|Smart\s+Serve|Food\s+Handler|Nonviolent\s+Crisis\s+Intervention)\b/i;

export function extractCertificationRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits' || !CERTIFICATION_PATTERN.test(line.text)) continue;
    const match = line.text.match(CERTIFICATION_PATTERN);
    if (!match) continue;
    values.add(compactText(match[0]).replace(/\s*\/\s*/g, ' / '));
  }
  return [...values];
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

const EDUCATION_TERM = /\b(?:bachelor(?:['’]s)?(?:\s+degree)?|master(?:['’]s)?(?!\s+electrician)(?:\s+degree)?|ph\.?d\.?|doctor(?:ate|al)|diploma|degree\s+(?:in|from|required|or|program)|post[- ]secondary\s+(?:education|program|institution)|associate(?:['’]s)?|bscn|bsn|b\.?a\.?|m\.?a\.?|undergraduate\s+degree|graduate\s+degree)\b/i;
const STUDENT_EDUCATION_TERM = /\b(?:current(?:ly)?\s+enrol(?:l(?:ed|ment)?|ment)?|registration\s+in\s+(?:a\s+)?co-?op\s+program|student\s+(?:status|enrolment|enrollment))\b/i;
const EDUCATION_REQUIRED_CUE = /\b(?:required|minimum|must|completion|completed|successful|degree\s+in|diploma\s+in|equivalent|eligible|graduate|undergraduate|post[- ]secondary\s+(?:program|institution|education\s+in)|education\s+in)\b|\b(?:a|an|minimum|completion\s+of|completed|required)\s+post[- ]secondary\s+education\b/i;
const EDUCATION_CONTEXT_ONLY = /^\s*(?:familiarity|knowledge|experience|proficiency|understanding|working knowledge|demonstrated|strong|excellent)\b/i;
const FORMAL_EDUCATION_CUE = /\b(?:bachelor|master|ph\.?d|doctor(?:ate|al)|diploma|degree|bscn|bsn|b\.?a\.?|m\.?a\.?|undergraduate|graduate|enrol(?:l|led|ment)|completion of)\b/i;
const STRUCTURED_OPTIONAL_REQUIREMENT = /\b(?:asset|assets|preferred|preferable|preference|nice\s+to\s+have|would\s+be\s+an?\s+asset|considered\s+an?\s+asset|desirable|advantage|optional)\b/i;
const LICENSE_TERM = /\b(?:licen[cs](?:e|ed|ing|ure)|permit|registration|registered\s+(?:as|with|by)|designation|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification|certificate\s+of\s+authorization|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e)\b/i;
const LICENSE_REQUIRED_CUE = /\b(?:required|minimum|must|possess|hold|maintain|valid|current|eligible|obtain|provide|registered|registration|designation|certified)\b/i;
const EXPERIENCE_NUMBER = '(?:\\d+(?:\\.\\d+)?\\+?|one|two|three|four|five|six|seven|eight|nine|ten|several)';
const EXPERIENCE_SUFFIX = `(?:[’\\']?\\s+(?:of\\s+)?(?:[a-z-]+\\s+){0,5}experience)`;
const EXPERIENCE_YEARS_PATTERN = new RegExp(`\\b${EXPERIENCE_NUMBER}(?:\\s*(?:-|–|—|to)\\s*${EXPERIENCE_NUMBER})?\\s*(?:years?|yrs?)${EXPERIENCE_SUFFIX}\\b`, 'i');
const EXPERIENCE_CLAUSE_PATTERN = new RegExp(`(?:(?:a\\s+)?minimum\\s+of|minimum|at\\s+least)?\\s*${EXPERIENCE_NUMBER}(?:\\s*(?:-|–|—|to)\\s*${EXPERIENCE_NUMBER})?\\s*(?:years?|yrs?)${EXPERIENCE_SUFFIX}\\b[^.;\\n]{0,180}`, 'i');
const EXPERIENCE_HISTORY_SIGNAL = new RegExp(`\\b(?:with\\s+)?(?:more\\s+than|over)\\s+${EXPERIENCE_NUMBER}\\s+years?\\s+of\\s+experience\\b`, 'i');
// Source text often states education and experience as one combined sentence
// ("Degree in X and seven years of experience..."); extractExperienceRequirements
// already isolates its own clause from that same line, so education needs the
// identical tail cut or the two fields end up holding the same sentence twice.
const EDUCATION_EXPERIENCE_TAIL = new RegExp(`\\s+and\\s+${EXPERIENCE_NUMBER}(?:\\s*(?:-|–|—|to)\\s*${EXPERIENCE_NUMBER})?\\s*(?:years?|yrs?)${EXPERIENCE_SUFFIX}\\b[^.;\\n]*$`, 'i');
const NAMED_BENEFITS: Array<[string, RegExp]> = [
  ['OMERS', /\bOMERS\b/i],
  ['HOOPP', /\bHOOPP\b/i],
  ['CAAT Pension Plan', /\bCAAT\s+(?:pension\s+)?plan\b/i],
  ['Municipal Pension Plan', /\bMunicipal\s+Pension\s+Plan\b/i],
  ['Public Service Pension Plan', /\bPublic\s+Service\s+Pension\s+Plan\b/i],
];

const ONGOING_TITLE_SIGNAL = /\b(?:ongoing recruitment|recruitment program|student employment program|talent pool|candidate pool|future opportunities|expression of interest|co-?op students?\s*[-–—:]\s*(?:various|multiple))\b/i;
const INVENTORY_TEXT_SIGNAL = /\bnot\s+applying\s+for\s+a\s+specific\s+(?:job|position)\b[^.\n]{0,100}\b(?:an?\s+)?inventory\s+for\s+future\s+vacancies\b/i;
const ONGOING_TEXT_SIGNALS: RegExp[] = [
  /\b(?:candidate|talent)\s+pool\b/i,
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
  if (INVENTORY_TEXT_SIGNAL.test(text)) return 'inventory';
  if (ONGOING_TITLE_SIGNAL.test(title)) return 'ongoing_recruitment';
  return ONGOING_TEXT_SIGNALS.some(signal => signal.test(text)) ? 'ongoing_recruitment' : 'regular';
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
    .replace(/\s+(?=\d+[.)]\s+)/g, '\n')
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

function cleanEducationRequirement(value: string): string {
  const initial = cleanRequirementText(value);
  const educationIndex = initial.search(/\b(?:bachelor|master|ph\.?d|doctor(?:ate|al)|diploma|degree|bscn|bsn|undergraduate|graduate)\b/i);
  const educationPrefix = educationIndex >= 0 ? initial.slice(0, educationIndex) : '';
  const withoutAdministrativeTail = initial
    .replace(/^your\s+application\s+must\s+clearly\s+explain\s+how\s+you\s+meet\s+the\s+following\s*education\s*:\s*[-–—]?\s*/i, '')
    .replace(/\s*(?:learn more about\b|applied\s*\/\s*assessed\b|competencies?\s*:).*/i, '')
    .replace(/\.\s+(?=(?:a|an|the)\s+(?:demonstrated|ability)\b|candidate\s+has\b).*/i, '.');
  const cleaned = (educationIndex >= 0 && LICENSE_TERM.test(educationPrefix) ? withoutAdministrativeTail.slice(educationIndex) : withoutAdministrativeTail)
    .replace(/\s+(?:and\s+)?(?:valid\s+|current\s+|must\s+(?:have|hold|possess)\s+|registered\s+(?:as|with)\s+|registration\s+(?:with|in|as)\s+)(?:[^.]+(?:licen[cs]e|p\.?\s*eng\.?|professional\s+engineer|certificate\s+of\s+qualification|registration)[^.]*).*$/i, '')
    .replace(/\s+(?:and\s+)?registration\s+(?:or|with|in|as|through)\b.*$/i, '')
    .replace(EDUCATION_EXPERIENCE_TAIL, '')
    .replace(/[;,.]+$/, '')
    .replace(/\s+(?:with|and|or)$/i, '')
    .trim();
  return cleaned;
}

function cleanLicenseRequirement(value: string): string {
  const start = value.match(/\b(?:valid\s+(?:[^.\n]{0,80}\s+)?(?:driver.?s?\s+)?licen[cs]e|current\s+(?:[^.\n]{0,80}\s+)?(?:driver.?s?\s+)?licen[cs]e|must\s+(?:have|hold|possess|maintain|obtain)\b|registered\s+(?:as|with|by)\b|registered\s+professional\s+engineer|registration\s+(?:with|in|as|through)\b|(?:professional|accounting|trade|engineering)\s+designation(?:\s+(?:as|with|required))?|professional\s+engineer|p\.?\s*eng\.?|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|certificate\s+of\s+(?:qualification|authorization))\b/i);
  const cleaned = cleanRequirementText(start ? value.slice(start.index) : value);
  return cleaned
    .replace(/\s*(?:\.\s*[-–—]\s*|[-–—]\s+)(?:travel|overtime|mobility|security|operational requirements?)\s*:.*/i, '')
    .replace(/[;,.]+$/, '')
    .trim();
}

function normalizedRequirement(value: string): string {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function retainExistingEducation(value: string): boolean {
  if (value.length > 300 || (!EDUCATION_TERM.test(value) && !STUDENT_EDUCATION_TERM.test(value))) return false;
  if (/\b(?:leading|supports? students|position is|this role|post[- ]secondary institution offering|navigate|campus events)\b/i.test(value)) return false;
  return /^\s*(?:a|an|minimum|completion|completed|degree|diploma|post[- ]secondary|undergraduate|graduate|your\s+educational|candidates?\s+must|must|current(?:ly)?\s+enrol(?:l(?:ed|ment)?|ment)?|registration\s+in\s+(?:a\s+)?co-?op|we\s+are\s+seeking|\d+[- ]year|university|college|bachelor|master|ph\.?d)/i.test(value)
    || /\b(?:completion\s+of|degree\s+in|diploma\s+in|equivalent\s+combination)\b/i.test(value);
}

function retainExistingLicense(value: string): boolean {
  if (value.length > 300 || !LICENSE_TERM.test(value)) return false;
  if (/\b(?:software|application|product|patent|open[- ]source)\s+licen[cs]e|licen[cs]e\s+information|registered\s+as\s+(?:a\s+)?(?:full[- ]time|part[- ]time)?\s*student\b/i.test(value)) return false;
  return /^(?:\s*(?:a|an|valid|current|must|possess|hold|maintain|obtain|registered|registration|professional|accounting|trade|engineering|certificate|class)\b)/i.test(value)
    || /\b(?:professional|accounting|trade|engineering)\s+designation\b/i.test(value);
}

export function extractEducationRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits' || (!EDUCATION_TERM.test(line.text) && !STUDENT_EDUCATION_TERM.test(line.text))) continue;
    if (/\b(?:leading|post[- ]secondary institution offering|supports? students|position is|campus events)\b/i.test(line.text)) continue;
    if (line.section !== 'required' && line.text.length > 300) continue;
    if (EDUCATION_CONTEXT_ONLY.test(line.text) && !FORMAL_EDUCATION_CUE.test(line.text)) continue;
    if (line.section !== 'required' && !/^\s*(?:a|an|minimum|completion|completed|degree|diploma|post[- ]secondary|undergraduate|graduate|your\s+educational|candidates?\s+must|must|currently\s+enrolled|we\s+are\s+seeking)\b/i.test(line.text)) continue;
    const educationIndex = line.text.search(EDUCATION_TERM);
    const educationContext = line.text.slice(Math.max(0, educationIndex - 80), educationIndex + 40);
    if (line.section !== 'required' && !STUDENT_EDUCATION_TERM.test(line.text) && !EDUCATION_REQUIRED_CUE.test(educationContext)) continue;
    const value = cleanEducationRequirement(line.text);
    if (value && (EDUCATION_TERM.test(value) || STUDENT_EDUCATION_TERM.test(value)) && !STRUCTURED_OPTIONAL_REQUIREMENT.test(value)) values.add(value);
  }
  return [...values];
}

export function extractLicenseRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits' || !LICENSE_TERM.test(line.text)) continue;
    if (line.section !== 'required' && line.text.length > 300) continue;
    if (/\bregistered\s+as\s+(?:a\s+)?(?:full[- ]time|part[- ]time)?\s*student\b/i.test(line.text)) continue;
    if (/\b(?:software|application|product|patent|open[- ]source)\s+licen[cs]e|licen[cs]e\s+information\b/i.test(line.text)) continue;
    if (line.section !== 'required' && !LICENSE_REQUIRED_CUE.test(line.text)) continue;
    const explicitLicense = /\b(?:driver.?s?\s+(?:licen[cs]e|permit|abstract)|class\s+[a-z0-9]+\s+(?:driver.?s?\s+)?licen[cs]e|licen[cs]e|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification|certificate\s+of\s+authorization)\b/i.test(line.text);
    const explicitRegistration = /\b(?:registration\s+(?:with|in|as|through)|registered\s+(?:as|with|by)|professional\s+registration|designation\s+(?:as|with|required)|registration\b[^\n]{0,30}\b(?:required|must|valid|eligible))\b/i.test(line.text);
    if (!explicitLicense && !explicitRegistration) continue;
    if (explicitRegistration && !/\b(?:college|university|association|board|professional|regulatory|ontario|nurse|engineer|architect|inspector|MMAH|PEO|CPA|CET|designation)\b/i.test(line.text)) continue;
    if (!LICENSE_REQUIRED_CUE.test(line.text) && !/\b(?:valid|current|class\s+[a-z0-9]+|professional\s+engineer|p\.?\s*eng\.?|certificate\s+of\s+qualification)\b/i.test(line.text)) continue;
    const value = cleanLicenseRequirement(line.text);
    if (value && LICENSE_TERM.test(value) && !STRUCTURED_OPTIONAL_REQUIREMENT.test(value)) values.add(value);
  }
  return [...values];
}

export function extractExperienceRequirements(description: string): string[] {
  const values = new Set<string>();
  for (const line of descriptionLines(description)) {
    if (line.heading || line.section === 'optional' || line.section === 'benefits' || STRUCTURED_OPTIONAL_REQUIREMENT.test(line.text) || EXPERIENCE_HISTORY_SIGNAL.test(line.text)) continue;
    if (!EXPERIENCE_YEARS_PATTERN.test(line.text)) continue;
    const match = line.text.match(EXPERIENCE_CLAUSE_PATTERN);
    const value = compactText(match?.[0] || line.text).replace(/^[,;:–—-]\s*/, '').trim();
    if (value && value.length <= 240) values.add(value);
  }
  return [...values];
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

export function reconcileStructuredRequirements(description: string, current: Partial<StructuredRequirementValues>): StructuredRequirementValues {
  const experienceRequirements = extractExperienceRequirements(description);
  const educationRequirements = extractEducationRequirements(description);
  const licenseRequirements = extractLicenseRequirements(description);
  const namedBenefits = extractNamedBenefits(description);
  const currentEducation = toStringList(current.education_requirements).filter(retainExistingEducation);
  const currentExperience = toStringList(current.experience_requirements);
  const currentLicenses = toStringList(current.license_requirements).filter(retainExistingLicense);
  const currentBenefits = toStringList(current.benefits);
  const currentSkills = toStringList(current.required_skills);
  const requiredLines = descriptionLines(description).filter(line => !line.heading && line.section === 'required').map(line => normalizedRequirement(line.text));
  const skills = currentSkills.filter(skill => {
    if (isLanguageProficiencySkill(skill)) return false;
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
  return {
    experience_requirements: experienceRequirements.length ? experienceRequirements : currentExperience,
    education_requirements: educationRequirements.length ? educationRequirements : currentEducation,
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

  // "English Essential" / "French Essential" → plain language name.
  if (/^English(?:\s+Essential)?$/i.test(compact)) return ['English'];
  if (/^French(?:\s+Essential)?$/i.test(compact)) return ['French'];
  if (/^Français(?:\s+Essential)?$/i.test(compact)) return ['French'];

  // Pure PSC profile leftovers (BBB/BBB) — not a language.
  if (/^[A-C]{2,3}\s*\/\s*[A-C]{2,3}$/i.test(compact)) return [];

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
