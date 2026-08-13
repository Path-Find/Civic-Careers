import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPendingMetadata, isUsablePendingLocation } from '../pending-metadata';

test('extracts obvious source salary text and high-confidence student flags', () => {
  assert.deepEqual(
    extractPendingMetadata('Library Page - Student Position', 'Salary: $22.92 - $27.14 per hour'),
    { salaryText: '$22.92 - $27.14 per hour', isStudent: 1, duration: null },
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
    { salaryText: '$2,495.64 - $2,944.94 Bi-Weekly', isStudent: null, duration: null },
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
