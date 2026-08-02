import assert from 'node:assert/strict';
import test from 'node:test';
import { enrichWorkableJob, extractWorkableJobs } from '../engines/workable';

test('extracts Workable postings and builds detail text', () => {
  const [summary] = extractWorkableJobs({ results: [
    { id: 123, shortcode: 'ABC123', title: 'Planner', published: '2026-08-01T00:00:00.000Z' },
    { id: 123, shortcode: 'ABC123', title: 'Duplicate' },
  ] }, 'norfolk-county');
  assert.ok(summary);
  assert.equal(summary.id, 'workable_ABC123');
  assert.equal(summary.url, 'https://apply.workable.com/norfolk-county/j/ABC123/');

  assert.equal(enrichWorkableJob(summary, {
    id: 123,
    shortcode: 'ABC123',
    title: 'Planner',
    department: ['Planning'],
    location: { city: 'Simcoe', region: 'Ontario' },
    description: '<p>Plan communities.</p>',
    requirements: '<ul><li>Experience</li></ul>',
    benefits: '<p>Benefits available.</p>',
  }).rawText, 'Planner\n\nDepartment: Planning\n\nLocation: Simcoe, Ontario\n\nPlan communities.\n\nRequirements:\n- Experience\n\nBenefits:\nBenefits available.');
});
