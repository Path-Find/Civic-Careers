import { UNIVERSITY_OF_OTTAWA_DESCRIPTION_RULES } from './source-rules/university-of-ottawa';
import { SHARED_HEALTH_DESCRIPTION_RULES } from './source-rules/shared-health-manitoba';
import { CANADA_POST_DESCRIPTION_RULES } from './source-rules/canada-post';
import { YORK_UNIVERSITY_DESCRIPTION_RULES } from './source-rules/york-university';
import { UNIVERSITY_OF_TORONTO_DESCRIPTION_RULES } from './source-rules/university-of-toronto';
import { WESTERN_UNIVERSITY_DESCRIPTION_RULES } from './source-rules/western-university';
import { UBC_DESCRIPTION_RULES } from './source-rules/ubc';
import { DALHOUSIE_DESCRIPTION_RULES } from './source-rules/dalhousie-university';

type SourceRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

// These are source-template fingerprints, not broad keyword filters. A rule is
// added only after the same block has been reviewed across multiple postings.
const SOURCE_RULES: Record<string, SourceRule[]> = {
  'Canada Post': CANADA_POST_DESCRIPTION_RULES,
  'Shared Health Manitoba': SHARED_HEALTH_DESCRIPTION_RULES,
  'University of Ottawa': UNIVERSITY_OF_OTTAWA_DESCRIPTION_RULES,
  'York University': YORK_UNIVERSITY_DESCRIPTION_RULES,
  'University of Toronto': UNIVERSITY_OF_TORONTO_DESCRIPTION_RULES,
  'Western University': WESTERN_UNIVERSITY_DESCRIPTION_RULES,
  UBC: UBC_DESCRIPTION_RULES,
  'Dalhousie University': DALHOUSIE_DESCRIPTION_RULES,
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
  'City of Cornwall': [
    // Repeated city tourism pitch (population / St. Lawrence / quality of life /
    // "never been a better time…") that opens every Workland posting. Verified
    // across active Cornwall rows — never contains role duties.
    { name: 'cornwall-tourism-intro', pattern: /Cornwall is a (?:beautiful )?community[\s\S]*?(?:municipal services and infrastructure|quality of life)\.?[ \t]*\n?/i, mode: 'inline' },
    { name: 'cornwall-tourism-intro-short', pattern: /Cornwall is a community of[\s\S]*?quality of life\.?[ \t]*/i, mode: 'inline' },
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
  'CMHC': [
    // Job Requisition ID through Security Requirement/Salary — every field in
    // this block duplicates work_model/employment_type/language_requirements/
    // security_check_required/salary, which are correctly populated once the
    // labeled Security Requirement/Language Designation values are extracted
    // (requirements.ts extractSecurityRequirementLabel). Verified against all
    // 7 CMHC postings carrying this block (some via the raw CMHC source,
    // some scraped through the generic Government of Canada listing).
    { name: 'cmhc-posting-metadata-block', pattern: /\*{0,2}Job Requisition ID:\*{0,2}[\s\S]*?\*{0,2}Security Requirement:\*{0,2}[^\n]*\n?(?:\s*\n?\*{0,2}Salary:\*{0,2}[^\n]*\n?)?/i, mode: 'inline' },
    // Employer mission / culture pitch that opens nearly every CMHC posting
    // ("well-functioning housing system…"). Never role-specific. Verified on
    // long form + short "We contribute to a well-functioning housing system."
    {
      name: 'cmhc-about-employer-pitch',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})About CMHC\*{0,2}\s*\n[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!About CMHC)[A-Za-z*])|$)/i,
      mode: 'inline',
    },
    // Generic permanent-employee benefits package ("purpose, the people and the
    // perks…") — same on every posting; benefits already live structured when
    // stated. Hybrid/in-office lines under this heading go with it.
    {
      name: 'cmhc-whats-in-it-for-you',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})What[’']s in it for you\*{0,2}\s*\n[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!What)[A-Za-z*])|$)/i,
      mode: 'inline',
    },
  ],
  'Government of Canada': [
    { name: 'selection-thank-you-footer', pattern: /^(?:We wish to thank all applicants|We'd like to thank all those who apply)\.[\s\S]*$/i },
    { name: 'generic-accommodation-footer', pattern: /^We are committed to providing an inclusive and barrier-free work environment,[\s\S]*$/i },
    { name: 'cmhc-posting-metadata-block', pattern: /\*{0,2}Job Requisition ID:\*{0,2}[\s\S]*?\*{0,2}Security Requirement:\*{0,2}[^\n]*\n?(?:\s*\n?\*{0,2}Salary:\*{0,2}[^\n]*\n?)?/i, mode: 'inline' },
    // CMHC postings that land under the GC source still carry the same pitch.
    {
      name: 'cmhc-about-employer-pitch',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})About CMHC\*{0,2}\s*\n[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!About CMHC)[A-Za-z*])|$)/i,
      mode: 'inline',
    },
    {
      name: 'cmhc-whats-in-it-for-you',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})What[’']s in it for you\*{0,2}\s*\n[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!What)[A-Za-z*])|$)/i,
      mode: 'inline',
    },
    // Same generic employment-equity boilerplate as the Equity/DEI heading
    // rule below, just nested inside "You may need (asset qualifications)"
    // instead of its own heading — verified against every occurrence.
    { name: 'organizational-needs-equity-paragraph', pattern: /^\*{0,2}Organizational Needs:?\*{0,2}[\s\S]*$/im, mode: 'inline' },
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

    // ── Process / inventory / employer-pitch blocks (2026-08-04) ──────────
    // Next-section look-ahead shared by Work environment / Intent / Important
    // messages. Stops before real role or qualifications content.
    // Intent of the process — pure staffing-process inventory text.
    {
      name: 'gc-intent-of-the-process-section',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})Intent of the process\*{0,2}\s*:?\s*[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!Intent)[A-Za-z*]|##\s)|(?=\n\s*(?:Duties|About the position|Positions to be filled|Essential|Conditions of employment|Operational Requirements|Qualifications|Overview|Responsibilities|Who can apply|Language requirements|Information you must provide|Asset qualifications|Important messages|Work environment)\b)|$)/i,
      mode: 'inline',
    },
    // Important messages — inventory application notices, telework disclaimers,
    // equity prioritization process notes (location already structured).
    {
      name: 'gc-important-messages-section',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})Important messages?\*{0,2}\s*:?\s*[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!Important)[A-Za-z*]|##\s)|(?=\n\s*(?:Duties|About the position|Positions to be filled|Essential|Conditions of employment|Operational Requirements|Qualifications|Overview|Responsibilities|Who can apply|Language requirements|Information you must provide|Asset qualifications|Intent of the process|Work environment)\b)|$)/i,
      mode: 'inline',
    },
    // Work environment that is an employer pitch (PPSC "The Department:", RCMP
    // "employer of choice", mission/EDIA national councils). Leaves duty-heavy
    // Work environment sections (e.g. CBSA BSO training pathway) alone.
    {
      name: 'gc-work-environment-employer-pitch',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})Work environment\*{0,2}\s*:?\s*[\s\S]*?(?:The Department\s*:|employer of choice|national organization of approximately|promises a career like no other|Mission and Values|National Councils for Employees|Equity, Diversity, Inclusion, and Accessibility \(EDIA\)|we offer meaningful career opportunities)[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!Work)[A-Za-z*]|##\s)|(?=\n\s*(?:Duties|About the position|Positions to be filled|Essential|Conditions of employment|Operational Requirements|Qualifications|Overview|Responsibilities|Who can apply|Language requirements|Information you must provide|Asset qualifications|Intent of the process|Important messages)\b)|$)/i,
      mode: 'inline',
    },
    // Standalone inventory sentences (heading already stripped or missing).
    {
      name: 'gc-inventory-not-specific-job',
      pattern: /(?:When you apply[^.!\n]{0,120})?you are not applying for a specific job,? but to an inventory[^.!\n]{0,400}\.?[ \t]*/gi,
      mode: 'inline',
    },
    {
      name: 'gc-staff-current-and-future-vacancies',
      pattern: /This process is being used to staff current and future vacancies[^.!\n]{0,250}\.[ \t]*(?:A list of qualified[^.!\n]{0,300}\.[ \t]*)?/gi,
      mode: 'inline',
    },
    {
      name: 'gc-intent-of-the-process-inline',
      pattern: /(?:^|\n)\s*[-•*]?\s*The intent of the process is to[^\n]{10,400}\n?/gi,
      mode: 'inline',
    },
    {
      name: 'gc-pool-of-qualified-candidates',
      pattern: /(?:^|\n)\s*(?:\*{0,2}|#{1,6}\s*)?(?:Intent of the process\*{0,2}\s*:?\s*)?A pool of (?:qualified )?candidates will be established[^\n]{0,400}\.?[ \t]*(?:This pool may be used to staff[^\n]{0,300}\.?[ \t]*)?/gi,
      mode: 'inline',
    },
    {
      name: 'gc-telework-not-an-option',
      pattern: /Telework or alternate work locations will not be an option\.[ \t]*(?:Persons selected for appointments must reside within a commutable distance of the workplace\.[ \t]*)?/gi,
      mode: 'inline',
    },
    // PPSC department pitch when it appears without a Work environment heading.
    {
      name: 'gc-ppsc-department-pitch',
      pattern: /(?:The Department:\s*)?The Public Prosecution Service of Canada \(PPSC\) is a national organization of approximately[\s\S]*?(?:business professionals|2SLGBTQIA\+\.?)\.?[ \t]*/gi,
      mode: 'inline',
    },
    // Broader employer-pitch Work environment (RCMP maple-leaf intros, etc.)
    // when the section is still present after the fingerprint-gated rule above.
    {
      name: 'gc-work-environment-rcmp-pitch',
      pattern: /(?:^|\n)\s*(?:#{1,6}\s*|\*{0,2})Work environment\*{0,2}\s*:?\s*[\s\S]*?(?:Royal Canadian Mounted Police|RCMP promises|civilian employees play a critical role)[\s\S]*?(?=\n\s*(?:#{1,6}\s+|\*{1,2}(?!Work)[A-Za-z*]|##\s)|(?=\n\s*(?:Duties|About the position|Positions to be filled|Essential|Conditions of employment|Operational Requirements|Qualifications|Overview|Responsibilities|Who can apply|Language requirements|Information you must provide|Asset qualifications|Intent of the process|Important messages)\b)|$)/i,
      mode: 'inline',
    },
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
