import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSalaryDisplay } from '../salary-format';

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
