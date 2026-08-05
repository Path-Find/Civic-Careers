import assert from 'node:assert/strict';
import test from 'node:test';
import { formatWorkdayFallbackDescription } from '../fallback-description';

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
