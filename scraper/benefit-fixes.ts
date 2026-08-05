/**
 * Source-specific corrections confirmed during benefits QA.
 * These keep concrete benefits that the captured posting states while removing
 * duplicate generic pension labels and non-benefit development/work-arrangement labels.
 */
export const BENEFIT_OVERRIDES: Record<string, string[]> = {
  'peopleadmin_careers_bcit_ca_10581': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Health Spending Account',
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'Full-time-Administrative-Assistant-to-the-Dean--School-of-Wellness--Public-Safety-and-Community-Studies_R176141-1': [
    'Health Insurance', 'Dental Insurance', 'Tuition Assistance', 'CAAT Pension Plan',
  ],
  '1291398947': [
    'Health Insurance', 'Dental Insurance', 'Public Service Pension Plan',
    'Fitness Centre Membership', 'Employee Assistance Program', 'Employee Bus Pass', 'Wellness',
  ],
  '1291394147': [
    'Health Insurance', 'Dental Insurance', 'Public Service Pension Plan',
    'Fitness Centre Membership', 'Employee Assistance Program', 'Employee Bus Pass', 'Wellness',
  ],
  'peopleadmin_careers_bcit_ca_10567': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Health Spending Account',
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'peopleadmin_careers_bcit_ca_10603': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Health Spending Account',
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'peopleadmin_careers_bcit_ca_10467': [
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'Executive-Assistant--HRE_JR-1025079': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Pension', 'Tuition Waiver', 'Vacation',
  ],
  'Director--Information-Security_JR-1024964': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Pension', 'Tuition Waiver', 'Vacation',
  ],
  '16bc0eb6ca2b': [
    'Employee Assistance Program', 'Vacation', 'OMERS',
  ],
  '735bf94088da': ['Vacation', 'OMERS', 'Employee Assistance Program'],
  '602177917': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Performance Bonuses',
  ],
  'neogov_120830': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vision Care', 'Life Insurance',
    'AD&D Insurance', 'Disability Insurance', 'Hearing Care', 'Vacation', 'Tuition Assistance',
    'Fitness Membership',
  ],
  'neogov_120804': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Life Insurance', 'Disability Insurance',
    'CAAT Pension Plan', 'Vacation', 'Tuition Assistance', 'Fitness Membership',
  ],
  '242422': ['OMERS', 'Employee Assistance Program', 'Fitness Membership', 'Transit Pass', 'Perkopolis'],
  '245109': [
    'Health Insurance', 'Dental Insurance', 'Life Insurance', 'Accident Insurance', 'Vacation',
    'Sick Days', 'Disability Insurance', 'OMERS', 'Employee Assistance Program', 'Fitness Membership',
    'Transit Pass', 'Perkopolis',
  ],
  'belleville_BNBPmLTMu2': ['Health Insurance', 'OMERS'],
  'cornwall_79976': [
    'Employee Assistance Program', 'Free Parking', 'OMERS', 'Mobile Phone Discount',
  ],
  '4262': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Paid Personal Days',
    'Health Spending Account', 'Employee Assistance Program', 'Parental Leave Top Up', 'OMERS',
  ],
  '4261': [
    'Health Insurance', 'Dental Insurance', 'Vacation', 'Paid Personal Days', 'Health Spending Account',
    'Employee Assistance Program', 'Parental Leave Top Up', 'Tuition Assistance', 'OMERS',
  ],
  '4260': [
    'Health Insurance', 'Dental Insurance', 'Vacation', 'Paid Personal Days', 'Health Spending Account',
    'Employee Assistance Program', 'Parental Leave Top Up', 'Tuition Assistance', 'OMERS',
  ],
  'adp_1124': ['Health Insurance', 'OMERS', 'Employee Assistance Program'],
  '3067': [
    'Health Insurance', 'Dental Insurance', 'Disability Insurance', 'Education Reimbursement', 'OMERS',
  ],
  'nanaimo_26_91': ['Vacation'],
  '2618': ['Health Insurance', 'Vacation', 'OMERS'],
  '600289417': ['Free Swimming', 'Fitness Membership', 'Uniform Provided', 'Shift Premium Program'],
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
  '1291388847': ['Health Insurance', 'Travel Benefits', 'Dental Insurance', 'OMERS', 'Vacation', 'Free Parking'],
  'peopleadmin_dal_peopleadmin_ca_21841': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Health Spending Account',
    'Employee Assistance Program', 'Tuition Assistance',
  ],
  'peopleadmin_www_douglascollegecareers_ca_15585': [
    'Health Insurance', 'Dental Insurance', 'Pension', 'Fitness Membership',
  ],
  '90bda7d84f1a': [
    'Health Insurance', 'Dental Insurance', 'Travel Benefits', 'Pension', 'Tuition Waiver',
    'Employee Assistance Program', 'Fitness Membership', 'Employee Discounts',
  ],
  'Part-time-Professors---Welding_JR02694': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Employee Assistance Program', 'Tuition Assistance',
  ],
  'psft_45860': ['Pension', 'Health Insurance', 'Wellness', 'Employee Assistance Program'],
  '15842': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Vacation', 'Personal Days', 'OMERS',
    'Tuition Assistance',
  ],
  '9106': ['Pension', 'Health Insurance', 'Dental Insurance', 'Life Insurance', 'Employee Assistance Program'],
  '1291412847': [
    'Health Insurance', 'Dental Insurance', 'Public Service Pension Plan', 'Fitness Centre Membership',
    'Employee Assistance Program', 'Employee Bus Pass', 'Wellness',
  ],
  'peopleadmin_careers_bcit_ca_10449': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Health Spending Account',
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'peopleadmin_careers_bcit_ca_10588': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Wellness', 'Fitness Membership',
    'Vacation', 'Employee Assistance Program',
  ],
  'peopleadmin_careers_bcit_ca_10597': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Wellness', 'Fitness Membership',
    'Vacation', 'Employee Assistance Program',
  ],
  'neogov_120776': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vision Care', 'Hearing Care', 'Life Insurance',
    'Disability Insurance', 'Critical Illness Insurance', 'Vacation', 'Tuition Assistance', 'Fitness Membership',
  ],
  'cornwall_86801': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Leave', 'Education Subsidy', 'OMERS',
    'Employee Assistance Program', 'Parental Leave Top Up', 'Free Parking', 'Mobile Phone Discount',
  ],
  '4251': [
    'Health Insurance', 'Dental Insurance', 'OMERS', 'Employee Assistance Program',
    'Parental Leave Top Up', 'Health Spending Account', 'Tuition Assistance',
  ],
  'peopleadmin_www_douglascollegecareers_ca_15586': [
    'Health Insurance', 'Dental Insurance', 'Pension', 'Fitness Membership',
  ],
  '7139': [
    'Health Insurance', 'Dental Insurance', 'Vision Care', 'Pension', 'Life Insurance',
    'Disability Insurance', 'Employee Assistance Program', 'Wellness Account', 'Vacation',
  ],
  'psft_77561': [
    'Health Insurance', 'Dental Insurance', 'Travel Benefits', 'Life Insurance', 'Pension',
    'Post-retirement Benefits', 'Vacation', 'Tuition Assistance',
  ],
  '15862': ['In Lieu Of Benefits', 'OMERS', 'Tuition Assistance'],
  '604348517': ['Health Insurance', 'Dental Insurance', 'Life Insurance', 'Employee Assistance Program', 'OMERS', 'Tuition Assistance'],
  'Professor-in-Accounting-at-the-rank-of-Assistant-or-Associate_JR37760': [
    'Disability Insurance', 'Life Insurance', 'Health Insurance', 'Pension',
    'Optional Life Insurance', 'Relocation Expense Reimbursement', 'Employee Assistance Program',
  ],
  'peopleadmin_careers_bcit_ca_10441': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Vacation', 'Health Spending Account',
    'Wellness', 'Employee Assistance Program', 'Fitness Membership',
  ],
  'adp_1151': ['Health Insurance', 'Dental Insurance', 'Travel Benefits', 'Life Insurance', 'OMERS', 'Employee Assistance Program'],
  'peopleadmin_www_douglascollegecareers_ca_15596': [
    'Health Insurance', 'Dental Insurance', 'Pension', 'Fitness Membership',
  ],
  'Administrative-Student-Affairs-Coordinator_JR0000078909-1': [
    'Health Insurance', 'Dental Insurance', 'Life Insurance', 'Pension', 'Tuition Waiver',
  ],
  '1291420247': ['OMERS', 'Vacation'],
  '1d7bdf9bb9b2': ['Health Insurance', 'Dental Insurance', 'OMERS', 'Fitness Membership'],
  '2448037': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Sick Leave', 'Wellness Allowance',
    'Mental Health Services', 'Paramedical Coverage', 'Virtual Health Care', 'Health Spending Account',
    'Life Insurance', 'AD&D Insurance', 'Disability Insurance', 'Employee Assistance Program',
    'Maternity/Parental Leave Top Up', 'Vacation',
  ],
  '2448044': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Sick Leave', 'Wellness Allowance',
    'Mental Health Services', 'Health Spending Account', 'Life Insurance', 'AD&D Insurance',
    'Disability Insurance', 'Employee Assistance Program', 'Maternity/Parental Leave Top Up',
    'Travel Benefits',
  ],
  '2448033': [
    'Pension', 'Health Insurance', 'Dental Insurance', 'Life Insurance', 'AD&D Insurance',
    'Disability Insurance', 'Wellness Allowance', 'Mental Health Services', 'Paramedical Coverage',
    'Virtual Health Care', 'Health Spending Account', 'Employee Assistance Program',
    'Maternity/Parental Leave Top Up', 'Vacation', 'Travel Benefits',
  ],
  '64aad23d44ef': [
    'Health Insurance', 'Dental Insurance', 'Travel Benefits', 'Pension', 'Tuition Waiver',
    'Employee Assistance Program', 'Fitness Membership', 'Employee Discounts',
  ],
  '2600000050': [
    'CAAT Pension Plan', 'Health Insurance', 'Vacation', 'Tuition Assistance', 'Employee Assistance Program',
  ],
};
