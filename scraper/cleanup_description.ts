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
 * Deterministic cleanup for stored and newly parsed Markdown descriptions.
 * It removes only recognizable portal/employer boilerplate and exact repeated
 * bullets; it does not summarize or invent content.
 */
export function cleanJobDescription(description: string, jobTitle: string, source = ''): string {
  if (!description.trim()) return description.trim();

  const sourceCleaned = cleanSourceDescriptionBoilerplate(source, description);
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
    }));

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
