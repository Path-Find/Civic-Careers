import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findStructuredValueIssues } from '../report-structured-values';

const VALID = {
  salary_period: 'hourly',
  work_model: 'Hybrid',
  employment_type: 'Full-time',
  listing_type: 'regular',
  academic_role_type: null,
  is_inventory: 0,
  is_student: null,
  vehicle_required: 1,
  security_check_required: null,
  is_unionized: 0,
  responsibility_tags: JSON.stringify(['Operations & compliance']),
  qualification_tags: JSON.stringify(['Student']),
  availability: 'Weekends',
};

test('structured value report ignores valid values and empty fields', () => {
  const issues = findStructuredValueIssues([{
    id: 'valid',
    source: 'Example',
    job_title: 'Planner',
    ...VALID,
  }]);
  assert.deepEqual(issues, []);
});

test('structured value report groups unexpected values and catches availability fragments', () => {
  const issues = findStructuredValueIssues([
    {
      id: 'one',
      source: 'Example',
      job_title: 'Planner',
      ...VALID,
      work_model: 'In person',
      availability: 'minimum of',
      responsibility_tags: JSON.stringify(['Made-up tag']),
    },
    {
      id: 'two',
      source: 'Example',
      job_title: 'Analyst',
      ...VALID,
      work_model: 'In person',
      availability: 'minimum of',
    },
  ]);

  assert.deepEqual(
    issues.map(issue => ({ field: issue.field, value: issue.value, count: issue.count })),
    [
      { field: 'availability', value: 'minimum of', count: 2 },
      { field: 'responsibility_tags', value: 'Made-up tag', count: 1 },
      { field: 'work_model', value: 'In person', count: 2 },
    ],
  );
});

test('structured value report catches malformed arrays and invalid booleans', () => {
  const issues = findStructuredValueIssues([{
    id: 'bad',
    source: 'Example',
    job_title: 'Planner',
    ...VALID,
    is_student: 2,
    qualification_tags: 'not json',
  }]);

  assert.deepEqual(
    issues.map(issue => ({ field: issue.field, value: issue.value })),
    [
      { field: 'is_student', value: '2' },
      { field: 'qualification_tags', value: '(invalid JSON array)' },
    ],
  );
});
