import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractLanguageRequirements,
  extractLanguageVehicleRequirements,
  extractSoftwareRequirements,
  extractVehicleRequired,
  hasLanguageVehicleCandidate,
  normalizeLanguageRequirements,
  normalizeVehicleRequired,
} from '../requirements';

test('extracts named software and ignores ambiguous categories', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Microsoft Office Suite, Adobe Acrobat, and HEC-RAS
- Experience with engineering design software
- Word Embeddings
`);
  assert.deepEqual(result.values, ['Microsoft Office', 'Adobe Acrobat', 'HEC-RAS']);
});

test('skips optional software requirements', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Excel
- Familiarity with Tableau is an asset

## Nice to Have
- Experience with ArcGIS
`);
  assert.deepEqual(result.values, ['Excel']);
  assert.equal(result.skippedOptionalLines, 1);
});

test('recognizes individual Microsoft programs', () => {
  const result = extractSoftwareRequirements(`## Skills
- Microsoft Word, Microsoft Excel, MS PowerPoint, Outlook, and Access
`);
  assert.deepEqual(result.values, ['Word', 'Excel', 'PowerPoint', 'Outlook', 'Access']);
});

test('recognizes a program name at the end of a sentence', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Proficient in Microsoft Word.
`);
  assert.deepEqual(result.values, ['Word']);
});

test('does not treat generic lowercase teams as Microsoft Teams', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience leading internal teams
`);
  assert.deepEqual(result.values, []);
});

test('keeps Word when a line also mentions word processing', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience with Microsoft Office Suite (Word, Excel, PowerPoint), word processing, and Windows
`);
  assert.deepEqual(result.values, ['Microsoft Office', 'Word', 'Excel', 'PowerPoint', 'Windows']);
});

test('does not treat a named access tool as Microsoft Access', () => {
  const result = extractSoftwareRequirements(`## Qualifications
- Experience using the Police Access Tool (PAT)
- Experience using Microsoft Access
`);
  assert.deepEqual(result.values, ['Access']);
});

test('keeps explicit language requirements from a required section', () => {
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- English Essential
- Bilingual (English/French), BBB/BBB
- Excellent oral and written French proficiency
`), ['English Essential', 'Bilingual (English/French) (BBB/BBB)', 'French']);
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- French
`), ['French']);
});

test('drops optional, generic, programming, and course language wording', () => {
  assert.deepEqual(extractLanguageRequirements(`## Qualifications
- Strong oral and written communication skills
- Fluency in R and/or Stata programming language
- Completed an equivalent course in English

## Nice to Have
- Bilingualism is an asset
- French is preferred
`), []);
});

test('accepts an explicit labelled language requirement outside a standard heading', () => {
  assert.deepEqual(extractLanguageRequirements('Language Requirement: Bilingual - English and French (CBC)'), ['Bilingual (English/French)']);
  assert.deepEqual(extractLanguageRequirements('## Qualifications\n- Passive competence in a second language (English)'), ['English']);
});

test('does not treat posting language or language-of-work text as a requirement', () => {
  assert.deepEqual(extractLanguageRequirements(`## Overview
Language of work: English, French, and bilingual jobs available.
`), []);
});

test('keeps only an explicit bilingual title signal', () => {
  assert.deepEqual(extractLanguageRequirements('## Overview\nThe role supports a diverse team.', 'Bilingual Multi-Unit Underwriter I'), ['Bilingual']);
  assert.deepEqual(extractLanguageRequirements('## Overview\nFrench literature course instructor.', 'French Language Instructor'), []);
});

test('extracts required vehicle wording from qualifications', () => {
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid Class G driver's licence in good standing
`), true);
  assert.equal(extractVehicleRequired(`## Requirements
- Access to a reliable vehicle is required
`), true);
});

test('does not treat optional or conditional vehicle wording as required', () => {
  assert.equal(extractVehicleRequired(`## Nice to Have
- Valid driver's license is an asset
`), null);
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid driver's license for positions requiring driving
`), null);
  assert.equal(extractVehicleRequired('Travel between sites may be required.'), null);
});

test('returns false only for an explicit vehicle negative', () => {
  assert.equal(extractVehicleRequired('A driver license is an asset but not required.'), false);
  assert.equal(extractVehicleRequired('No vehicle is required for this position.'), false);
  assert.equal(extractVehicleRequired(`## Qualifications
- Valid Class G driver's licence required
- Some duties do not require operating a vehicle
`), true);
});

test('normalizes stored field values without changing unknown to false', () => {
  assert.deepEqual(normalizeLanguageRequirements(['English Essential', 'Bilingual (English/French)', 'Bilingualism is an asset']), ['English Essential', 'Bilingual (English/French)']);
  assert.equal(normalizeVehicleRequired(true), true);
  assert.equal(normalizeVehicleRequired('false'), false);
  assert.equal(normalizeVehicleRequired('unknown'), null);
  assert.equal(normalizeVehicleRequired(undefined), null);
});

test('extracts both fields together without requiring an AI call', () => {
  assert.deepEqual(extractLanguageVehicleRequirements(`## Qualifications
- Bilingual (English/French) required
- Valid driver's licence required
`), {
    language_requirements: ['Bilingual (English/French)'],
    vehicle_required: true,
  });
});

test('finds candidate descriptions without deciding that wording is a requirement', () => {
  assert.equal(hasLanguageVehicleCandidate('Bilingual (English/French) is required.'), true);
  assert.equal(hasLanguageVehicleCandidate("A valid Class G driver's licence is required."), true);
  assert.equal(hasLanguageVehicleCandidate('Strong oral and written communication skills.'), false);
  assert.equal(hasLanguageVehicleCandidate('Experience with Python programming language.'), false);
});
