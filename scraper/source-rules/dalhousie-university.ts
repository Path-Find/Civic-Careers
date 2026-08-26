/** Rules that apply only to Dalhousie University captures. */

export type DalhousieDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated PeopleAdmin institutional and application boilerplate. */
export const DALHOUSIE_DESCRIPTION_RULES: DalhousieDescriptionRule[] = [
  {
    name: 'dalhousie-diversity-statement',
    pattern: /Diversity Statement\s*Dalhousie University commits to achieving inclusive excellence through continually championing equity, diversity, inclusion, and accessibility\.?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'dalhousie-equity-application-statement',
    pattern: /The university encourages applications from Indigenous Peoples of Turtle Island \(especially Mi[’']kmaq\), persons of Black\/African descent \(especially African Nova Scotians\), and members of other racialized groups, persons with disabilities, women, persons identifying as members of 2SLGBTQIA\+ communities, and all candidates who would contribute to the diversity of our community\.?\s*In accordance with our Employment Equity Policy, preference will be given in hiring processes to candidates who self-identify as members of one or more of the equity-deserving groups listed above\.?\s*(?:For more information, including details related to our Employment Equity Policy and Plan and definitions of equity-deserving groups please (?:review our Employment Equity information|visit www\.dal\.ca\/hiringfordiversity)\.?\s*)?/gi,
    mode: 'inline',
  },
  {
    name: 'dalhousie-accommodation-statement',
    pattern: /Dalhousie University is committed to ensuring all candidates have full, fair, and equitable participation in the hiring process\.?\s*If you require any support for the purpose of accommodation, such as technical aids or alternative arrangements, please let us know of these needs and how we can be of assistance\.?\s*/gi,
    mode: 'inline',
  },
  {
    name: 'dalhousie-peopleadmin-documents-footer',
    pattern: /Documents Needed to Apply\s*Required Documents\s*Résumé\s*\/\s*Curriculum Vitae \(CV\)\s*Optional Documents\s*Cover Letter\s*To ensure the security of your data, you will be logged out due to inactivity in 3 minutes at\s*\.?\s*Any data not saved will be lost\.\s*Click ['’]?OK['’]? to keep your session active\.?\s*/gi,
    mode: 'inline',
  },
];
