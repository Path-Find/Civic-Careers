import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAcademicSchedule, isAcademicJob, isLikelyAcademicCourse } from '../academic-context';

test('extractAcademicSchedule stops at French uOttawa labels', () => {
  const raw = 'Course Schedule: - - - 10 et 17 septembre 2026Requirements:Diplome universitaire en physiotherapieHeures total: 6Horaire:10 et 17 septembre 2026 14h30-17h30Additional Information and/or Comments:Boilerplate';
  assert.equal(extractAcademicSchedule(raw), '10 et 17 septembre 2026');
});

test('extractAcademicSchedule rejects swallowed posting text over the field limit', () => {
  assert.equal(extractAcademicSchedule(`Course Schedule: ${'a'.repeat(121)}`), '');
});

test('does not classify university support jobs as academic roles', () => {
  assert.equal(isAcademicJob('York University', 'PASS Leader (Academic Peer Support Assistant Lead)', null), false);
  assert.equal(isAcademicJob('University of Waterloo', 'Marketing Specialist II, CEE', null), false);
  assert.equal(isAcademicJob('University of Alberta', 'Assistant Professor', 'faculty'), true);
});

test('retains real course codes but rejects requisition-like course captures', () => {
  assert.equal(isLikelyAcademicCourse('University of Ottawa', 'Introduction à la recherche en éducation', 'EDU 5590 — Introduction à la recherche'), true);
  assert.equal(isLikelyAcademicCourse('Fanshawe College', 'Professors - Heating, Refrigeration and Mechanical Systems', 'JR02847'), false);
  assert.equal(isLikelyAcademicCourse('University of Waterloo', 'Marketing Specialist II, CEE', 'CEE 2026 — 02394 1'), false);
});
