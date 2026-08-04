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

test('extracts Opening Date and day-month-year GC style', () => {
  assert.equal(extractPostedDate('Opening Date: 9 February 2026 · Closing Date: 2 November 2026'), '2026-02-09');
  assert.equal(extractPostedDate('Opening Date\n\t\t\tJun 16, 2026\t\t\tClosing Date\n\t\t\tJun 30, 2026'), '2026-06-16');
  assert.equal(extractPostedDate('Opening Date: July 22, 2026Closing Date: August 4, 2026'), '2026-07-22');
  assert.equal(extractPostedDate('Date Published: 2026-07-15'), '2026-07-15');
  assert.equal(extractPostedDate('Advertised on March 3, 2026'), '2026-03-03');
  assert.equal(extractPostedDate('Posting Date: July 9th, 2026 Closing Date: July 20th, 2026'), '2026-07-09');
  assert.equal(extractPostedDate('Posting Date: Wednesday, April 1st, 2026About Us!'), '2026-04-01');
  assert.equal(extractPostedDate('Posting Date: 26/06/2026 Working Location: Ottawa'), '2026-06-26');
});

test('does not extract relative or closing dates', () => {
  assert.equal(extractPostedDate('posted on Posted 10 Days Ago End Date: July 17, 2026'), null);
  assert.equal(extractPostedDate('posted onPosted 30+ Days Agojob requisition idJR100364'), null);
  assert.equal(extractPostedDate('Closing Date: 07/28/2026'), null);
  assert.equal(extractPostedDate('Posting Date: February 30, 2026'), null);
  assert.equal(extractPostedDate("opportunities posted on the City's Internal Job Posting Portal"), null);
});
