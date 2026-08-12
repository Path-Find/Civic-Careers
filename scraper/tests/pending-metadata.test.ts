import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPendingMetadata } from '../pending-metadata';

test('extracts obvious source salary text and high-confidence student flags', () => {
  assert.deepEqual(
    extractPendingMetadata('Library Page - Student Position', 'Salary: $22.92 - $27.14 per hour'),
    { salaryText: '$22.92 - $27.14 per hour', isStudent: 1 },
  );
});

test('does not classify incidental student wording as a student job', () => {
  assert.deepEqual(
    extractPendingMetadata('Manager, Strategic Operations', 'Supports student success and student learning.'),
    { salaryText: null, isStudent: null },
  );
});

test('preserves bi-weekly salary periods for pending listings', () => {
  assert.deepEqual(
    extractPendingMetadata('Motor Vehicle Officer 3', 'Salary Range: $2,495.64 - $2,944.94 Bi-Weekly'),
    { salaryText: '$2,495.64 - $2,944.94 Bi-Weekly', isStudent: null },
  );
});
