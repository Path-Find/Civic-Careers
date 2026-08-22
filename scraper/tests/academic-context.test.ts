import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAcademicSchedule } from '../academic-context';

test('extractAcademicSchedule stops at French uOttawa labels', () => {
  const raw = 'Course Schedule: - - - 10 et 17 septembre 2026Requirements:Diplome universitaire en physiotherapieHeures total: 6Horaire:10 et 17 septembre 2026 14h30-17h30Additional Information and/or Comments:Boilerplate';
  assert.equal(extractAcademicSchedule(raw), '10 et 17 septembre 2026');
});

test('extractAcademicSchedule rejects swallowed posting text over the field limit', () => {
  assert.equal(extractAcademicSchedule(`Course Schedule: ${'a'.repeat(121)}`), '');
});
