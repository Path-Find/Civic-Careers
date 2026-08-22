import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCareerStage } from '../career-stage';
import { classifyStudentRequirement } from '../requirements';

test('classifies explicit student and early-career source signals', () => {
  assert.equal(classifyCareerStage({ title: 'Co-op Student, Finance', rawText: 'Co-op student employment for the summer term.' }), 'student');
  assert.equal(classifyCareerStage({ title: 'Graduate Program Analyst', rawText: 'Open to recent graduates entering an early-career program.' }), 'early-career');
});

test('requires source-body evidence before classifying senior or experienced roles', () => {
  assert.equal(classifyCareerStage({ title: 'Senior Analyst', rawText: 'Analyze public data and prepare reports.' }), null);
  assert.equal(classifyCareerStage({ title: 'Senior Analyst', rawText: 'Lead a team and supervise analysts.' }), 'senior');
  assert.equal(classifyCareerStage({ title: 'Analyst', rawText: 'At least 3 years of related professional experience required.' }), 'experienced');
});

test('does not treat incidental student wording as a student opportunity', () => {
  assert.equal(classifyCareerStage({ title: 'Coordinator, Student Services', rawText: 'Coordinate services for students and families.' }), null);
});

test('requires explicit student eligibility rather than incidental student wording', () => {
  assert.equal(classifyStudentRequirement('Student Wellness Counsellor', 'Provides counselling and wellness support to students.'), false);
  assert.equal(classifyStudentRequirement('Physiotherapist', 'The role supports student placements and clinical learning.'), false);
  assert.equal(classifyStudentRequirement('Summer Student - Aquatic Attendant', 'Apply for this summer student role.'), true);
  assert.equal(classifyStudentRequirement('Research Assistant', 'Applicants must be currently enrolled as full-time students.'), true);
});
