/** Rules that apply only to York University captures. */

export type YorkUniversityDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Remove the Cegid/YU Hire controls appended to a captured posting. */
export const YORK_UNIVERSITY_DESCRIPTION_RULES: YorkUniversityDescriptionRule[] = [
  {
    name: 'york-cegid-portal-footer',
    pattern: /#LI-(?:DNI|Onsite)\s+Print Add to my favorites Remove from favorites My favorites\(0\) Send by Email Share Job[\s\S]*$/i,
    mode: 'suffix',
  },
];
