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
