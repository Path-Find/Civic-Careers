/**
 * Turns a rendered Workday page into a readable emergency description when AI
 * parsing is unavailable. This is deliberately conservative; returning null
 * keeps a posting hidden instead of exposing portal chrome as job content.
 */
const WORKDAY_SECTION = /Job Description Summary|Primary Purpose|Organizational Status|Work Performed|Key Accountabilities|Responsibilities|Duties and Responsibilities|Minimum Qualifications|Required Qualifications|Preferred Qualifications|Course Description:|Requirements:|Additional Information and\/or Comments:|About Us/i;
const HEADINGS = /Job Description Summary|Primary Purpose|Organizational Status|Work Performed|Key Accountabilities|Responsibilities|Duties and Responsibilities|Minimum Qualifications|Required Qualifications|Preferred Qualifications|Course Description:|Requirements:|Additional Information and\/or Comments:|About Us/gi;

function sectionHeading(label: string): string | null {
  if (/about us|additional information/i.test(label)) return null;
  if (/minimum|required/i.test(label)) return '## Qualifications';
  if (/preferred/i.test(label)) return '## Nice to Have';
  if (/summary|primary purpose|course description/i.test(label)) return '## Overview';
  if (/requirements/i.test(label)) return '## Qualifications';
  return '## Responsibilities';
}

