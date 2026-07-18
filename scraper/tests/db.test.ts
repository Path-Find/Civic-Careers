import assert from 'node:assert/strict';
import test from 'node:test';
import { saveJobDetails } from '../db';

test('saveJobDetails refreshes every parsed field on conflict', async () => {
  let statement = '';
  const client = {
    execute: async (query: { sql: string }) => {
      statement = query.sql;
      return { rows: [] };
    },
  };

  await saveJobDetails(client as never, {
    id: 'job-1',
    job_title: 'Updated title',
    department: 'Updated department',
    location: 'Updated location',
    salary_range: '$80K',
    description: 'Updated description',
    closing_date: '2026-08-15',
    is_inventory: 0,
    is_student: 0,
    salary_min: 80000,
    salary_max: null,
    salary_period: 'yearly',
    work_model: 'Remote',
    employment_type: 'Full-time',
    duration: '',
    is_unionized: 0,
    union_name: '',
    benefits: '[]',
    required_skills: '[]',
  });

  for (const field of [
    'job_title', 'department', 'location', 'salary_range', 'description',
    'closing_date', 'is_inventory', 'is_student', 'salary_min', 'salary_max',
    'salary_period', 'work_model', 'employment_type', 'duration',
    'is_unionized', 'union_name', 'benefits', 'required_skills',
  ]) {
    assert.match(statement, new RegExp(`${field} = excluded\\.${field}`));
  }
});
