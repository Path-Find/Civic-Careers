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
  if (cleaned.length < 40) return null;
  if (/^(?:include|as required|of the position|will include|compatible with|in operations|our people)\b/i.test(cleaned)) return null;
  if (/skip to main|search jobs|sign in|new user|previous job|next job|add to favorite|email this job|apply for job|select how often|no results to display|about western since|about the university|access full position posting|the university welcomes applications/i.test(cleaned)) return null;
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
export function formatCapturedDescription(rawText: string, title?: string): string | null {
  const existing = formatWorkdayFallbackDescription(rawText);
  if (existing && isSafeFallbackDescription(existing)) return existing;

  const text = rawText.replace(/\u00a0/g, ' ').trim();
  if (text.length < 300) return null;

  // Some GC Jobs career-pool postings contain only a concise opening summary
  // followed by structured fields. Keep that source text as a small overview
  // instead of leaving a valid posting without a details record.
  const gcPoolSummary = text.match(/((?:Several|Multiple)\s+[^\n]{20,180}?)(?=\s+Group\s+and\s+level\b)/i)?.[1]?.trim();
  if (gcPoolSummary) return `## Overview\n${gcPoolSummary}`;

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
  if (rendered && isSafeFallbackDescription(rendered)) return rendered;

  return formatGenericRoleCapture(rawText, title);
}

const GENERIC_FOOTER = /(?:about\s+us\s*:|find\s+similar\s+jobs:|apply\s+now\s*»|previous\s*next|add\s+to\s+my\s+favorites|send\s+by\s+email|the\s+search\s+committee\s+would\s+like\s+to\s+thank|only\s+those\s+(?:candidates|chosen)\s+for\s+an\s+interview|thank\s+you\s+for\s+your\s+interest|follow\s+us©|#li-dni|legal\s+disclaimer|accessibility\s+statement|©\s*20\d{2})/i;
const GENERIC_RESPONSIBILITIES = /(?:what\s+you\s+will\s+do(?:\s+in\s+this\s+role)?|what\s+you['’]ll\s+do|the\s+work\s+you\s+will\s+be\s+involved\s+in|job\s+duties\s+include|duties\s*(?:-|:)|responsibilities\s*(?:-|:)|position\s+highlights|what\s+this\s+position\s+is\s+about|au\s+sujet\s+de\s+cet\s+emploi|à\s+titre\s+d['’]agent|purpose\s+of\s+your\s+position\s*-\s*non\s+union)/i;
const GENERIC_QUALIFICATIONS = /(?:what\s+we\s+are\s+looking\s+for|what\s+you\s+need|position\s+requirements|qualifications?\s*(?:-|:)|selection\s+criteria|à\s+votre\s+sujet|essential\s+qualifications?|job\s+requirements|education\s*(?:-|:)|the\s+successful\s+candidate\s+will|what\s+we\s+are\s+looking\s+for)/i;

function genericText(rawText: string): string {
  return rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:cookie|consent|provider description|search by keyword|select how often)[^:]{0,240}(?:accept|close|create alert|enabled)/gi, ' ')
    .trim();
}

