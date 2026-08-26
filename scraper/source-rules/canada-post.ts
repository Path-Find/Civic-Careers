/** Rules that apply only to Canada Post captures. */

export type CanadaPostDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated SuccessFactors employer, consent, and portal text. */
export const CANADA_POST_DESCRIPTION_RULES: CanadaPostDescriptionRule[] = [
  { name: 'canada-post-similar-jobs-footer', pattern: /Find similar jobs:\s*Postal office,\s*Canada Post:\s*All Current Opportunities[\s\S]*$/i, mode: 'suffix' },
  { name: 'canada-post-cookie-consent-footer', pattern: /Because we respect your right to privacy, you can choose not to allow some types of cookies\.[\s\S]*$/i, mode: 'suffix' },
  { name: 'canada-post-values-heading', pattern: /Canada Post[’']s values and behaviours\s+/gi, mode: 'inline' },
  { name: 'canada-post-our-values-block', pattern: /Our Values\s*-\s*Trust, Respect and Deliver represent our fundamental promise to ourselves, our expectations of one and another and our shared duty to our country\.?\s*/gi, mode: 'inline' },
  { name: 'canada-post-values-detail', pattern: /Our behaviours\s*[–-]\s*Make the call, Know the destination, Deliver for others, Ignite our pride; embody our values, bringing them to life and guiding our actions\.?\s*/gi, mode: 'inline' },
  { name: 'canada-post-values-closing', pattern: /We[’']re committed to living these values and practicing these behaviours every day\.?\s*/gi, mode: 'inline' },
  { name: 'canada-post-values-link', pattern: /Learn more about the values and behaviours by visiting the Canada Post website\.?\s*/gi, mode: 'inline' },
  { name: 'canada-post-accessibility-policy', pattern: /Accessibility Canada Post is committed to fostering an equitable, respectful, and caring workplace[\s\S]*?(?=Employment Equity|$)/i, mode: 'inline' },
  { name: 'canada-post-employment-equity-policy', pattern: /Employment Equity Canada Post is committed to creating a safe workplace that embraces and celebrates everyone\.[\s\S]*?(?=Because we respect your right to privacy|$)/i, mode: 'inline' },
  { name: 'canada-post-preference-policy', pattern: /All qualified candidates will be considered however preference will be given to Indigenous People \(First Nations, Metis or Inuit\) or Persons with disabilities\.[\s\S]*?must self-identify\.?\s*/i, mode: 'inline' },
  { name: 'canada-post-disability-definition', pattern: /Disability is defined as a persistent or episodic physical, sensory, or mental health condition[\s\S]*?impact vision, hearing, mobility, flexibility, dexterity, pain, learning, developmental, mental\/psychological, and memory\.?\s*/i, mode: 'inline' },
  { name: 'canada-post-accommodation-policy', pattern: /If you are contacted regarding a job opportunity, please advise if you require an accommodation\.?\s*|All information received in relation to accommodation will be kept confidential\.?\s*/gi, mode: 'inline' },
];
