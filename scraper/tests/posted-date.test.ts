import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPostedDate, normalizePostedDate } from '../posted-date';

test('normalizes supported official date formats', () => {
  assert.equal(normalizePostedDate('2026/07/03'), '2026-07-03');
  assert.equal(normalizePostedDate('07/08/2026'), '2026-07-08');
  assert.equal(normalizePostedDate('07-02-2026'), '2026-07-02');
  assert.equal(normalizePostedDate('Jul 07, 2026'), '2026-07-07');
  assert.equal(normalizePostedDate('Jul 08,2026'), '2026-07-08');
  assert.equal(normalizePostedDate('2026-07-20T00:00:00.000Z'), '2026-07-20');
});

test('extracts Date Posted and Posting Date labels', () => {
  assert.equal(extractPostedDate('Date Posted (YYYY/MM/DD):2026/07/03'), '2026-07-03');
  assert.equal(extractPostedDate('Date Posted: 06/12/2026'), '2026-06-12');
  assert.equal(extractPostedDate('Posting Date\n07/03/2026, 01:04 PM'), '2026-07-03');
  assert.equal(extractPostedDate('Posting Date (4:30pm)\nJuly 9, 2026'), '2026-07-09');
});

test('does not extract relative or closing dates', () => {
  assert.equal(extractPostedDate('posted on Posted 10 Days Ago End Date: July 17, 2026'), null);
  assert.equal(extractPostedDate('Closing Date: 07/28/2026'), null);
  assert.equal(extractPostedDate('Posting Date: February 30, 2026'), null);
});