function formatGenericRoleCapture(rawText: string, title?: string): string | null {
  const text = genericText(rawText);
  if (text.length < 300) return null;

  let body = text;
  if (title) {
    const titleNeedle = title.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleMatches = [...text.matchAll(new RegExp(titleNeedle, 'ig'))];
    const candidate = titleMatches.find(match => /(?:description|position|reference\s+number|posted|apply|job\s+details)/i.test(text.slice(match.index ?? 0, (match.index ?? 0) + 450)))
      ?? titleMatches.at(-1);
    if (candidate?.index != null) body = text.slice(candidate.index + candidate[0].length);
  }

  // These boards expose stable role-content markers but also prepend a large
  // amount of portal navigation. Prefer the marker over guessing where the
  // description begins.
  const directSections: CapturedSection[] = [];
  const icbcOverview = capturedSection(
    capturedBetween(text, /position\s+highlights\s*/i, /position\s+requirements\s*/i),
    '## Overview',
  );
  const icbcQualifications = capturedSection(
    capturedBetween(text, /position\s+requirements\s*/i, /about\s+us\s*:/i),
    '## Qualifications',
  );
  if (icbcOverview && icbcQualifications) {
    directSections.push(icbcOverview, icbcQualifications);
  }

  const yorkOverview = capturedSection(
    capturedBetween(text, /purpose\s*:/i, /education\s*:/i),
    '## Overview',
  );
  const yorkQualifications = capturedSection(
    capturedBetween(text, /education\s*:/i, /(?:#li-dni|legal\s+disclaimer|accessibility\s+statement|$)/i),
    '## Qualifications',
  );
  if (yorkOverview && yorkQualifications) {
    directSections.push(yorkOverview, yorkQualifications);
  }

  const flemingOverview = capturedSection(
    capturedBetween(text, /what\s+this\s+position\s+is\s+about\s*:?/i, /what\s+we\s+are\s+looking\s+for\s*:?/i),
    '## Overview',
  );
  const flemingQualifications = capturedSection(
    capturedBetween(text, /what\s+we\s+are\s+looking\s+for\s*:?/i, /(?:what\s+we\s+offer|how\s+to\s+apply|application\s+process|about\s+fleming|$)/i),
    '## Qualifications',
  );
  if (flemingOverview && flemingQualifications) {
    directSections.push(flemingOverview, flemingQualifications);
  }

  const careerBeaconDuties = capturedSection(
    capturedBetween(text, /your\s+focus\s*/i, /what\s+you\s+bring/i),
    '## Responsibilities',
  );
  const careerBeaconQualifications = capturedSection(
    capturedBetween(text, /what\s+you\s+bring\s*/i, /(?:work\s+with\s+us|why\s+choose\s+unb|$)/i),
    '## Qualifications',
  );
  if (careerBeaconDuties && careerBeaconQualifications) {
    directSections.push(careerBeaconDuties, careerBeaconQualifications);
  }

  const whitbyStart = /what\s+you\s+will\s+get\s+to\s+do/i.exec(text);
  const whitbyQualificationsStart = /who\s+you\s+are/i.exec(text);
  if (whitbyStart && whitbyQualificationsStart && whitbyQualificationsStart.index! > whitbyStart.index!) {
    const whitbyOverview = capturedSection(
      text.slice(whitbyStart.index! + whitbyStart[0].length, whitbyQualificationsStart.index),
      '## Overview',
    );
    const whitbyQualifications = capturedSection(
      text.slice(whitbyQualificationsStart.index! + whitbyQualificationsStart[0].length),
      '## Qualifications',
    );
    if (whitbyOverview && whitbyQualifications) {
      directSections.push(whitbyOverview, whitbyQualifications);
    }
  }

  const uOttawaDescription = capturedSection(
    capturedBetween(text, /description\s+of\s+tasks\s*\(hours\)\s*:/i, /requirements\s+and\s+nature\s+of\s+work\s*:/i),
    '## Overview',
  );
  const uOttawaRequirements = capturedSection(
    capturedBetween(text, /requirements\s+and\s+nature\s+of\s+work\s*:/i, /all\s+university\s+of\s+ottawa\s+employees/i),
    '## Qualifications',
  );
  if (uOttawaDescription && uOttawaRequirements) {
    directSections.push(uOttawaDescription, uOttawaRequirements);
  }

  const northernResponsibilities = capturedSection(
    capturedBetween(text, /what\s+you\s+will\s+be\s+doing\s*:/i, /what\s+you\s+will\s+need\s+to\s+be\s+considered\s*:/i),
    '## Responsibilities',
  );
  const northernQualifications = capturedSection(
    capturedBetween(text, /what\s+you\s+will\s+need\s+to\s+be\s+considered\s*:/i, /what\s+northern\s+has\s+to\s+offer\s*:/i),
    '## Qualifications',
  );
  if (northernResponsibilities && northernQualifications) {
    directSections.push(northernResponsibilities, northernQualifications);
  }

  const thunderbayMarkers = [...text.matchAll(/job\s+description\s+keep\s+our\s+streets\s+connected\./ig)];
  const thunderbayStart = thunderbayMarkers.at(-1)?.index;
  if (thunderbayStart != null) {
    const thunderbayBody = text.slice(thunderbayStart);
    const thunderbayOverview = capturedSection(
      capturedBetween(thunderbayBody, /keep\s+our\s+streets\s+connected\./i, /where\s+you['’]?ll\s+make\s+a\s+difference/i),
      '## Overview',
    );
    const thunderbayResponsibilities = capturedSection(
      capturedBetween(thunderbayBody, /how\s+you['’]?ll\s+support\s+the\s+team|accountabilities\s*:/i, /what\s+you\s+can\s+count\s+on\s+with\s+us|what\s+you['’]?ll\s+bring/i),
      '## Responsibilities',
    );
    const thunderbayQualifications = capturedSection(
      capturedBetween(thunderbayBody, /what\s+you['’]?ll\s+bring\s+to\s+the\s+team/i, /for\s+a\s+detailed\s+job\s+description|keep\s+our\s+city\s+moving/i),
      '## Qualifications',
    );
    if (thunderbayOverview && thunderbayResponsibilities && thunderbayQualifications) {
      directSections.push(thunderbayOverview, thunderbayResponsibilities, thunderbayQualifications);
    }
  }

  if (title) {
    const titlePattern = title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const westernStart = new RegExp(`the\\s+${titlePattern},?\\s+is\\s+accountable`, 'i');
    const westernMatch = westernStart.exec(text);
    if (westernMatch) {
      const westernBody = text.slice(westernMatch.index ?? 0);
      const westernOverview = capturedSection(
        westernBody.slice(0, westernBody.search(/the\s+ideal\s+candidate/i)),
        '## Overview',
      );
      const westernQualifications = capturedSection(
        capturedBetween(westernBody, /the\s+ideal\s+candidate/i, /salary\s*&\s*benefits|about\s+western/i),
        '## Qualifications',
      );
      if (westernOverview && westernQualifications) {
        directSections.push(westernOverview, westernQualifications);
      }
    }
  }

  if (!directSections.some(section => section.heading === '## Overview')
    && /the\s+director,\s*capital\s+projects,\s+is\s+accountable/i.test(text)) {
    const westernMatch = /the\s+director,\s*capital\s+projects,\s+is\s+accountable/i.exec(text);
    const westernBody = text.slice(westernMatch?.index ?? 0);
    const westernOverview = capturedSection(
      westernBody.slice(0, westernBody.search(/the\s+ideal\s+candidate/i)),
      '## Overview',
    );
    const westernQualifications = capturedSection(
      capturedBetween(westernBody, /the\s+ideal\s+candidate/i, /salary\s*&\s*benefits|about\s+western/i),
      '## Qualifications',
    );
    if (westernOverview && westernQualifications) directSections.push(westernOverview, westernQualifications);
    if (!westernOverview || !westernQualifications) {
      const westernNarrative = capturedSection(
        capturedBetween(text, /the\s+director,\s*capital\s+projects,\s+is\s+accountable/i, /salary\s*&\s*benefits/i),
        '## Overview',
      );
      if (westernNarrative) directSections.push(westernNarrative);
    }
  }

  const directRendered = renderCapturedSections(directSections);
  if (directRendered && isSafeFallbackDescription(directRendered)) return directRendered;

  const descriptionStart = /(?:job\s+description|description\s*:|position\s+description)\s*/i.exec(body);
  if (descriptionStart) body = body.slice(descriptionStart.index + descriptionStart[0].length);

  const footer = GENERIC_FOOTER.exec(body);
  if (footer?.index && footer.index > 220) body = body.slice(0, footer.index);
  body = body.replace(/^(?:next\s+job|apply\s+for\s+job|back\s+share|job\s+details)\s*/i, '').trim();
  if (PORTAL_CHROME.test(body) || /sorry,\s+this\s+posting\s+is\s+no\s+longer\s+available/i.test(body)) return null;

  const sections: CapturedSection[] = [];
  const responsibilities = GENERIC_RESPONSIBILITIES.exec(body);
  const qualifications = GENERIC_QUALIFICATIONS.exec(body);
  if (responsibilities && qualifications && qualifications.index > responsibilities.index!) {
    const overviewBody = body.slice(0, responsibilities.index).trim();
    const responsibilityBody = body.slice(responsibilities.index! + responsibilities[0].length, qualifications.index).trim();
    const qualificationBody = body.slice(qualifications.index! + qualifications[0].length).trim();
    const overview = capturedSection(overviewBody, '## Overview');
    const duties = capturedSection(responsibilityBody, '## Responsibilities');
    const requirements = capturedSection(qualificationBody, '## Qualifications');
    if (overview) sections.push(overview);
    if (duties) sections.push(duties);
    if (requirements) sections.push(requirements);
  } else if (responsibilities) {
    const overview = capturedSection(body.slice(0, responsibilities.index).trim(), '## Overview');
    const duties = capturedSection(body.slice(responsibilities.index! + responsibilities[0].length), '## Responsibilities');
    if (overview) sections.push(overview);
    if (duties) sections.push(duties);
  } else if (qualifications) {
    const overview = capturedSection(body.slice(0, qualifications.index).trim(), '## Overview');
    const requirements = capturedSection(body.slice(qualifications.index! + qualifications[0].length), '## Qualifications');
    if (overview) sections.push(overview);
    if (requirements) sections.push(requirements);
  } else {
    const overview = capturedSection(body, '## Overview');
    if (overview) sections.push(overview);
  }

  const rendered = renderCapturedSections(sections);
  return rendered && isSafeFallbackDescription(rendered) ? rendered : null;
}
