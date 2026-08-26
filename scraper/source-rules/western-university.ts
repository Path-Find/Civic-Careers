/** Rules that apply only to Western University captures. */

export type WesternUniversityDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated institutional copy confirmed across Western postings. */
export const WESTERN_UNIVERSITY_DESCRIPTION_RULES: WesternUniversityDescriptionRule[] = [
  {
    name: 'western-values-diversity-footer',
    pattern: /Western Values Diversity\s+The University invites applications from all qualified individuals\.?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'western-equity-accommodation-footer',
    pattern: /Western is committed to employment equity and diversity in the workplace and welcomes applications from women, members of racialized groups\/visible minorities, Indigenous persons, persons with disabilities, persons of any sexual orientation, and persons of any gender identity or gender expression\.?\s*Accommodations are available for applicants with disabilities throughout the recruitment process\.?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'western-accommodation-contact-footer',
    pattern: /If you require accommodations for interviews or other meetings, please contact Human Resources or phone 519-661-2194\.?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'western-employer-pitch',
    pattern: /Western offers a broad and exciting variety of part-time and temporary employment opportunities with ample room for job exploration and growth\.?\s*Within our beautiful campus, you are part of a progressive work environment that promotes work\/life balance including access to our state-of-the-art recreation centre\.?\s*Apply for an opportunity to be part of the Western community and contribute to its success!?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'western-thank-you-footer',
    pattern: /We thank all applicants for their interest; however, only those chosen for an interview will be contacted\.?\s*/gi,
    mode: 'inline',
  },
];
