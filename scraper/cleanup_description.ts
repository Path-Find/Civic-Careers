import { cleanSourceDescriptionBoilerplate } from './source-description-cleanup';

const SOCIAL_BOILERPLATE = /^(?:learn more about .+ on (?:instagram|facebook|linkedin)|(?:find|follow) us on (?:instagram|facebook|linkedin))\.?$/i;
const NAVIGATION_BOILERPLATE = /^(?:skip to .+|apply now|print|share (?:this|the) page|cookie(?: policy| notice)?)\.?$/i;
const GENERIC_EQUITY_BOILERPLATE = /(?:equal opportunity employer|equitable hiring and employment practices|accommodation needs? of persons with disabilities|inclusive and barrier-free work environment|under-represented employment equity groups|self-declare when you apply)/i;
const EMPTY_SECTION_LINE = /^\(?\s*(?:none|no content|n\/a|not applicable|not specified|not required)\s*\)?\.?$/i;

function titleCore(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCount(text: string): number {
  return (text.match(/[.!?](?=\s|$)/g) || []).length;
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

// City/employer marketing that never describes the work of the role.
// Deliberately lifestyle/geography/population oriented — not duties.
const TOURISM_SENTENCE = /\b(?:population of\s+\d|community of\s+[\d,]+|quality of life|urban amenities|raising a family|never been a better time|st\.?\s*lawrence river|live,?\s*work(?:ing)?,?\s*and play|situated on the (?:banks|shores)|fantastic quality of life|expanding population|growing economy|beautiful (?:community|city|town)|known as the|world[- ]class|proud to (?:call|be)|vibrant (?:community|city)|municipal services and infrastructure|residents and partners feel safe|excellent place for a career)\b/i;

// Signals that a sentence is actually about the job, not the town.
const ROLE_SENTENCE = /\b(?:responsible for|this (?:role|position|job)|the successful candidate|reporting to|duties include|you will|the incumbent|assess(?:es|ing)?|coordinate(?:s|ing)?|manage(?:s|ing)?|provide(?:s|ing)?|support(?:s|ing)?|lead(?:s|ing)?|oversee(?:s|ing)?|deliver(?:s|ing)?|process(?:es|ing)?)\b/i;

function sentenceMentionsTitle(sentence: string, jobTitle: string): boolean {
  const core = titleCore(jobTitle);
  if (core.length < 4) return false;
  const lower = sentence.toLocaleLowerCase();
  if (lower.includes(core.toLocaleLowerCase())) return true;
  // Also match the head of a long title ("Client Services Representative, Visual Arts"
  // → "Client Services Representative") when the body uses a shorter form.
  const head = core.split(/[,–—-]/)[0]?.trim() ?? '';
  return head.length >= 8 && lower.includes(head.toLocaleLowerCase());
}

function isTourismSentence(sentence: string): boolean {
  return TOURISM_SENTENCE.test(sentence) && !ROLE_SENTENCE.test(sentence);
}

function isRoleSentence(sentence: string, jobTitle: string): boolean {
  return sentenceMentionsTitle(sentence, jobTitle) || ROLE_SENTENCE.test(sentence);
}

function isTourismParagraph(paragraph: string, jobTitle: string): boolean {
  const sentences = splitSentences(paragraph);
  if (sentences.length === 0) return false;
  if (sentences.some(sentence => isRoleSentence(sentence, jobTitle))) return false;
  // Pure marketing: majority of sentences look like tourism/city pitch.
  const tourismHits = sentences.filter(isTourismSentence).length;
  return tourismHits > 0 && tourismHits >= Math.ceil(sentences.length * 0.5);
}

function removeLeadInSentences(paragraph: string, jobTitle: string): string {
  const sentences = splitSentences(paragraph);
  if (sentences.length === 0) return paragraph.trim();

  // Prefer cutting to the first sentence that names the role.
  const titleIndex = sentences.findIndex(sentence => sentenceMentionsTitle(sentence, jobTitle));
  let start = 0;
  if (titleIndex > 0) {
    start = titleIndex;
  } else if (titleIndex < 0) {
    // Title never appears (AI synonym / wrong title): drop leading city-tourism
    // sentences until a role-like sentence appears.
    while (start < sentences.length && isTourismSentence(sentences[start])) start += 1;
    if (start >= sentences.length) return paragraph.trim();
  }

  const result = sentences.slice(start).join(' ');
  return result
    .replace(/^(your opportunity|the opportunity|about the (role|position)|what you(?:'|’)ll do)\s*:?[\s-]*/i, '')
    .trim();
}

/**
 * Remove employer/facility/city-tourism boilerplate from an Overview without
 * asking the AI to parse the job again.
 */
export function cleanOverviewBoilerplate(overview: string, jobTitle: string): string {
  const paragraphs = overview
    .trim()
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return overview.trim();

  // Drop whole leading paragraphs that are pure city/employer tourism, even
  // when the job title never appears in a later paragraph (title mismatch).
  let firstKeep = 0;
  while (firstKeep < paragraphs.length && isTourismParagraph(paragraphs[firstKeep], jobTitle)) {
    firstKeep += 1;
  }
  // Prefer the paragraph that names the title when present.
  const core = titleCore(jobTitle);
  if (core.length >= 4) {
    const titleIndex = paragraphs.findIndex(paragraph =>
      paragraph.toLocaleLowerCase().includes(core.toLocaleLowerCase())
      || paragraph.toLocaleLowerCase().includes((core.split(/[,–—-]/)[0] ?? '').toLocaleLowerCase())
    );
    if (titleIndex > firstKeep) firstKeep = titleIndex;
  }

  if (firstKeep >= paragraphs.length) {
    // Everything looked like tourism — try sentence-level rescue on the last para.
    const rescued = removeLeadInSentences(paragraphs[paragraphs.length - 1], jobTitle);
    return rescued || overview.trim();
  }

  let kept = paragraphs.slice(firstKeep);
  kept[0] = removeLeadInSentences(kept[0], jobTitle);
  kept = kept
    .map((paragraph, index) => (index === 0 ? paragraph : removeLeadInSentences(paragraph, jobTitle)))
    .filter(paragraph => paragraph.trim())
    .filter(paragraph =>
      !/^(your opportunity|the opportunity|about the (role|position)|what you(?:'|’)ll do)\s*:?[.!]?$/i.test(paragraph)
    )
    // Drop any remaining pure-tourism paragraphs after the cut.
    .filter(paragraph => !isTourismParagraph(paragraph, jobTitle));

  const result = kept.join('\n\n').trim();
  if (!result || sentenceCount(result) === 0) return overview.trim();
  return result;
}

export function cleanDescriptionOverviews(description: string, jobTitle: string): string {
  const sections = description.split(/(?=^##\s+)/m);
  return sections.map(section => {
    if (!/^##\s+Overview\s*$/im.test(section.split('\n', 1)[0] || '')) return section;
    const lines = section.split('\n');
    const heading = lines.shift() || '';
    return `${heading}\n\n${cleanOverviewBoilerplate(lines.join('\n'), jobTitle)}`;
  }).join('').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeListItem(value: string): string {
  return value
    .replace(/^\s*[-•]\s+/, '')
    .replace(/[.;:,]+$/g, '')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function removeBoilerplate(body: string): string {
  return body
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph
      .split('\n')
      .filter(line => {
        const normalized = line.replace(/^\s*[-•]\s*/, '').trim();
        return !SOCIAL_BOILERPLATE.test(normalized) && !NAVIGATION_BOILERPLATE.test(normalized);
      })
      .join('\n')
      .trim())
    .filter(Boolean)
    .filter(paragraph => !GENERIC_EQUITY_BOILERPLATE.test(paragraph))
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function deduplicateBullets(body: string): string {
  const seen = new Set<string>();
  return body
    .split('\n')
    .filter(line => {
      if (!/^\s*[-•]\s+/.test(line)) return true;
      const key = normalizeListItem(line);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removePlaceholderSectionBody(body: string): string {
  const lines = body
    .split('\n')
    .map(line => line.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);
  return lines.length === 0 || lines.every(line => EMPTY_SECTION_LINE.test(line)) ? '' : body;
}

export function removePlaceholderSections(description: string): string {
  const sections = description.split(/(?=^##\s+)/m);
  return sections
    .map(section => {
      const lines = section.split('\n');
      const heading = lines[0]?.match(/^##\s+(.+)$/)?.[1]?.trim() || '';
      if (!heading) return section.trim();
      const body = removePlaceholderSectionBody(lines.slice(1).join('\n'));
      return body.trim() ? `## ${heading}\n${body.trim()}` : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Drop Compensation/Benefits/Salary sections that only restate pay (and maybe a
 * generic "benefits package" line) already shown in structured sidebar fields.
 * Keep unique pay (bonuses, premiums) and itemized benefit lists.
 */
export function isRedundantCompensationSection(heading: string, body: string): boolean {
  if (!/compensation|benefit|salary|pay\b|remuneration/i.test(heading)) return false;
  let text = body.replace(/\s+/g, ' ').trim();
  if (!text) return true;

  // Unique pay beyond base salary — keep. Bare "performance bonus" as a package
  // name is NOT unique (CMHC lists it in structured benefits too); require $/%.
  if (/\b(?:bilingual(?:ism)?\s+bonus|northern\s+allowance|shift\s+premium|market\s+(?:modifier|premium|adjustment)|overtime\s+rate|standby|isolation\s+pay)\b/i.test(text)) {
    return false;
  }
  // Only keep when the bonus itself is quantified (not merely a $ salary elsewhere in the section).
  if (/\bperformance\s+bonus\b.{0,24}(?:\$[\d,]|\d+\s*%|\d+\s*percent)|(?:\$[\d,]|\d+\s*%|\d+\s*percent).{0,24}\bperformance\s+bonus\b/i.test(text)) {
    return false;
  }

  // Strip generic package noise (not unique benefit detail).
  text = text
    .replace(/,?\s*(?:the\s+position\s+includes|includes|plus|with)\s+(?:the\s+)?(?:federal\s+government\s+)?benefits?(?:\s+and\s+pension)?(?:\s+package)?(?:\s*\([^)]{0,100}\))?\.?/gi, ' ')
    .replace(/\b(?:federal\s+government\s+)?benefits?\s+and\s+pension\s+package\.?/gi, ' ')
    .replace(/\b(?:competitive|comprehensive|excellent|standard|generous)\s+(?:employer[- ]paid\s+)?(?:extended\s+health\s+)?benefits?(?:\s+package)?\.?/gi, ' ')
    .replace(/,?\s*plus\s+benefits?\s*\([^)]{0,100}\)\.?/gi, ' ')
    .replace(/,?\s*plus\s+benefits?\.?/gi, ' ')
    .replace(/,?\s*plus\s+applicable\s+premiums?\.?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.,;:\s]+|[.,;:\s]+$/g, '');

  if (!text) return true;

  const money = String.raw`\$?[\d,]+(?:\.\d{1,4})?`;
  const period = String.raw`(?:per\s+)?(?:hour|hr|year|yr|annum|annual(?:ly)?|\/per\s+hour)?`;
  const salaryLine = new RegExp(
    String.raw`^(?:(?:annual\s+|yearly\s+|hourly\s+)?salary(?:\s+range)?|pay(?:\s+rate)?|rate(?:\s+of\s+pay)?|wage|compensation|yearly\s+salary|hourly(?:\s+(?:pay\s+)?rate)?|from|starting\s+at)\s*:?\s*${money}\s*(?:to|[-–—])\s*${money}\s*${period}(?:\s*\([^)]*\))?(?:\s+as\s+per\s+the\s+collective\s+agreement)?(?:\s+plus\s+applicable\s+premiums?)?\.?$`,
    'i',
  );
  const bareRange = new RegExp(
    String.raw`^${money}\s*(?:to|[-–—])\s*${money}\s*${period}(?:\s*\([^)]*\))?\.?$`,
    'i',
  );
  const fromRange = new RegExp(
    String.raw`^from\s+${money}\s+to\s+${money}\s*${period}\.?$`,
    'i',
  );
  const singleRate = new RegExp(
    String.raw`^(?:starting\s+at\s+)?${money}\s*(?:per\s+)?(?:hour|hr|year|yr|annum)?(?:\s*,?\s*plus\s+\d+%\s+vacation\s+pay)?\.?$`,
    'i',
  );
  if (salaryLine.test(text) || bareRange.test(text) || fromRange.test(text) || singleRate.test(text)) return true;

  const lines = body.split('\n').map(line => {
    let t = line.replace(/^\s*[-•*]\s*/, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
    t = t
      .replace(/\b(?:the\s+position\s+includes|includes|plus|with)\s+(?:the\s+)?(?:federal\s+government\s+)?benefits?(?:\s+and\s+pension)?(?:\s+package)?\.?/gi, ' ')
      .replace(/\bplus\s+benefits?\s*\([^)]{0,80}\)\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[.,;:\s]+|[.,;:\s]+$/g, '');
    return t;
  }).filter(Boolean);

  const isSalaryRestatement = (line: string) =>
    salaryLine.test(line) || bareRange.test(line) || fromRange.test(line) || singleRate.test(line)
    || /^(?:salary|pay|rate|wage|annual\s+salary|yearly\s+salary|hourly)\b.*\$[\d,]+/i.test(line);

  // Standard package names already stored as structured benefits (CMHC et al.).
  const isPackageBenefitRestatement = (line: string) => {
    const rest = line
      .replace(/\b(?:accrued\s+vacation|annual\s+paid\s+vacation|annual\s+(?:individual\s+)?performance\s+(?:bonus|incentive)|group\s+insurance(?:\s+coverage)?|training(?:\s+and\s+mentorship)?|mentorship|inclusive\s+workplace(?:\s+culture)?(?:\s+and\s+environment)?|defined\s+benefit\s+pension(?:\s+plan)?|comprehensive\s+group\s+insurance(?:\s+plan)?|from\s+day\s+one|to\s+support\s+your\s+well-being|support\s+towards\s+your\s+personal\s+and\s+professional\s+growth(?:\s+with\s+training(?:,\s*mentorship)?(?:\s+and\s+more)?)?|an\s+inclusive\s+workplace\s+culture(?:\s+and\s+environment)?)\b/gi, ' ')
      .replace(/[.,;:&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return rest.length < 4;
  };

  if (lines.length > 0 && lines.every(line => isSalaryRestatement(line) || isPackageBenefitRestatement(line))) {
    return true;
  }

  if (/\$[\d,]+/.test(text) && /(?:salary|pay|rate|wage|compensation|range|annum|annual)/i.test(text)) {
    const withoutSalary = text
      .replace(/(?:(?:annual\s+|yearly\s+|hourly\s+)?salary(?:\s+range)?|pay(?:\s+rate)?|rate(?:\s+of\s+pay)?|wage|compensation|from|starting\s+at)\s*:?\s*\$?[\d,]+(?:\.\d+)?\s*(?:to|[-–—])\s*\$?[\d,]+(?:\.\d+)?\s*(?:per\s+)?(?:year|yr|annum|hour|hr)?\.?/gi, ' ')
      .replace(/\$[\d,]+(?:\.\d+)?\s*(?:to|[-–—])\s*\$[\d,]+(?:\.\d+)?\s*(?:per\s+)?(?:year|yr|annum|hour|hr)?\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!withoutSalary || isPackageBenefitRestatement(withoutSalary)) return true;
  }

  const hasItemizedBenefits = /\b(?:\d+%\s*employer|employer-paid|sick\s+leave|wellness\s+allowance|\$\d+\s+for|paramedical|health care spending|telus virtual|weeks?\s+vacation|om\s*ers)\b/i.test(body)
    || (/(?:^|\n)\s*[-•*]\s+/.test(body)
      && /\b(?:health|dental|pension|paramedical|wellness)\b/i.test(body)
      && body.split('\n').filter(l => /^\s*[-•*]/.test(l)).length >= 2
      && !lines.every(line => isSalaryRestatement(line) || isPackageBenefitRestatement(line)));

  if (!hasItemizedBenefits
    && /\$[\d,]+/.test(text)
    && /(?:salary|pay|rate|wage|compensation|range|annum|annual)/i.test(text)
    && text.length < 400) {
    return true;
  }

  return false;
}

/**
 * Deterministic cleanup for stored and newly parsed Markdown descriptions.
 * It removes only recognizable portal/employer boilerplate and exact repeated
 * bullets; it does not summarize or invent content.
 */
export function cleanJobDescription(description: string, jobTitle: string, source = ''): string {
  if (!description.trim()) return description.trim();

  const sourceCleaned = cleanSourceDescriptionBoilerplate(source, description)
    // Canonical product name: WordPress is one word.
    .replace(/\bWord\s+Press\b/gi, 'WordPress');
  const sections = sourceCleaned
    .split(/(?=^##\s+)/m)
    .map(chunk => {
      const lines = chunk.split('\n');
      const heading = lines[0]?.match(/^##\s+(.+)$/)?.[1]?.trim() || '';
      const body = heading ? lines.slice(1).join('\n') : chunk;
      return { heading, body };
    })
    .map(section => ({
      ...section,
      body: removePlaceholderSectionBody(deduplicateBullets(removeBoilerplate(section.heading.toLocaleLowerCase() === 'overview'
        ? cleanOverviewBoilerplate(removeBoilerplate(section.body), jobTitle)
        : removeBoilerplate(section.body)))),
    }))
    // Salary already lives in structured fields / sidebar — drop pure restatements.
    .filter(section => !section.heading || !isRedundantCompensationSection(section.heading, section.body));

  const cleaned = sections
    .filter(section => !section.heading || section.body.trim())
    .map(section => section.heading ? `## ${section.heading}\n${section.body.trim()}` : section.body.trim())
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Preserve the original representation when the only difference is
  // whitespace around headings or paragraphs. Backfills should record actual
  // content changes, not rewrite every stored Markdown row.
  return cleaned.replace(/\s+/g, ' ').trim() === description.replace(/\s+/g, ' ').trim()
    ? description
    : cleaned;
}
