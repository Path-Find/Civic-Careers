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

function removeLeadInSentences(paragraph: string, jobTitle: string): string {
  const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  const titleLower = titleCore(jobTitle).toLocaleLowerCase();
  const roleSentence = sentences.findIndex(sentence =>
    sentence.toLocaleLowerCase().includes(titleLower)
  );
  const result = roleSentence > 0 ? sentences.slice(roleSentence).join(' ') : paragraph;
  return result.replace(/^(your opportunity|the opportunity|about the (role|position)|what you(?:'|’)ll do)\s*:?[\s-]*/i, '').trim();
}

/**
 * Remove employer/facility boilerplate from an existing Overview without
 * asking the AI to parse the job again. The cut is deliberately paragraph
 * based: a paragraph containing the trusted title is kept intact so names,
 * credentials, and lead-in phrases are not cut mid-sentence.
 */
export function cleanOverviewBoilerplate(overview: string, jobTitle: string): string {
  const paragraphs = overview
    .trim()
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  const core = titleCore(jobTitle);
  if (core.length < 4) return overview.trim();

  if (paragraphs.length === 1) {
    return removeLeadInSentences(paragraphs[0], jobTitle);
  }

  const roleIndex = paragraphs.findIndex(paragraph =>
    paragraph.toLocaleLowerCase().includes(core.toLocaleLowerCase())
  );
  if (roleIndex <= 0) return overview.trim();

  let kept = paragraphs.slice(roleIndex);
  kept[0] = removeLeadInSentences(kept[0], jobTitle);

  // A few feeds emit a standalone marketing label immediately before the
  // actual role paragraph. It has no content and should not survive cleanup.
  kept = kept.filter(paragraph =>
    !/^(your opportunity|the opportunity|about the (role|position)|what you(?:'|’)ll do)\s*:?[.!]?$/i.test(paragraph)
  );

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
