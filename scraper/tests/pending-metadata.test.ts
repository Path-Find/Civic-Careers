import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPendingMetadata } from '../pending-metadata';

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

test('keeps an explicit job end date while leaving ambiguous multi-date postings empty', () => {
  assert.equal(
    extractPendingMetadata('Work Study Assistant', 'Job Start Date 09-08-2026 Job End Date 04-30-2027').duration,
    '2026-09-08 to 2027-04-30',
  );
  assert.equal(
    extractPendingMetadata('Term role', 'One position ends February 28, 2027. Another ends May 10, 2027.').duration,
    null,
  );
  assert.equal(
    extractPendingMetadata('Sessional role', 'Sessional Dates: September 2026 to April 2027').duration,
    '2026-09-01 to 2027-04-30',
  );
  assert.equal(
    extractPendingMetadata('Term role', 'Term Position Length: Until 31 December 2028').duration,
    'Term ending 2028-12-31',
  );
  assert.equal(
    extractPendingMetadata('Seasonal role', 'Dates: October 16th to October 30th 2026').duration,
    '2026-10-16 to 2026-10-30',
  );
  assert.equal(
    extractPendingMetadata('Seasonal role', 'This is a Seasonal position from September 2026 - June 2027.').duration,
    '2026-09-01 to 2027-06-30',
  );
  assert.equal(
    extractPendingMetadata('Multiple positions', 'One temporary position until 2 September 2027. One temporary position until October 2026.').duration,
    null,
  );
});
