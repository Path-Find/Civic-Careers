import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSalaryDisplay, isCanonicalSalary, parseSalaryText } from '../salary-format';

test('formats an hourly range', () => {
  assert.equal(formatSalaryDisplay(19, 24.5, 'hourly'), '$19 - $24.50 hourly');
});

test('formats a yearly range with thousands separators', () => {
  assert.equal(formatSalaryDisplay(68149, 86083, 'yearly'), '$68,149 - $86,083 yearly');
});

test('formats a single amount (min equals max)', () => {
  assert.equal(formatSalaryDisplay(50000, 50000, 'yearly'), '$50,000 yearly');
});

test('formats a single amount when only one bound is known', () => {
  assert.equal(formatSalaryDisplay(25, null, 'hourly'), '$25 hourly');
  assert.equal(formatSalaryDisplay(null, 30, 'hourly'), '$30 hourly');
});

test('returns empty string when no amounts are known', () => {
  assert.equal(formatSalaryDisplay(null, null, 'yearly'), '');
});

test('omits the period suffix when period is null', () => {
  assert.equal(formatSalaryDisplay(19, 24.5, null), '$19 - $24.50');
});

test('extracts a clean range from glued source prose', () => {
  assert.deepEqual(parseSalaryText('$25.60 To $32.00 HourlyThe Corporation of the Town of Midland invites applications'), {
    min: 25.60,
    max: 32,
    period: 'hourly',
    display: '$25.60 - $32 hourly',
  });
});

test('collapses a period repeated after both ends of a source range', () => {
  assert.deepEqual(parseSalaryText('$48.02/hr – $49.45/hr'), {
    min: 48.02,
    max: 49.45,
    period: 'hourly',
    display: '$48.02 - $49.45 hourly',
  });
});

test('only canonical dollar ranges pass the salary display filter', () => {
  assert.equal(isCanonicalSalary('$25.60 - $32 hourly'), true);
  assert.equal(isCanonicalSalary('$25.60 To $32.00 HourlyThe Corporation'), false);
  assert.equal(isCanonicalSalary('25.60 - 32.00 (hourly)'), false);
  assert.equal(isCanonicalSalary('$77,461 - $131,811 biweekly'), true);
});
