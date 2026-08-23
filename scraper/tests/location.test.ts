import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLabeledLocation, normalizeLocation, normalizeSourceLocation, normalizeSourceLocationFromTitle } from '../location';
import { extractPendingMetadata } from '../pending-metadata';

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
  assert.equal(normalizeLocation('SK, Moose Jaw'), 'Moose Jaw, SK');
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

test('repairs glued Chatham-Kent arena locations by source signal', () => {
  assert.equal(normalizeSourceLocation('Municipality of Chatham-Kent', 'Location: Various municipal arenas'), 'Chatham-Kent, ON');
  assert.equal(normalizeSourceLocation('Other source', 'Location: Various municipal arenas'), '');
});

test('uses Shared Health city instead of facility name for location', () => {
  assert.equal(
    normalizeSourceLocation('Shared Health Manitoba', 'City: Winnipeg Site: St. Boniface Hospital Department / Unit: Intensive Care'),
    'Winnipeg, MB',
  );
  assert.equal(
    normalizeSourceLocation('Shared Health Manitoba', 'Work Location: Boundary Trails Health Centre City: Winkler Hiring Status: Temporary'),
    'Winkler, MB',
  );
});

test('dedupes repeated cities', () => {
  assert.equal(normalizeLocation('Toronto; Toronto, ON'), 'Toronto, ON');
});

test('recovers explicit Shared Health cities from title-only captures', () => {
  assert.equal(normalizeSourceLocationFromTitle('Shared Health Manitoba', 'Licensed Practical Nurse 0.8 D/E Gimli 1'), 'Gimli, MB');
  assert.equal(normalizeSourceLocationFromTitle('Shared Health Manitoba', 'Licensed Practical Nurse 0.7 D/E Selkirk'), 'Selkirk, MB');
  assert.equal(normalizeSourceLocationFromTitle('Shared Health Manitoba', 'Registered Nurse'), '');
});

test('recovers compact labelled source locations', () => {
  assert.equal(
    extractLabeledLocation('Job ID #32166: Process Supervisor LocationHamilton, OntarioDepartmentPublic WorksEmployment TypePermanent, Full-Time'),
    'Hamilton, ON',
  );
  assert.equal(extractLabeledLocation('Location: Toronto, Ontario\nDepartment: Public Works'), 'Toronto, ON');
  assert.equal(extractLabeledLocation('Department: Public Works\nEmployment Type: Full-Time'), '');
  assert.equal(extractLabeledLocation('Location: Acton Vale, QC, CA Job Requisition Id: 197371'), 'Acton Vale, QC');
  assert.equal(extractLabeledLocation('Locations 200 Front St W, Toronto, ON, M5V 3J1, CA 100 Stone Rd W, Guelph, ON, N1G 5L3, CA'), 'Toronto, ON; Guelph, ON');
});

test('recovers city-level location from a pending Workday capture', () => {
  assert.equal(extractPendingMetadata('Evidence & Impact Analyst', 'ApplylocationsUBC Vancouver Campus - Vancouver, BC, Canadatime typeFull timeposted onPosted Yesterday').location, 'Vancouver, BC');
  assert.equal(extractPendingMetadata('Student Program Assistant', 'ApplylocationsOttawa Campustime typePart timeposted onPosted Yesterday').location, 'Ottawa, ON');
});
