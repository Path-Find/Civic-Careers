type SourceRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

// These are source-template fingerprints, not broad keyword filters. A rule is
// added only after the same block has been reviewed across multiple postings.
const SOURCE_RULES: Record<string, SourceRule[]> = {
  'Brock University': [
    { name: 'brock-employer-introduction', pattern: /Brock University is located on the traditional territory of the Haudenosaunee and Anishinaabe peoples,[\s\S]*?Break through at Brock\./i, mode: 'inline' },
  ],
  'City of Belleville': [
    // Tourism-brochure paragraph and generic "exciting opportunity" filler,
    // each their own paragraph ahead of the real ## Overview section. The
    // posting-metadata block (Position Type through Salary) duplicates
    // employment_type/location/closing_date/salary_min, already correctly
    // populated — verified against both Belleville rows carrying this block.
    { name: 'belleville-tourism-intro', pattern: /The City of Belleville, known as the[\s\S]*?More information is available at www\.belleville\.ca\.?[ \t]*\n?/i, mode: 'inline' },
    { name: 'belleville-exciting-opportunity-filler', pattern: /Currently, the City of Belleville has an exciting opportunity[\s\S]*?\.[ \t]*\n?/i, mode: 'inline' },
    { name: 'belleville-posting-metadata-block', pattern: /Position Type:[\s\S]*?Salary:[^\n]*\n?(?:Closing Date:[^\n]*\n?)?/i, mode: 'inline' },
    { name: 'belleville-closing-tagline', pattern: /-\s*Live, work, and play in the beautiful city of Belleville and experience all that it has to offer\.?[ \t]*\n?/gi, mode: 'inline' },
  ],
  'City of Barrie': [
    { name: 'equal-opportunity-footer', pattern: /The City of Barrie is an equal opportunity employer,[\s\S]*?we will work with you to meet your needs\./i, mode: 'inline' },
    { name: 'job-description-disclaimer', pattern: /The job posting has been designed to indicate[\s\S]*?HR\.Recruitment@Barrie\.ca\./i, mode: 'inline' },
  ],
  'City of St. Catharines': [
    { name: 'additional-information-footer', pattern: /(?:^|\n\s*)(?:#{1,6}\s*)?Additional Information:\s*Equal Opportunity Employer[\s\S]*$/i, mode: 'suffix' },
    { name: 'additional-information-section', pattern: /(?:^|\n\s*)(?:#{1,6}\s*)?Additional Information\s*\n\s*-?\s*Equal Opportunity Employer[\s\S]*$/i, mode: 'suffix' },
    // Posting-metadata block (Location/Work Mode/Employee Group/Position Type/
    // Duration/Application Deadline) — verified against all 24 St. Catharines
    // rows: every field in it is already correctly captured in work_model,
    // employment_type, duration, is_unionized/union_name. Pure restatement.
    { name: 'stcatharines-posting-metadata-block', pattern: /Employee Group:[\s\S]*?Position Type:|Position Type:[\s\S]*?Employee Group:/i },
  ],
  'University of Waterloo': [
    { name: 'waterloo-employer-introduction', pattern: /At the\s+University of Waterloo, we create and promote a culture where everyone can reach their full potential\. As an employee, you get support\s*&\s*opportunities that empower you to advance your career\. Explore how we can bring big ideas to life, together\. The University is a welcoming workplace for those of all abilities, interests, and expertise\. As part of our workforce, you can do what you do best, every day\. Learn more about our recruitment process\./i, mode: 'inline' },
  ],
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
    { name: 'common-employer-introduction-compact', pattern: /Metrolinx is connecting communities across the Greater Golden Hors(?:es)?hoe,[\s\S]*?Metrolinx is an agency of the Government of Ontario\./i, mode: 'inline' },
    { name: 'common-employer-introduction-short', pattern: /Metrolinx is connecting communities across the Greater Golden Hors(?:es)?hoe,\s+operating GO Transit and UP Express, as well as the PRESTO fare payment system\.\s+We are also building new and improved rapid transit, including GO Expansion, Light Rail Transit routes, and major expansions to Toronto[’']s subway system\./i, mode: 'inline' },
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
    // "N-month work year" duplicates the `duration` field (parser.ts now
    // extracts it from this exact phrasing) and "[mode] work eligible"
    // duplicates `work_model`. Deliberately narrow — does not touch school-
    // calendar day-count schedules like "Work Year: 194 + 3 days", which
    // aren't captured by any structured field and need to stay as prose.
    { name: 'tdsb-work-year-duration-restatement', pattern: /\d{1,2}[ \t-]*months?\s+work\s+year[.,]?[ \t]*/gi, mode: 'inline' },
    { name: 'tdsb-work-year-duration-restatement-labeled', pattern: /Work\s+Year:?[ \t]*\d{1,2}[ \t]*[Mm]onths?[.,]?[ \t]*/g, mode: 'inline' },
    { name: 'tdsb-work-model-eligible-restatement', pattern: /[ \t]*,?[ \t]*(?:Hybrid|Remote|On-site|Onsite)\s+[Ww]ork\s+[Ee]ligible[.,]?[ \t]*/gi, mode: 'inline' },
    // "Salary: $X - $Y per year" duplicates salary_min/max/salary_range.
    // Stops right after "per year" (never consumes a trailing parenthetical
    // like "(Schedule II, Level 7)", which is genuinely new pay-grade info
    // with no structured field). Only matches a hyphenated range, so single
    // figures ("$227,378 per year") and "per annum" pay-table rows are
    // untouched — verified those aren't duplicates worth stripping the same way.
    { name: 'tdsb-salary-range-restatement', pattern: /(?:Salary:\s*)?\$[\d,]+(?:\.\d+)?\s*-\s*\$[\d,]+(?:\.\d+)?\s*per\s+year\.?[ \t]*/gi, mode: 'inline' },
  ],
  'Government of Canada': [
    { name: 'selection-thank-you-footer', pattern: /^(?:We wish to thank all applicants|We'd like to thank all those who apply)\.[\s\S]*$/i },
    { name: 'generic-accommodation-footer', pattern: /^We are committed to providing an inclusive and barrier-free work environment,[\s\S]*$/i },
    // Standard Treasury Board / Public Service template sections. Verified against
    // all ~150 occurrences across the GC corpus (2026-08-04): every instance is
    // generic policy or contact boilerplate, never job-specific content. Distinct
    // from "How to apply" and "Language requirements", which were checked too but
    // left alone — both mix in real per-posting instructions/qualifications often
    // enough that a blanket strip would lose signal.
    { name: 'veteran-preference-section', pattern: /^##\s+Preference\s*\n[\s\S]*$/im },
    { name: 'equity-diversity-inclusion-section', pattern: /^##\s+Equity,?\s+diversity and inclusion\s*\n[\s\S]*$/im },
    { name: 'our-commitment-accessibility-section', pattern: /^##\s+Our commitment\s*\n[\s\S]*$/im },
    // 'suffix' (not paragraph-scoped) because these two are always the last
    // sections in the template, and some postings put a blank line between
    // multiple named contacts within "Hiring organization contact" — a
    // paragraph-scoped match would only catch the first contact and leave
    // the second as an orphaned fragment.
    { name: 'additional-links-section', pattern: /^##\s+Additional links\s*\n[\s\S]*$/im, mode: 'suffix' },
    { name: 'hiring-organization-contact-section', pattern: /^##\s+Hiring organization contact\s*\n[\s\S]*$/im, mode: 'suffix' },
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
    /^(?:(?:#{1,6}\s+|\*\*)?(?:Overview|Responsibilities|Qualifications|Requirements|Nice to Have|Compensation & Benefits|Job Details|Other Requirements|Additional Information|Application Process|Don[’']t Meet Every Requirement|Accommodation|Equity)(?:\*\*)?)\s*:?\s*$/i.test(line.trim());
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
