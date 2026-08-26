/** Rules that apply only to UBC captures. */

export type UbcDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated institutional introduction confirmed in UBC job descriptions. */
export const UBC_DESCRIPTION_RULES: UbcDescriptionRule[] = [
  {
    name: 'ubc-institutional-introduction',
    pattern: /The University of British Columbia is a global centre for research and teaching, consistently ranked among the top 20 public universities in the world\.?\s*Since 1915, UBC[’']s entrepreneurial spirit has embraced innovation and challenged the status quo\.?\s*UBC encourages its students, staff and faculty to challenge convention, lead discovery and explore new ways of learning\.?\s*At UBC, bold thinking is given a place to develop into ideas that can change the world\.?\s*/gi,
    mode: 'inline',
  },
];
