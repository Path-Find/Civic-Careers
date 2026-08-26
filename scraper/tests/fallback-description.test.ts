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

test('keeps a concise Government of Canada career-pool summary', () => {
  const description = formatCapturedDescription('Several SP-03 & SP-04 positions to start your career at the CRA! Group and level SP-004 Location Jonquière, Montréal, Shawinigan Closing Date September 7, 2026 ' + 'Structured field '.repeat(20));
  assert.equal(description, '## Overview\nSeveral SP-03 & SP-04 positions to start your career at the CRA!');
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

test('formats direct ICBC role sections without portal chrome', () => {
  const result = formatCapturedDescription(
    'Intersection Safety Camera Program Rep Position Highlights '
      + 'Be an integral member of the customer service team and process safety camera tickets while supporting the public. '
      + 'Position Requirements Strong attention to detail, customer service experience, and proficiency with office applications. '
      + 'About us: employer information and benefits.',
    'Intersection Safety Camera Program Rep',
  );

  assert.match(result ?? '', /^## Overview\n/);
  assert.match(result ?? '', /## Qualifications\n/);
  assert.doesNotMatch(result ?? '', /About us:/i);
});

test('formats concise structured course postings deterministically', () => {
  const result = formatCapturedDescription(
    'Course Proctor Description of tasks (hours): Monitor students during examinations and report issues. '
      + 'Number of positions: 1 Work Start Date: September 16, 2026 Work End Date: December 31, 2026 '
      + 'Requirements and Nature of Work: Fluency in English and French. All University of Ottawa employees complete training.',
    'Course Proctor',
  );

  assert.match(result ?? '', /## Qualifications\n/);
});

test('formats uOttawa faculty captures without portal chrome or structured metadata', () => {
  const result = formatCapturedDescription(
    'Applications must be received BEFORE (YYYY/MM/DD): '
      + 'The University invites applications for a faculty position in public health. '
      + 'Position Title: Assistant Professor '
      + 'Duties: Teach courses, conduct research, supervise graduate students, and contribute to academic service. '
      + 'Terms: New tenure-track appointment. Salary: $99,377. '
      + 'Required Qualifications: PhD in a related field and a strong research record. '
      + 'Deadline: July 23, 2026. Apply online through the careers portal. '
      + 'Similar Jobs (14) Other role Follow Us Policy 90',
  );

  assert.equal(result, [
    '## Overview',
    'The University invites applications for a faculty position in public health.',
    '',
    '## Responsibilities',
    'Teach courses, conduct research, supervise graduate students, and contribute to academic service.',
    '',
    '## Qualifications',
    'PhD in a related field and a strong research record.',
  ].join('\n'));
});

test('handles confusable Workday labels in Ottawa faculty captures', () => {
  const result = formatCapturedDescription(
    'Applications must be received BEFORE (YYYY/MM/DD): The faculty invites applications for a research role. '
      + 'Position Titlе: Assistant Professor Duties: Teach, research, supervise students, and serve the faculty. '
      + 'Terms: Tenure-track Required Qualificatiоns: PhD and a strong research record with demonstrated teaching experience. '
      + 'Dеadline: October 16, 2026. Similar Jobs (3) Follow UsPolicy 90',
  );

  assert.equal(result, [
    '## Overview',
    'The faculty invites applications for a research role.',
    '',
    '## Responsibilities',
    'Teach, research, supervise students, and serve the faculty.',
    '',
    '## Qualifications',
    'PhD and a strong research record with demonstrated teaching experience.',
  ].join('\n'));
});