function cleanBody(value: string): string {
  return value
    .replace(/Interested applicants are encouraged to submit[\s\S]*$/i, '')
    .replace(/At the University of British Columbia,[\s\S]*$/i, '')
    .replace(/Posting limited to:[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s+/g, '\n- ')
    .replace(/\s*•\s*/g, '\n- ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

export function formatWorkdayFallbackDescription(rawText: string): string | null {
  const text = rawText.replace(/\u00a0/g, ' ').trim();
  if (!WORKDAY_SECTION.test(text)) return null;

  const matches = [...text.matchAll(HEADINGS)];
  if (matches.length === 0) return null;
  const sections: string[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[0];
    const heading = sectionHeading(label);
    if (!heading) break;
    const start = (match.index ?? 0) + label.length;
    const end = matches[index + 1]?.index ?? text.length;
    const body = cleanBody(text.slice(start, end));
    if (!body) continue;

    const existing = sections.findIndex(section => section.startsWith(`${heading}\n`));
    if (existing >= 0) sections[existing] += `\n\n${body}`;
    else sections.push(`${heading}\n${body}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : null;
}

type CapturedSection = {
  heading: '## Overview' | '## Responsibilities' | '## Qualifications' | '## Nice to Have' | '## Compensation & Benefits';
  body: string;
};

const SECTION_STOP = /(?:about\s+us|about\s+the\s+company|benefits(?:\s+available)?|what\s+(?:skills|you)\s+(?:&|and)\s+qualifications|what\s+you(?:'|’)ll\s+do|what\s+will\s+(?:i|you)\s+(?:be\s+doing|do)\??|what\s+you\s+need\s+to\s+succeed|your\s+responsibilities(?:\s+will\s+include)?|essential\s+qualifications?|qualifications?(?:\s+and\s+(?:experience|skills))?|physical\s+requirements?|additional\s+information|application\s+process|how\s+to\s+apply|apply\s+(?:now|for\s+job)|interested\s+(?:applicants|candidates)|who\s+we\s+are)/i;

function cleanCapturedBody(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/(?:no\s+job\s+description\s+available|not\s+applicable)/gi, '')
    .replace(/\s*•\s*/g, '\n- ')
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n-\s*$/, '')
    .replace(/^[\s:;,.?\-]+/, '')
    .trim();
}

function capturedSection(body: string, heading: CapturedSection['heading']): CapturedSection | null {
  const cleaned = cleanCapturedBody(body);
  if (cleaned.length < 80) return null;
  if (/^(?:include|as required|of the position|will include|compatible with|in operations|our people)\b/i.test(cleaned)) return null;
  if (/skip to main|search jobs|sign in|new user|previous job|next job|add to favorite|email this job|apply for job|select how often|no results to display|about western since|about the university|access full position posting|the university welcomes applications/i.test(cleaned)) return null;
  if (/^[a-z]/.test(cleaned)) return null;
  return { heading, body: cleaned };
}

function capturedBetween(text: string, start: RegExp, end: RegExp): string {
  const startMatch = start.exec(text);
  if (!startMatch) return '';
  const startAt = (startMatch.index ?? 0) + startMatch[0].length;
  const remainder = text.slice(startAt);
  const endMatch = end.exec(remainder);
  return remainder.slice(0, endMatch?.index ?? remainder.length);
}

function renderCapturedSections(sections: CapturedSection[]): string | null {
  const usable = sections.filter((section, index) => {
    if (!section) return false;
    // The same flattened page can expose a heading more than once in portal
    // chrome. Keep the first useful section of each kind.
    return sections.findIndex(candidate => candidate.heading === section.heading) === index;
  });
  return usable.length > 0 ? usable.map(section => `${section.heading}\n${section.body}`).join('\n\n') : null;
}

const PORTAL_CHROME = /skip to main|search jobs|sign in|new user|previous job|next job|add to favorite|email this job|apply for job|select how often|no results to display|access full position posting|the university welcomes applications|about western since|about the university/i;

function isSafeFallbackDescription(description: string): boolean {
  if (PORTAL_CHROME.test(description)) return false;
  return !description.split(/\n\n/).some(section => {
    const body = section.replace(/^##[^\n]*\n/, '').trim();
    return /^(?:include|as required|of the position|will include|compatible with|in operations|our people)\b/i.test(body);
  });
}

/**
 * Conservative fallbacks for complete non-Workday captures. These are only
 * used when the normal AI parser has not produced details; an unrecognised
 * page remains pending rather than being published as a fake description.
 */
export function formatCapturedDescription(rawText: string): string | null {
  const existing = formatWorkdayFallbackDescription(rawText);
  if (existing && isSafeFallbackDescription(existing)) return existing;

  const text = rawText.replace(/\u00a0/g, ' ').trim();
  if (text.length < 300) return null;

  const sections: CapturedSection[] = [];

  // University of Toronto separates the employer profile from the role copy;
  // handle its three role-specific sections together so generic "Qualifications"
  // text cannot short-circuit the opportunity/responsibilities sections.
  if (/your\s+opportunity\s*:/i.test(text) && /your\s+responsibilities(?:\s+will\s+include)?\s*:/i.test(text)) {
    const opportunity = capturedSection(
      capturedBetween(text, /your\s+opportunity\s*:/i, /your\s+responsibilities(?:\s+will\s+include)?\s*:/i),
      '## Overview',
    );
    if (opportunity) sections.push(opportunity);
    const torontoResponsibilities = capturedSection(
      capturedBetween(text, /your\s+responsibilities(?:\s+will\s+include)?\s*:/i, /essential\s+qualifications?/i),
      '## Responsibilities',
    );
    if (torontoResponsibilities) sections.push(torontoResponsibilities);
    const torontoQualifications = capturedSection(
      capturedBetween(text, /essential\s+qualifications?\s*:?/i, /closing\s+date|employee\s+group|appointment\s+type|application\s+process/i),
      '## Qualifications',
    );
    if (torontoQualifications) sections.push(torontoQualifications);
    const rendered = renderCapturedSections(sections);
    if (rendered && isSafeFallbackDescription(rendered)) return rendered;
  }

  const overview = capturedSection(
    capturedBetween(text, /(?:position\s+(?:overview|summary)|about\s+the\s+role|your\s+opportunity|about\s+the\s+position|the\s+opportunity|job\s+summary)\s*:?/i, SECTION_STOP),
    '## Overview',
  );
  if (overview) sections.push(overview);

  const responsibilities = capturedSection(
    capturedBetween(text, /(?:what\s+you(?:'|’)ll\s+do|what\s+will\s+(?:i|you)\s+(?:be\s+doing|do)|your\s+responsibilities(?:\s+will\s+include)?|primary\s+accountabilities|specific\s+duties\s+include|primary\s+duties\s+include|the\s+successful\s+candidate\s+will\s+be\s+responsible|this\s+position\s+is\s+responsible\s+for|key\s+job\s+duties\s+include|duties\s+will\s+include|responsibilities)\s*:?/i, SECTION_STOP),
    '## Responsibilities',
  );
  if (responsibilities) sections.push(responsibilities);

  const qualifications = capturedSection(
    capturedBetween(text, /(?:what\s+(?:skills|you)\s+(?:&|and)\s+qualifications|what\s+you\s+need\s+to\s+succeed|the\s+successful\s+candidate(?:s)?\s+will\s+(?:possess|demonstrate)|essential\s+qualifications?|qualifications?\s+(?:include|needed)|qualifications?(?:\s+and\s+(?:experience|skills))?|your\s+education\s+and\s+qualifications\s+include|requirements\s+and\s+nature\s+of\s+work|education\s+and\s+experience)\s*:?/i, /(?:benefits(?:\s+available)?|physical\s+requirements?|additional\s+information|application\s+process|how\s+to\s+apply|apply\s+(?:now|for\s+job)|interested\s+(?:applicants|candidates)|about\s+us|closing\s+date|additional\s+information)/i),
    '## Qualifications',
  );
  if (qualifications) sections.push(qualifications);

  const preferred = capturedSection(
    capturedBetween(text, /preferred\s+qualifications?\s*:?/i, /(?:benefits|additional\s+information|application\s+process|how\s+to\s+apply|apply\s+(?:now|for\s+job))/i),
    '## Nice to Have',
  );
  if (preferred) sections.push(preferred);

  // York's PeopleSoft board labels the role narrative as "Purpose" and
  // places it before the education/experience fields.
  if (sections.length === 0) {
    const purpose = capturedSection(
      capturedBetween(text, /(?:posting\s+summary\s+access\s+full\s+position\s+posting)?purpose\s*:?/i, /education\s*:/i),
      '## Overview',
    );
    if (purpose) sections.push(purpose);
  }

  // York's Technomedia board uses a compact Purpose/Education/Experience/Skills
  // layout rather than headings that resemble a narrative job description.
  if (sections.length === 0 && /posting\s+summary[\s\S]{0,80}purpose\s*:/i.test(text)) {
    const purpose = capturedSection(
      capturedBetween(text, /purpose\s*:/i, /education\s*:/i),
      '## Overview',
    );
    if (purpose) sections.push(purpose);
    const yorkQualifications = capturedSection(
      capturedBetween(text, /education\s*:/i, /access\s+full\s+position\s+posting|employees?\s+in\s+the/i),
      '## Qualifications',
    );
    if (yorkQualifications) sections.push(yorkQualifications);
  }

  // Burnaby's Taleo pages put the role narrative between the last-updated
  // marker and Qualifications.
  if (sections.length === 0 && /position\s+description\b/i.test(text) && /last\s+updated\s*:/i.test(text)) {
    const burnabyOverview = capturedSection(
      capturedBetween(text, /last\s+updated\s*:\s*[^A-Za-z]{0,20}/i, /qualifications\s+(?:include|and)\b/i),
      '## Overview',
    );
    if (burnabyOverview) sections.push(burnabyOverview);
    const burnabyQualifications = capturedSection(
      capturedBetween(text, /qualifications\s+(?:include|and)\b/i, /(?:additional\s+information|please\s+note|the\s+closing\s+date|copies\s+of\s+relevant)/i),
      '## Qualifications',
    );
    if (burnabyQualifications) sections.push(burnabyQualifications);
  }

  // VIA uses question-style labels for its duties and requirements.
  if (sections.length === 0 && /what\s+are\s+the\s+duties\s+of/i.test(text)) {
    const viaResponsibilities = capturedSection(
      capturedBetween(text, /what\s+are\s+the\s+duties\s+of[^?]*\??/i, /schedule\b/i),
      '## Responsibilities',
    );
    if (viaResponsibilities) sections.push(viaResponsibilities);
    const viaQualifications = capturedSection(
      capturedBetween(text, /what\s+are\s+the\s+requirements\s+for\s+this\s+position\??/i, /applying\s+for\s+transportation\s+security/i),
      '## Qualifications',
    );
    if (viaQualifications) sections.push(viaQualifications);
  }

  // Government of Canada/CFMWS pages have a distinct all-caps role and
  // qualifications boundary, with employer benefits after the requirements.
  if (sections.length === 0 && /qualifications\s+needed/i.test(text)) {
    const role = capturedSection(
      capturedBetween(text, /the\s+role\s*:?/i, /qualifications\s+needed/i),
      '## Overview',
    );
    if (role) sections.push(role);
    const needed = capturedSection(
      capturedBetween(text, /qualifications\s+needed\s*:?/i, /benefits\s+available|language\s+requirements/i),
      '## Qualifications',
    );
    if (needed) sections.push(needed);
  }

  const rendered = renderCapturedSections(sections);
  return rendered && isSafeFallbackDescription(rendered) ? rendered : null;
}
