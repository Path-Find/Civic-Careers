/** Rules that apply only to University of Toronto captures. */

export type UniversityOfTorontoDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated Jobs2Web footer and institutional statements, not job content. */
export const UNIVERSITY_OF_TORONTO_DESCRIPTION_RULES: UniversityOfTorontoDescriptionRule[] = [
  {
    name: 'utoronto-jobs2web-footer',
    pattern: /Job Segment:\s*[\s\S]*$/i,
    mode: 'suffix',
  },
  {
    name: 'utoronto-diversity-accessibility-footer',
    pattern: /Diversity Statement\s+The University of Toronto embraces Diversity and is building a culture of belonging[\s\S]*$/i,
    mode: 'suffix',
  },
];
