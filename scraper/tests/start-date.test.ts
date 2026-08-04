import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStartDate, normalizeStartDate } from '../start-date';

test('normalizes calendar, seasonal, and immediate start dates', () => {
  assert.equal(normalizeStartDate('September 01, 2026'), '2026-09-01');
  assert.equal(normalizeStartDate('2026-09-09'), '2026-09-09');
  assert.equal(normalizeStartDate('8/3/26'), '2026-08-03');
  assert.equal(normalizeStartDate('November 2, 2026'), '2026-11-02');
  assert.equal(normalizeStartDate('July 1, 2027'), '2027-07-01');
  assert.equal(normalizeStartDate('Immediate'), 'Immediate');
  assert.equal(normalizeStartDate('asap'), 'Immediate');
  assert.equal(normalizeStartDate('Fall Semester 2026'), 'Fall 2026');
  assert.equal(normalizeStartDate('Winter 2027'), 'Winter 2027');
  assert.equal(normalizeStartDate('October 2026'), 'October 2026');
  assert.equal(normalizeStartDate('January, 2027'), 'January 2027');
});

test('extracts labelled start dates from posting text', () => {
  assert.equal(
    extractStartDate('Expected start date:July 13, 2026Job type3 months Temporary'),
    '2026-07-13',
  );
  assert.equal(
    extractStartDate('Anticipated Start Date:August 24, 2026Length of Contract:2-months'),
    '2026-08-24',
  );
  assert.equal(
    extractStartDate('Start Date:September 01, 2026Work End Date:December 31, 2026'),
    '2026-09-01',
  );
  assert.equal(
    extractStartDate('Start Date: 8/3/26End Date: Number of Openings: 1'),
    '2026-08-03',
  );
  assert.equal(
    extractStartDate('Start Date November 2, 2026 '),
    '2026-11-02',
  );
  assert.equal(
    extractStartDate('Start Date immediate '),
    'Immediate',
  );
  assert.equal(
    extractStartDate('Anticipated start date: Fall 2026. Start date may be adjusted'),
    'Fall 2026',
  );
  assert.equal(
    extractStartDate('Start date: Fall Semester 2026Responsibilities:Facilitate'),
    'Fall 2026',
  );
  assert.equal(
    extractStartDate('The expected start date will be January, 2027. The University recognizes'),
    'January 2027',
  );
  assert.equal(
    extractStartDate('The start date is July 1, 2027 or later. The successful candidate will perform'),
    '2027-07-01',
  );
});

test('does not extract noise that is not a role start date', () => {
  assert.equal(
    extractStartDate('AED Certification obtained prior to start date Don’t'),
    null,
  );
  assert.equal(
    extractStartDate('provide start date, and end date (if applicable). IN YOUR COVER LETTER'),
    null,
  );
  assert.equal(
    extractStartDate('Start Date: End Date: Number of Openings: 1'),
    null,
  );
  assert.equal(
    extractStartDate('Automatic enrolment into OMERS pension plan Accrue Vacation on a monthly basis starting'),
    null,
  );
});
