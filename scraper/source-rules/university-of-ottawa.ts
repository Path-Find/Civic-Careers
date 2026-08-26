/** Rules that apply only to the University of Ottawa Workday source. */

export type OttawaDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Recurring Ottawa portal/legal blocks safe to remove from stored prose. */
export const UNIVERSITY_OF_OTTAWA_DESCRIPTION_RULES: OttawaDescriptionRule[] = [
  { name: 'uottawa-similar-jobs-footer', pattern: /Similar Jobs\s*\(\d+\)[\s\S]*$/i, mode: 'suffix' },
  { name: 'uottawa-follow-us-footer', pattern: /Follow Us\s*Policy 90[\s\S]*$/i, mode: 'suffix' },
  { name: 'uottawa-equity-accommodation-footer', pattern: /The University of Ottawa is committed to ensuring equity, diversity, and inclusion[\s\S]*$/i, mode: 'suffix' },
  { name: 'uottawa-covid-policy-footer', pattern: /Prior to May 1, 2022, the University required all students[\s\S]*$/i, mode: 'suffix' },
  { name: 'uottawa-academic-careers-application-footer', pattern: /(?:^|\s)Further details about academic careers can be found online\.[\s\S]*$/i, mode: 'suffix' },
  { name: 'uottawa-training-footer', pattern: /(?:^|\s)The University of Ottawa employees? (?:are|required to|must)[\s\S]*$/i, mode: 'suffix' },
];

/** Boundaries used by Ottawa faculty postings with flattened Workday text. */
export const OTTAWA_FACULTY_DESCRIPTION_BOUNDARIES = {
  header: /applications\s+must\s+be\s+received\s+before\s*\([^)]*\)\s*:/i,
  title: /position\s+title\s*:/i,
  duties: /\bduties\s*:/i,
  dutiesEnd: /(?:terms\s*:|rank\s+and\s+salary\s*:|salary\s*:|benefits\s+package\s*:|location\s+of\s+work\s*:)/i,
  qualifications: /\brequired\s+qualifications\s*:/i,
  qualificationsEnd: /(?:deadline\s*:|application\s+package\s*:|applications?\s+must\s+be\s+received)/i,
} as const;

export function isOttawaFacultyCapture(text: string): boolean {
  return OTTAWA_FACULTY_DESCRIPTION_BOUNDARIES.header.test(text)
    && OTTAWA_FACULTY_DESCRIPTION_BOUNDARIES.duties.test(text)
    && OTTAWA_FACULTY_DESCRIPTION_BOUNDARIES.qualifications.test(text);
}
