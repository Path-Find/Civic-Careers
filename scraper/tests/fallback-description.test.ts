import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCapturedDescription, formatWorkdayFallbackDescription } from '../fallback-description';

test('formats flattened Workday content into readable sections', () => {
  const result = formatWorkdayFallbackDescription(
    'Skip to main contentNursing Practice Educator page is loaded'
      + 'Job Description SummaryTo teach nursing students.'
      + 'Work Performed- Supervise students- Evaluate clinical work'
      + 'Minimum Qualifications- Registered Nurse'
      + 'Preferred Qualifications- Teaching experience'
      + 'About UsUBC employer copy',
  );

  assert.equal(result, [
    '## Overview',
    'To teach nursing students.',
    '',
    '## Responsibilities',
    '- Supervise students',
    '- Evaluate clinical work',
    '',
    '## Qualifications',
    '- Registered Nurse',
    '',
    '## Nice to Have',
    '- Teaching experience',
  ].join('\n'));
});

test('rejects a raw page without recognizable job sections', () => {
  assert.equal(formatWorkdayFallbackDescription('Skip to main contentLoadingFollow Us'), null);
});

test('formats a non-Workday position overview and qualifications capture', () => {
  const result = formatCapturedDescription(
    'Position OverviewThis role coordinates patient care and supports the clinical team. '
      + 'The incumbent works with clients and families to provide timely service. '
      + 'Qualifications and SkillsRegistered professional with strong communication skills and clinical experience. '
      + 'The position supports a multidisciplinary team and requires careful documentation of all client interactions. '
      + 'BenefitsHealth and dental coverage. Apply now',
  );

  assert.equal(result, [
    '## Overview',
    'This role coordinates patient care and supports the clinical team. The incumbent works with clients and families to provide timely service.',
    '',
    '## Qualifications',
    'Registered professional with strong communication skills and clinical experience. The position supports a multidisciplinary team and requires careful documentation of all client interactions.',
  ].join('\n'));
});

test('formats role-specific University of Toronto sections', () => {
  const result = formatCapturedDescription(
    'About usThe employer profile is not the role. '
      + 'Your opportunity:This position supports the development of business systems and processes for internal users and helps teams improve how they work together. '
      + 'Your responsibilities will include:Analyze requirements and document process maps while coordinating with stakeholders and preparing clear recommendations. '
      + 'Essential Qualifications:Bachelor degree and five years of experience. The successful candidate communicates clearly and works independently with internal stakeholders. '
      + 'Closing Date: August 24, 2026',
  );

  assert.equal(result, [
    '## Overview',
    'This position supports the development of business systems and processes for internal users and helps teams improve how they work together.',
    '',
    '## Responsibilities',
    'Analyze requirements and document process maps while coordinating with stakeholders and preparing clear recommendations.',
    '',
    '## Qualifications',
    'Bachelor degree and five years of experience. The successful candidate communicates clearly and works independently with internal stakeholders.',
  ].join('\n'));
});
