import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPendingMetadata, isUsablePendingLocation } from '../pending-metadata';

test('extracts obvious source salary text and high-confidence student flags', () => {
  assert.deepEqual(
    extractPendingMetadata('Library Page - Student Position', 'Salary: $22.92 - $27.14 per hour'),
    { salaryText: '$22.92-$27.14 hour', isStudent: 1, duration: null },
  );
});

test('does not classify incidental student wording as a student job', () => {
  assert.deepEqual(
    extractPendingMetadata('Manager, Strategic Operations', 'Supports student success and student learning.'),
    { salaryText: null, isStudent: null, duration: null },
  );
});

test('preserves bi-weekly salary periods for pending listings', () => {
  assert.deepEqual(
    extractPendingMetadata('Motor Vehicle Officer 3', 'Salary Range: $2,495.64 - $2,944.94 Bi-Weekly'),
    { salaryText: '$2,495.64-$2,944.94 biweekly', isStudent: null, duration: null },
  );
});

test('extracts title terms into pending duration metadata', () => {
  assert.equal(extractPendingMetadata('House Technician II (Temporary, up to 6 months)', '').duration, 'up to 6 months');
  assert.equal(extractPendingMetadata('Recreation Facilities Attendant I - Arenas (Permanent, On-Call)', '').duration, 'Permanent');
});

test('rejects prose accidentally shaped like a location', () => {
  assert.equal(isUsablePendingLocation('However, ON'), false);
  assert.equal(isUsablePendingLocation('Toronto, ON; Ottawa, ON'), true);
});

test('does not expose a salary amount without an explicit pay period', () => {
  const pending = extractPendingMetadata('Data Scientist', 'Salary: Our salaries generally range from $ 73555.31 to $ 91944.14 and are based on qualifications.');
  assert.equal(pending.salaryText, null);
});

test('keeps full uncommaed salary amounts and an explicit period', () => {
  const pending = extractPendingMetadata('Data Analyst', 'Salary: $ 73555.31 to $ 91944.14 yearly');
  assert.equal(pending.salaryText, '$73,555.31-$91,944.14 year');
});
