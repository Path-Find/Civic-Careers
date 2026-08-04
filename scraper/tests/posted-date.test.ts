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
  assert.equal(normalizePostedDate('07/13/26'), '2026-07-13');
  assert.equal(normalizePostedDate('Tuesday, January 6, 2026'), '2026-01-06');
});

test('extracts Date Posted, Posting Date, Posted, and Posted on labels', () => {
  assert.equal(extractPostedDate('Date Posted (YYYY/MM/DD):2026/07/03'), '2026-07-03');
  assert.equal(extractPostedDate('Date Posted: 06/12/2026'), '2026-06-12');
  assert.equal(extractPostedDate('Posting Date\n07/03/2026, 01:04 PM'), '2026-07-03');
  assert.equal(extractPostedDate('Posting Date (4:30pm)\nJuly 9, 2026'), '2026-07-09');
  assert.equal(extractPostedDate('Posted: Tuesday, January 6, 2026 Application Deadline: December 31, 2026'), '2026-01-06');
  assert.equal(extractPostedDate('Posted: January 9, 2026'), '2026-01-09');
  assert.equal(extractPostedDate('Posted on June 11, 2026 by Employer details'), '2026-06-11');
  assert.equal(extractPostedDate('Posted On: June 25, 2026Last Day to Apply: July 4, 2026'), '2026-06-25');
  assert.equal(extractPostedDate('Date Posted: 07/13/26Deadline: 09/04/2026'), '2026-07-13');
  assert.equal(extractPostedDate('Date Posted By 6/1/2026'), '2026-06-01');
});

test('does not extract relative or closing dates', () => {
  assert.equal(extractPostedDate('posted on Posted 10 Days Ago End Date: July 17, 2026'), null);
  assert.equal(extractPostedDate('posted onPosted 30+ Days Agojob requisition idJR100364'), null);
  assert.equal(extractPostedDate('Closing Date: 07/28/2026'), null);
  assert.equal(extractPostedDate('Posting Date: February 30, 2026'), null);
});
