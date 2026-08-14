import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPostedDate, extractRecentRelativePostedDate, normalizePostedDate } from '../posted-date';
import { extractClosingDate, extractClosingDateStatus } from '../closing-date';

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

test('extracts only today and yesterday from relative Workday dates', () => {
  const reference = new Date('2026-08-05T12:00:00.000Z');
  assert.equal(extractRecentRelativePostedDate('posted onPosted Today', reference), '2026-08-05');
  assert.equal(extractRecentRelativePostedDate('posted onPosted Yesterday', reference), '2026-08-04');
  assert.equal(extractRecentRelativePostedDate('posted onPosted 5 Days Ago', reference), null);
});

test('extracts source closing dates without treating Job End Date as a deadline', () => {
  assert.equal(extractClosingDate('Posting End DateAugust 12, 2026 Job End DateDecember 15, 2026'), '2026-08-12');
  assert.equal(extractClosingDate('Internal posting deadline expires Thursday August 13th at 11:59 PM'), '2026-08-13');
  assert.equal(extractClosingDate('Job Closing Date (YYYY-MM-DD): 2026 / 8 / 31'), '2026-08-31');
  assert.equal(extractClosingDate('Closing Date: ​31-Aug-26'), '2026-08-31');
  assert.equal(extractClosingDate('Please apply by 09/04/2026'), '2026-09-04');
  assert.equal(extractClosingDate('Last Day to Apply: August 21, 2026'), '2026-08-21');
  assert.equal(extractClosingDate('Application Close: August 25, 2026'), '2026-08-25');
  assert.equal(extractClosingDate('Expires on: August 27, 2026'), '2026-08-27');
  assert.equal(extractClosingDate('Apply Before\n08/17/2026, 03:55 AM'), '2026-08-17');
  assert.equal(extractClosingDate('Job Closing Date (2026-08-20):'), '2026-08-20');
  assert.equal(extractClosingDate('Deadline to Apply: Monday, September 7th, 2026'), '2026-09-07');
  assert.equal(extractClosingDate('Posted Thursday, August 6, 2026 at 4:00 AM | Expires Tuesday, August 18, 2026 at 3:59 AM'), '2026-08-18');
  assert.equal(extractClosingDate('time left to applyEnd Date: August 25, 2026 (14 days left to apply)'), '2026-08-25');
  assert.equal(extractClosingDate('Close date: apply online by August 12, 2026'), '2026-08-12');
  assert.equal(extractClosingDate('Closing Date: 11:59 p.m. on Wednesday, August 19, 2026'), '2026-08-19');
  assert.equal(extractClosingDate('Closing date of August 31, 2026 at 11:59 p.m.'), '2026-08-31');
  assert.equal(extractClosingDate('The deadline for this position is July 16, 2026, at 11:59 PM'), '2026-07-16');
  assert.equal(extractClosingDate('Applications must be submitted by August 14, 2026'), '2026-08-14');
  assert.equal(extractClosingDate('This competition will close on September 2, 2026'), '2026-09-02');
  assert.equal(extractClosingDate('Job Competition closes at 7:00 p.m. EST on August 14, 2026'), '2026-08-14');
  assert.equal(extractClosingDate('Closing Date Internal: August 13, 2026 Closing Date External: August 21, 2026'), '2026-08-13');
  assert.equal(extractClosingDate('Closing Date: August, 23, 2026 23:59 EST'), '2026-08-23');
  assert.equal(extractClosingDate('Apply online at careers.example.ca by Monday, August 10, 2026'), '2026-08-10');
  assert.equal(extractClosingDate('Apply By: $127,855 per year 11:59 p.m. on Thursday, August 27, 2026'), '2026-08-27');
  assert.equal(extractClosingDate('Posting Start Date/Posting End Date From 07-02-2026 to 08-17-2026'), '2026-08-17');
  assert.equal(extractClosingDate('Job End DateDecember 15, 2026'), null);
  assert.equal(extractClosingDate('Start Date2026/09/01 End Date2027/04/30'), null);
});

test('classifies pending closing-date status when no date is available', () => {
  assert.deepEqual(extractClosingDateStatus('Applications accepted until the position is filled'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Posting Start Date/Posting End Date Ongoing'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('This posting will remain open until all positions are filled'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('The closing date for this competition will remain open until it is filled'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date: Ongoing'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date: Open until suitable candidate found'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date: Open till Filled'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date: Open until vacancies are filled'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('This is an ongoing recruitment program for future opportunities.'), {
    date: null,
    status: 'not_checked',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date:Open Until FilledTo Apply:'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('Job Closing Date (YYYY-MM-DD): Until Position has been Filled Job Description'), {
    date: null,
    status: 'open_until_filled',
  });
  assert.deepEqual(extractClosingDateStatus('External Closing Date: PCC#: 1042'), {
    date: null,
    status: 'not_listed',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date Days of Work Sunday - Saturday'), {
    date: null,
    status: 'not_listed',
  });
  assert.deepEqual(extractClosingDateStatus('Job Closing Date (YYYY-MM-DD): 20026/08/31'), {
    date: null,
    status: 'invalid',
  });
  assert.deepEqual(extractClosingDateStatus('No closing date listed'), {
    date: null,
    status: 'not_listed',
  });
  assert.deepEqual(extractClosingDateStatus('Closing Date: TBD'), {
    date: null,
    status: 'invalid',
  });
  assert.deepEqual(extractClosingDateStatus('A rendered posting body with general information'), {
    date: null,
    status: 'not_checked',
  });
});
