import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDuration } from '../duration';

test('permanent and ongoing kinds', () => {
  assert.equal(normalizeDuration('Permanent'), 'Permanent');
  assert.equal(normalizeDuration('Continuing'), 'Permanent');
  assert.equal(normalizeDuration('Indeterminate'), 'Permanent');
  assert.equal(normalizeDuration('Regular'), 'Permanent');
  assert.equal(normalizeDuration('Continuous'), 'Permanent');
  assert.equal(normalizeDuration('Permanent Full Time'), 'Permanent');
  assert.equal(normalizeDuration('Tenure-track'), 'Permanent');
  assert.equal(normalizeDuration('Ongoing'), 'Ongoing');
  assert.equal(normalizeDuration('Seasonal'), 'Seasonal');
});

test('generic temporary without length becomes Term', () => {
  assert.equal(normalizeDuration('Temporary'), 'Term');
  assert.equal(normalizeDuration('Contract'), 'Term');
  assert.equal(normalizeDuration('Casual'), 'Term');
  assert.equal(normalizeDuration('Temporary Full-Time'), 'Term');
});

test('length formats', () => {
  assert.equal(normalizeDuration('12 months'), '12 months');
  assert.equal(normalizeDuration('18 months'), '18 months');
  assert.equal(normalizeDuration('1 year'), '1 year');
  assert.equal(normalizeDuration('2 years'), '2 years');
  assert.equal(normalizeDuration('Up to 24 months'), 'Up to 24 months');
  assert.equal(normalizeDuration('up to 18 months'), 'Up to 18 months');
  assert.equal(normalizeDuration('10-month work year'), '10-month work year');
  assert.equal(normalizeDuration('Temporary Part-time for approximately 12 months'), '12 months');
});

test('date ranges normalize to ISO', () => {
  assert.equal(normalizeDuration('September 1, 2026 to December 31, 2026'), '2026-09-01 to 2026-12-31');
  assert.equal(normalizeDuration('September 01, 2026 to December 31, 2026'), '2026-09-01 to 2026-12-31');
  assert.equal(normalizeDuration('09-08-2026 to 04-30-2027'), '2026-09-08 to 2027-04-30');
  assert.equal(normalizeDuration('10/08/2026 to 29/04/2027'), '2026-08-10 to 2027-04-29');
  assert.equal(normalizeDuration('2026-09-01 to 2026-12-31'), '2026-09-01 to 2026-12-31');
  assert.equal(normalizeDuration('September 1, 2026 - December 31, 2026'), '2026-09-01 to 2026-12-31');
  assert.equal(normalizeDuration('September - December 2026'), '2026-09-01 to 2026-12-31');
});

test('end dates normalize without becoming application deadlines', () => {
  assert.equal(normalizeDuration('Term ending 2027-07-26'), 'Term ending 2027-07-26');
  assert.equal(normalizeDuration('Job End Date July 26, 2027'), 'Term ending 2027-07-26');
  assert.equal(normalizeDuration('expected end date Sept 27, 2027'), 'Term ending 2027-09-27');
  assert.equal(normalizeDuration('End Date 31 December 2028'), 'Term ending 2028-12-31');
  assert.equal(normalizeDuration('septembre 01, 2026 to décembre 31, 2026'), '2026-09-01 to 2026-12-31');
  assert.equal(normalizeDuration('Term ending March 2027'), 'Term ending March 2027');
});

test('academic terms compact', () => {
  assert.equal(normalizeDuration('Fall 2026 semester'), 'Fall 2026');
  assert.equal(normalizeDuration('Winter 2027 semester'), 'Winter 2027');
  assert.equal(normalizeDuration('2026 Fall Semester'), 'Fall 2026');
  assert.equal(normalizeDuration('Fall term (September to December)'), 'Fall term');
  assert.equal(normalizeDuration('Fall D2'), 'Fall term');
});

test('empty and junk', () => {
  assert.equal(normalizeDuration(''), '');
  assert.equal(normalizeDuration(null), '');
  assert.equal(normalizeDuration('N/A'), '');
  assert.equal(normalizeDuration('Some random unparseable prose that is not a duration at all'), '');
});
