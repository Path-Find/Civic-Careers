import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLabeledLocation, normalizeLocation } from '../location';

test('bare Canadian cities get province codes', () => {
  assert.equal(normalizeLocation('Guelph'), 'Guelph, ON');
  assert.equal(normalizeLocation('Toronto'), 'Toronto, ON');
  assert.equal(normalizeLocation('Ottawa'), 'Ottawa, ON');
  assert.equal(normalizeLocation('Winnipeg'), 'Winnipeg, MB');
  assert.equal(normalizeLocation('Vancouver'), 'Vancouver, BC');
  assert.equal(normalizeLocation('Montreal'), 'Montreal, QC');
  assert.equal(normalizeLocation('Halifax'), 'Halifax, NS');
  assert.equal(normalizeLocation('Yellowknife'), 'Yellowknife, NT');
});

test('already canonical form is preserved (with casing fix)', () => {
  assert.equal(normalizeLocation('Toronto, ON'), 'Toronto, ON');
  assert.equal(normalizeLocation('toronto, on'), 'Toronto, ON');
  assert.equal(normalizeLocation('Winnipeg, MB'), 'Winnipeg, MB');
});

test('full province names and Canada suffix expand', () => {
  assert.equal(normalizeLocation('London, Ontario'), 'London, ON');
  assert.equal(normalizeLocation('Toronto, Ontario, Canada'), 'Toronto, ON');
  assert.equal(normalizeLocation('Waterloo, Ontario, Canada'), 'Waterloo, ON');
  assert.equal(normalizeLocation('Calgary, Alberta, Canada'), 'Calgary, AB');
  assert.equal(normalizeLocation('Montreal, Quebec'), 'Montreal, QC');
  assert.equal(normalizeLocation('Edmonton, AB, Canada'), 'Edmonton, AB');
});

test('parenthetical province codes', () => {
  assert.equal(normalizeLocation('Calgary (AB)'), 'Calgary, AB');
  assert.equal(
    normalizeLocation('Calgary (AB); Halifax (NS); Montreal (QC); Ottawa (ON); Toronto (ON); Vancouver (BC)'),
    'Calgary, AB; Halifax, NS; Montreal, QC; Ottawa, ON; Toronto, ON; Vancouver, BC',
  );
  assert.equal(
    normalizeLocation('Calgary (ab), Halifax (ns), Montreal (qc), Ottawa (on), Toronto (on), Vancouver, BC'),
    'Calgary, AB; Halifax, NS; Montreal, QC; Ottawa, ON; Toronto, ON; Vancouver, BC',
  );
  // Repair bad prior backfill that attached the last province to every city
  assert.equal(
    normalizeLocation('Calgary (ab), BC; Halifax (ns), BC; Vancouver, BC'),
    'Calgary, AB; Halifax, NS; Vancouver, BC',
  );
  assert.equal(normalizeLocation('Montreal (québec)'), 'Montreal, QC');
  assert.equal(normalizeLocation('Bagotville (québec), YT'), 'Bagotville, QC');
});

test('multi-site separators', () => {
  assert.equal(normalizeLocation('Guelph; Toronto; Hamilton'), 'Guelph, ON; Toronto, ON; Hamilton, ON');
  assert.equal(normalizeLocation('Kelowna / Penticton / Salmon Arm / Vernon'), 'Kelowna, BC; Penticton, BC; Salmon Arm, BC; Vernon, BC');
  assert.equal(normalizeLocation('Edmonton or Calgary'), 'Edmonton, AB; Calgary, AB');
  assert.equal(normalizeLocation('New Westminster/Coquitlam'), 'New Westminster, BC; Coquitlam, BC');
  assert.equal(normalizeLocation('Lethbridge or Calgary'), 'Lethbridge, AB; Calgary, AB');
  assert.equal(
    normalizeLocation('Delta, Langley, Surrey, White Rock'),
    'Delta, BC; Langley, BC; Surrey, BC; White Rock, BC',
  );
});

test('campus aliases resolve to cities', () => {
  assert.equal(normalizeLocation('Keele Campus'), 'Toronto, ON');
  assert.equal(normalizeLocation('Keele Campus, Ontario, Canada'), 'Toronto, ON');
  assert.equal(normalizeLocation('St. George (Downtown Toronto)'), 'Toronto, ON');
  assert.equal(normalizeLocation('University of Toronto Mississauga'), 'Mississauga, ON');
  assert.equal(normalizeLocation('St. Catharines, Main Campus'), 'St. Catharines, ON');
});

test('junk and unusable values become empty', () => {
  assert.equal(normalizeLocation('Canada'), '');
  assert.equal(normalizeLocation('N/A'), '');
  assert.equal(normalizeLocation('Ontario'), '');
  assert.equal(normalizeLocation('BC'), '');
  assert.equal(normalizeLocation('Various locations'), '');
  assert.equal(normalizeLocation('Multiple locations across Canada'), '');
  assert.equal(normalizeLocation('Multiple Locations, BC'), '');
  assert.equal(normalizeLocation('Within a National Research Council Office across Canada'), '');
  assert.equal(normalizeLocation('Other'), '');
  assert.equal(normalizeLocation(''), '');
  assert.equal(normalizeLocation(null), '');
});

test('St. Catharines casing', () => {
  assert.equal(normalizeLocation('St. Catharines'), 'St. Catharines, ON');
  assert.equal(normalizeLocation('st. catharines'), 'St. Catharines, ON');
});

test('unmapped bare place does not invent a province', () => {
  assert.equal(normalizeLocation('Someunknownville'), '');
});

test('dedupes repeated cities', () => {
  assert.equal(normalizeLocation('Toronto; Toronto, ON'), 'Toronto, ON');
});

test('recovers compact labelled source locations', () => {
  assert.equal(
    extractLabeledLocation('Job ID #32166: Process Supervisor LocationHamilton, OntarioDepartmentPublic WorksEmployment TypePermanent, Full-Time'),
    'Hamilton, ON',
  );
  assert.equal(extractLabeledLocation('Location: Toronto, Ontario\nDepartment: Public Works'), 'Toronto, ON');
  assert.equal(extractLabeledLocation('Department: Public Works\nEmployment Type: Full-Time'), '');
});
