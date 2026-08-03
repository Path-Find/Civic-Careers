type SourceRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

// These are source-template fingerprints, not broad keyword filters. A rule is
// added only after the same block has been reviewed across multiple postings.
const SOURCE_RULES: Record<string, SourceRule[]> = {
  Metrolinx: [
    { name: 'dont-meet-every-requirement', pattern: /(?:(?:^|\n\s*\n)\s*|(?<=\.\s))(?:\*\*)?(?:#{1,6}\s*)?Don[’']t Meet Every Requirement\??\*{0,2}[\s\S]*$/i, mode: 'suffix' },
    { name: 'application-process', pattern: /(?:(?:^|\n\s*\n)\s*|(?<=\.\s))(?:\*\*)?(?:#{1,6}\s*)?Application Process:\s*[\s\S]*$/i, mode: 'suffix' },
    { name: 'internal-applicant-process', pattern: /(?:(?:^|\n\s*\n)\s*|(?<=\.\s))For Internal applicants,[\s\S]*$/i, mode: 'suffix' },
    { name: 'inaccurate-information-warning', pattern: /^Should it be determined that any background information provided(?: is| be) misleading,[\s\S]*$/i },
    { name: 'thank-you-footer', pattern: /^We thank all applicants for their interest,[\s\S]*$/i },
    { name: 'equitable-employer-footer', pattern: /^WE ARE AN EQUITABLE AND INCLUSIVE EMPLOYER\.?$/i },
    { name: 'equity-invitation', pattern: /^We invite all interested individuals to apply and encourage applications from members of equity-deserving communities[\s\S]*$/i },
    { name: 'accommodation-footer', pattern: /^(?:###\s*)?Accommodation:\s*[\s\S]*$/i },
    { name: 'common-employer-introduction-connecting', pattern: /(?:\*\*)?Metrolinx(?:\*\*)?\s+is connecting communities across the Greater Golden Hors(?:es)?hoe\./i, mode: 'inline' },
    { name: 'common-employer-introduction-operations', pattern: /Metrolinx operates GO Transit and UP Express, as well as the PRESTO fare payment system\./i, mode: 'inline' },
    { name: 'common-employer-introduction-rapid-transit', pattern: /We are also building new and improved rapid transit, including GO Expansion, Light Rail Transit routes, and major expansions to (?:Toronto's|Toronto’s) subway system, to get people where they need to go, better, faster and easier\./i, mode: 'inline' },
    { name: 'common-employer-introduction-ontario', pattern: /Metrolinx is an agency of the Government of Ontario\./i, mode: 'inline' },
    { name: 'common-values-introduction', pattern: /At Metrolinx, equity, diversity and inclusion are essential to living our values of serving with passion, thinking forward and playing as a team\./i, mode: 'inline' },
    { name: 'legal-employment-footer', pattern: /All applicants must be legally entitled to work in Canada\./i, mode: 'inline' },
    { name: 'accommodation-short-footer', pattern: /Accommodation available upon request\./i, mode: 'inline' },
    { name: 'equity-short-footer', pattern: /We are committed to equity, diversity and inclusion\./i, mode: 'inline' },
  ],
  'Toronto District School Board': [
    { name: 'working-at-tdsb', pattern: /^Working at the TDSB\s*[\s\S]*?Applicants are encouraged to make their needs for accommodation known in advance during the application process\.?$/i },
    { name: 'tdsb-equity-footer', pattern: /^The Toronto District School Board adheres to equitable hiring and employment practices\.[\s\S]*$/i },
    { name: 'tdsb-ai-disclosure', pattern: /^TDSB uses artificial intelligence \(AI\) tools to support parts of the recruitment process[\s\S]*$/i },
    { name: 'tdsb-application-administration', pattern: /^Key points about applying for ERP and LRS positions at TDSB:[\s\S]*$/i },
  ],
  'Government of Canada': [
    { name: 'selection-thank-you-footer', pattern: /^(?:We wish to thank all applicants|We'd like to thank all those who apply)\.[\s\S]*$/i },
    { name: 'generic-accommodation-footer', pattern: /^We are committed to providing an inclusive and barrier-free work environment,[\s\S]*$/i },
  ],
};

function removeRuleFromParagraphs(description: string, rules: SourceRule[]): string {
  let result = description;
  for (const rule of rules) {
    if (rule.mode === 'suffix') {
      result = result.replace(rule.pattern, '');
      continue;
    }
    if (rule.mode === 'inline') {
      result = result.replace(rule.pattern, '').replace(/[ \t]{2,}/g, ' ');
      continue;
    }
    result = result
      .split(/\n\s*\n+/)
      .filter(paragraph => !rule.pattern.test(paragraph.trim()))
      .join('\n\n');
  }
  result = result
    .split('\n')
    .filter(line => !/^\s*(?:[-*•]\s*)+$/.test(line))
    .join('\n');

  const lines = result.split('\n');
  const isEmptyHeading = (line: string): boolean =>
    /^(?:#{1,6}\s+.+|\*\*(?:Additional Information|Application Process|Don[’']t Meet Every Requirement)\*\*)\s*$/i.test(line.trim());
  result = lines.filter((line, index) => {
    if (!isEmptyHeading(line)) return true;
    const next = lines.slice(index + 1).find(candidate => candidate.trim());
    return Boolean(next && !isEmptyHeading(next));
  }).join('\n');

  const cleaned = result.replace(/\n[ \t]+\n/g, '\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned.replace(/\s+/g, ' ').trim() === description.replace(/\s+/g, ' ').trim()
    ? description
    : cleaned;
}

export function cleanSourceDescriptionBoilerplate(source: string, description: string): string {
  const rules = SOURCE_RULES[source];
  return rules ? removeRuleFromParagraphs(description, rules) : description;
}

export function sourceDescriptionRuleNames(source: string): string[] {
  return (SOURCE_RULES[source] ?? []).map(rule => rule.name);
}
