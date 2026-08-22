import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeAvailability,
  normalizeHours,
  splitHoursAndAvailability,
} from '../hours-availability';

test('normalizeHours maps common workload phrases', () => {
  assert.equal(normalizeHours('35 hours per week'), '35 hours per week');
  assert.equal(normalizeHours('35 per week'), '35 hours per week');
  assert.equal(normalizeHours('40 per week'), '40 hours per week');
  assert.equal(normalizeHours('36.25 hours per week'), '36.25 hours per week');
  assert.equal(normalizeHours('Maximum 24 hours per week'), 'Up to 24 hours per week');
  assert.equal(normalizeHours('Up to 6 hours per week'), 'Up to 6 hours per week');
  assert.equal(normalizeHours('Up to 24 hrs/week; variable schedule'), 'Up to 24 hours per week');
  assert.equal(normalizeHours('39 hours (3 credits)'), '39 hours');
  assert.equal(normalizeHours('24 hour workweek / shift work / variable hours'), '24 hours per week');
  assert.equal(normalizeHours(''), '');
  assert.equal(normalizeHours(null), '');
});

test('normalizeHours drops pure schedule prose', () => {
  assert.equal(normalizeHours('Scheduled to school hours of operation; spare guards on-call'), '');
});

test('normalizeAvailability maps schedule tags', () => {
  assert.equal(normalizeAvailability('Daytime hours'), 'Daytime');
  assert.equal(normalizeAvailability('Nights, weekends and holidays'), 'Nights; Weekends; Holidays');
  assert.equal(normalizeAvailability('Evenings and weekends as required'), 'Evenings; Weekends');
  assert.equal(normalizeAvailability('Shift work / variable hours'), 'Shift work; Variable');
  assert.equal(normalizeAvailability('Flex hours including days, evenings and weekends'), 'Evenings; Weekends; Flexible');
  assert.equal(normalizeAvailability('Full-time term'), '');
  assert.equal(normalizeAvailability('minimum of'), '');
  assert.equal(normalizeAvailability('36.'), '');
  assert.equal(normalizeAvailability('(3 credits)'), '');
  assert.equal(normalizeAvailability('Weekdays, evenings, weekends, and holidays'), 'Evenings; Weekends; Weekdays; Holidays');
});

test('normalizeAvailability drops labour-relations prose', () => {
  assert.equal(normalizeAvailability('r the ratification'), '');
});

test('split does not invent availability from credit notes', () => {
  assert.deepEqual(
    splitHoursAndAvailability('39 hours (3 credits)', '(3 credits)'),
    { hours: '39 hours', availability: '' },
  );
  assert.deepEqual(
    splitHoursAndAvailability('36.25 hours per week', '36.'),
    { hours: '36.25 hours per week', availability: '' },
  );
});

test('splitHoursAndAvailability separates fused strings', () => {
  assert.deepEqual(
    splitHoursAndAvailability('35 hours per week; Tuesday to Saturday, 8:30am to 4:30pm', ''),
    { hours: '35 hours per week', availability: 'Tue-Sat' },
  );
  assert.deepEqual(
    splitHoursAndAvailability('35 hours per week; Monday to Friday 8:30am – 4:30pm', ''),
    { hours: '35 hours per week', availability: 'Mon-Fri' },
  );
  assert.deepEqual(
    splitHoursAndAvailability('40 hours per week; rotating on-call requirement', ''),
    { hours: '40 hours per week', availability: 'Shift work; On-call' },
  );
  assert.deepEqual(
    splitHoursAndAvailability('Up to 24 hrs/week; variable schedule', 'Flex hours including days, evenings and weekends'),
    { hours: 'Up to 24 hours per week', availability: 'Evenings; Weekends; Flexible; Variable' },
  );
  assert.deepEqual(
    splitHoursAndAvailability('Scheduled to school hours of operation; spare guards on-call', ''),
    { hours: '', availability: 'On-call; School hours' },
  );
});
