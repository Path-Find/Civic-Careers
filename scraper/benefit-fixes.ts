/**
 * Source-specific corrections confirmed during the 25-listing benefits QA.
 * These keep concrete benefits that the captured posting states while removing
 * duplicate generic pension labels and non-benefit development/work-arrangement labels.
 */
export const BENEFIT_OVERRIDES: Record<string, string[]> = {
  'Full-time-Administrative-Assistant-to-the-Dean--School-of-Wellness--Public-Safety-and-Community-Studies_R176141-1': [
    'Health Insurance', 'Dental Insurance', 'Tuition Assistance', 'CAAT Pension Plan',
  ],
  '1291398947': [
    'Health Insurance', 'Dental Insurance', 'Public Service Pension Plan',
    'Fitness Centre Membership', 'Employee Assistance Program', 'Employee Bus Pass', 'Wellness',
  ],
  'peopleadmin_careers_bcit_ca_10467': [
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'Executive-Assistant--HRE_JR-1025079': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Pension', 'Tuition Waiver', 'Vacation',
  ],
  '16bc0eb6ca2b': [
    'Employee Assistance Program', 'Vacation', 'OMERS',
  ],
  'neogov_120830': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vision Care', 'Life Insurance',
    'AD&D Insurance', 'Disability Insurance', 'Hearing Care', 'Vacation', 'Tuition Assistance',
    'Fitness Membership',
  ],
  'belleville_BNBPmLTMu2': ['Health Insurance', 'OMERS'],
  'cornwall_79976': [
    'Employee Assistance Program', 'Free Parking', 'OMERS', 'Mobile Phone Discount',
  ],
  '4262': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Paid Personal Days',
    'Health Spending Account', 'Employee Assistance Program', 'Parental Leave Top Up', 'OMERS',
  ],
  '3067': [
    'Health Insurance', 'Dental Insurance', 'Disability Insurance', 'Education Reimbursement', 'OMERS',
  ],
  'nanaimo_26_91': ['Vacation'],
  'northbay_f51280ce715f': [
    'Employee Assistance Program', 'Health Insurance', 'Dental Insurance', 'Life Insurance',
    'Disability Insurance', 'AD&D Insurance', 'OMERS', 'Tool Allowance',
  ],
  'J0726-0267': ['Health Insurance', 'Dental Insurance', 'OMERS'],
  '1290201447': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Tool Allowance',
    'Paid Uniforms', 'Employee Assistance Program', 'Mental Health Support',
  ],
  '1291390647': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Tool Allowance',
    'Paid Uniforms', 'Employee Assistance Program', 'Mental Health Support',
  ],
  'pickering_7fb264eecf61': ['OMERS'],
};
