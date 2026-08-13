import { normalizeBenefits } from './requirements';

export type SourceMetadataFix = {
  description: string;
  department: string;
  location: string;
  salaryRange: string;
  salaryMin: number;
  salaryMax: number;
  salaryPeriod: string;
  employmentType: string;
  duration: string;
  hours: string;
  benefits: string[];
  educationRequirements: string[];
  experienceRequirements: string[];
  licenseRequirements: string[];
  languageRequirements: string[];
  certificationRequirements: string[];
  securityCheckRequired: number;
  isUnionized: number;
  unionName: string;
};

const ONTARIO_HEALTH_ATHOME_LICENSES = [
  'Registered Nurse (BScN or diploma) with the College of Nurses of Ontario',
  'Degree or diploma in Physiotherapy with the College of Physiotherapy of Ontario',
  'Degree or diploma in Occupational Therapy with the College of Occupational Therapy of Ontario',
  'Degree in Social Work with the Ontario College of Social Workers and Social Service Workers',
  'Degree in Speech Therapy with the College of Audiologists and Speech-Language Pathologists of Ontario',
  'Degree in Foods and Nutrition or equivalent with the College of Dietitians of Ontario',
];

const ONTARIO_HEALTH_ATHOME_EDUCATION = [
  'BScN or diploma in Nursing',
  'Degree or diploma in Physiotherapy',
  'Degree or diploma in Occupational Therapy',
  'Degree in Social Work',
  'Degree in Speech Therapy',
  'Degree in Foods and Nutrition or equivalent',
];

function buildOntarioHealthAtHomeDescription(rawText: string): string {
  const section = (start: string, end: string): string => {
    const match = rawText.match(new RegExp(`${start}([\\s\\S]*?)(?=${end}|$)`, 'i'));
    return match?.[1]?.replace(/\\s+/g, ' ').trim() ?? '';
  };

  const responsibilities = section('Primary Responsibilities:', 'Department:');
  const qualifications = section('What must you have\\?', 'What would give you the edge\\?');
  const advantages = section('What would give you the edge\\?', 'Hours of Work');
  const benefits = section('What do we offer\\?', 'Who are we');
  const schedule = section('Hours of Work', 'What do we offer\\?');

  return [
    '## Overview',
    'Ontario Health atHome Care Coordinator role based at Ottawa General Hospital, with travel to the Civic Hospital and Transitional Care Units.',
    responsibilities && `## Responsibilities\n${responsibilities}`,
    qualifications && `## Qualifications\n${qualifications}`,
    advantages && `## Additional qualifications\n${advantages}`,
    schedule && `## Hours of work\n${schedule}`,
    benefits && `## Benefits\n${benefits}`,
  ].filter(Boolean).join('\n\n');
}

export const SOURCE_METADATA_FIXES: Record<string, SourceMetadataFix> = {
  '12236': {
    description: buildOntarioHealthAtHomeDescription(''),
    department: 'Ottawa General Hospital',
    location: 'Ottawa, ON',
    salaryRange: '$44.480–$47.517 per hour',
    salaryMin: 44.48,
    salaryMax: 47.52,
    salaryPeriod: 'hourly',
    employmentType: 'Part-time',
    duration: 'Permanent',
    hours: 'Monday to Friday, 8:30am to 4:30pm',
    benefits: normalizeBenefits(['Defined benefit pension plan']),
    educationRequirements: ONTARIO_HEALTH_ATHOME_EDUCATION,
    experienceRequirements: ['2 years of related professional experience'],
    licenseRequirements: ONTARIO_HEALTH_ATHOME_LICENSES,
    languageRequirements: ['English', 'French'],
    certificationRequirements: ['Vulnerable Sector Check', 'N95 Mask Fit Test'],
    securityCheckRequired: 1,
    isUnionized: 1,
    unionName: 'ONA',
  },
};

export function sourceMetadataFixFor(id: string, rawText?: string): SourceMetadataFix | null {
  const fix = SOURCE_METADATA_FIXES[id];
  if (!fix) return null;
  if (id !== '12236' || !rawText) return fix;
  return { ...fix, description: buildOntarioHealthAtHomeDescription(rawText) };
}
