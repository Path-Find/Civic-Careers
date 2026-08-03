import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSoftwareRequirements } from '../requirements';

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
