/** Rules that apply only to Shared Health Manitoba captures. */

export type SharedHealthDescriptionRule = {
  name: string;
  pattern: RegExp;
  mode?: 'paragraph' | 'suffix' | 'inline';
};

/** Repeated SuccessFactors portal/policy text confirmed across current and archived rows. */
export const SHARED_HEALTH_DESCRIPTION_RULES: SharedHealthDescriptionRule[] = [
  { name: 'shared-health-similar-jobs-footer', pattern: /similar jobs:\s*Postes cliniques,\s*Clinical Jobs\s*$/i, mode: 'suffix' },
  { name: 'shared-health-job-segment-footer', pattern: /Job Segment:\s*[\s\S]*$/i, mode: 'suffix' },
  { name: 'shared-health-accommodation-policy', pattern: /Accommodations are available upon request during the assessment and selection process\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-french-accommodation-policy', pattern: /Des accommodements peuvent être faits, à la demande, pendant le processus d’évaluation et de sélection\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-french-application-policy', pattern: /Nous serons heureux de recevoir les candidatures de personnes handicapées\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-disability-application-policy', pattern: /We welcome applications from people with disabilities\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-security-check-policy', pattern: /A security check is considered current if it was obtained no more than six \(6\) months prior to the start of employment\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-indigenous-self-identification', pattern: /Indigenous applicants are encouraged to apply and to voluntarily self-identify as being of Indigenous descent in their cover letter\/application\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-indigenous-workforce-policy', pattern: /Manitoba healthcare employers, in partnership with the Indigenous community, are committed to increasing the representation of Indigenous People within all levels of our workforce\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-multiple-positions-policy', pattern: /Please note that an employee is not permitted to hold two or more positions (?:in Shared Health|across the WRHA legal entity) that combine to equal more than 1\.0 F(?:TE|FT)\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-employment-equity-policy', pattern: /Shared Health values and supports employment equity and workplace diversity and encourages all qualified individuals to apply\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-interview-thanks', pattern: /We thank all applicants but only those selected for an interview will be contacted\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-late-application-policy', pattern: /Any application received after the closing time will not be included in the competition\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-service-charge-policy', pattern: /The successful candidate will be responsible for any service charges incurred\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-skills-assessment-policy', pattern: /Interviewed candidates may be called upon to participate in a skills assessment\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-application-references', pattern: /Please include three work-related references with your job application from persons who are not related to you but have direct knowledge of your current and past work performance\.?\s*/i, mode: 'inline' },
  { name: 'shared-health-apply-instructions', pattern: /Interested candidates should select the ["“]Apply["”] icon below to upload their cover letter, resume and copy of licenses\/certification\.?\s*/i, mode: 'inline' },
];
