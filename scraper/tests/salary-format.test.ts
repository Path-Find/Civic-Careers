import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSalaryDisplay, isCanonicalSalary, parseSalaryText } from '../salary-format';

test('formats an hourly range', () => {
  assert.equal(formatSalaryDisplay(19, 24.5, 'hourly'), '$19-$24.50 hour');
});

test('formats a yearly range with thousands separators', () => {
  assert.equal(formatSalaryDisplay(68149, 86083, 'yearly'), '$68,149-$86,083 year');
});

test('formats a single amount (min equals max)', () => {
  assert.equal(formatSalaryDisplay(50000, 50000, 'yearly'), '$50,000 year');
});

test('formats a single amount when only one bound is known', () => {
  assert.equal(formatSalaryDisplay(25, null, 'hourly'), '$25 hour');
  assert.equal(formatSalaryDisplay(null, 30, 'hourly'), '$30 hour');
});

test('returns empty string when no amounts are known', () => {
  assert.equal(formatSalaryDisplay(null, null, 'yearly'), '');
});

test('omits the period suffix when period is null', () => {
  assert.equal(formatSalaryDisplay(19, 24.5, null), '$19-$24.50');
});

test('extracts a clean range from glued source prose', () => {
  assert.deepEqual(parseSalaryText('$25.60 To $32.00 HourlyThe Corporation of the Town of Midland invites applications'), {
    min: 25.60,
    max: 32,
    period: 'hourly',
    display: '$25.60-$32 hour',
  });
});

test('collapses a period repeated after both ends of a source range', () => {
  assert.deepEqual(parseSalaryText('$48.02/hr – $49.45/hr'), {
    min: 48.02,
    max: 49.45,
    period: 'hourly',
    display: '$48.02-$49.45 hour',
  });
});

test('expands K shorthand and normalizes yr to year', () => {
  assert.deepEqual(parseSalaryText('$4K – $5K / yr'), {
    min: 4000,
    max: 5000,
    period: 'yearly',
    display: '$4,000-$5,000 year',
  });
});

test('normalizes hr to hour and preserves real cents', () => {
  assert.deepEqual(parseSalaryText('$20.11/hr'), {
    min: 20.11,
    max: 20.11,
    period: 'hourly',
    display: '$20.11 hour',
  });
});

test('does not borrow a distant pay period or truncate a labelled range', () => {
  assert.equal(parseSalaryText('Salary Range: $87,604 - $100,527. Salary paid annually.'), null);
  assert.deepEqual(parseSalaryText('$51,566 - $67,035 Benefits include a $400 annual wellness allowance.'), null);
  assert.deepEqual(parseSalaryText('$20.54/hourThe Corporation offers benefits and annual leave'), {
    min: 20.54,
    max: 20.54,
    period: 'hourly',
    display: '$20.54 hour',
  });
});

test('only canonical dollar ranges pass the salary display filter', () => {
  assert.equal(isCanonicalSalary('$25.60-$32 hour'), true);
  assert.equal(isCanonicalSalary('$25.60 To $32.00 HourlyThe Corporation'), false);
  assert.equal(isCanonicalSalary('25.60 - 32.00 (hourly)'), false);
  assert.equal(isCanonicalSalary('$77,461-$131,811 biweekly'), true);
});
