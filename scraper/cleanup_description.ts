const SECTION_HEADER = /^##\s+/;

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
