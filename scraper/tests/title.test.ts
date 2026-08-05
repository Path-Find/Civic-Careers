import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEmploymentOrDurationParen, normalizeJobTitle } from '../title';

describe('isEmploymentOrDurationParen', () => {
  it('matches employment and duration parentheticals', () => {
    for (const s of [
      'Part-Time',
      'Part Time',
      'Full-time',
      'Temporary',
      'Casual',
      'Seasonal',
      'Permanent',
      'Term',
      'Contract',
      'Inventory',
      'Approximately 2-year contract',
      '2 Year Contract',
      '9 Month Contract',
      '1-Year Contract',
      '18-months contract',
      '3 Year Contract',
      'fixed-term',
    ]) {
      assert.equal(isEmploymentOrDurationParen(s), true, s);
    }
  });

  it('keeps meaningful parentheticals', () => {
    for (const s of [
      'Strength Training',
      'Sports',
      'Aquafit Instructor',
      'Cemeteries',
      'The Aud',
      'PhD Required –Physical Sciences or Related Discipline',
      'TES',
      'ENG1112',
      'ACCE',
    ]) {
      assert.equal(isEmploymentOrDurationParen(s), false, s);
    }
  });
});

describe('normalizeJobTitle', () => {
  it('strips employment/duration parentheticals', () => {
    assert.equal(normalizeJobTitle('Custodian (Part-Time)'), 'Custodian');
    assert.equal(
      normalizeJobTitle('Change Management Lead (Approximately 2-year contract)'),
      'Change Management Lead',
    );
    assert.equal(normalizeJobTitle('Animal Services Officer (2 Year Contract)'), 'Animal Services Officer');
    assert.equal(normalizeJobTitle('Coordinator, Commercial Management (9 Month Contract)'), 'Coordinator, Commercial Management');
    assert.equal(normalizeJobTitle('Building Inspector I (18-months contract)'), 'Building Inspector I');
    assert.equal(normalizeJobTitle('Personal Support Worker (Casual)'), 'Personal Support Worker');
    assert.equal(normalizeJobTitle('Building Servicer 1 - Aquatics (Seasonal)'), 'Building Servicer 1 - Aquatics');
    assert.equal(
      normalizeJobTitle('Fitness Instructor – Spin and Sculpt (Strength Training) (Part-Time)'),
      'Fitness Instructor – Spin and Sculpt (Strength Training)',
    );
  });

  it('strips inventory and trailing employment dashes', () => {
    assert.equal(normalizeJobTitle('Mason/Tile setter - Inventory'), 'Mason/Tile setter');
    assert.equal(normalizeJobTitle('Student Visitor Services Attendant - INVENTORY'), 'Student Visitor Services Attendant');
    assert.equal(normalizeJobTitle('Instructor (Sports) - Part-time'), 'Instructor (Sports)');
    assert.equal(normalizeJobTitle('Facility Attendant - Services - Part-Time'), 'Facility Attendant - Services');
  });

  it('strips Temporary+FT/PT and leading FT/PT prefixes', () => {
    assert.equal(
      normalizeJobTitle('Temporary Part-Time Dance Instructor - Fall 2026'),
      'Dance Instructor - Fall 2026',
    );
    assert.equal(normalizeJobTitle('Part-time Transit Operator'), 'Transit Operator');
    assert.equal(normalizeJobTitle('Part Time Lifeguard & Swim Instructor'), 'Lifeguard & Swim Instructor');
    assert.equal(
      normalizeJobTitle('Full-time Digital Marketing and Communications Specialist'),
      'Digital Marketing and Communications Specialist',
    );
    assert.equal(
      normalizeJobTitle('Part-Time Casual CJIIC Administrative Assistant'),
      'CJIIC Administrative Assistant',
    );
    assert.equal(normalizeJobTitle('Part Time - Food Services Worker'), 'Food Services Worker');
    assert.equal(normalizeJobTitle('Recreation Assistant - RE-POST (Periodic Posting)'), 'Recreation Assistant');
  });

  it('does not strip bare Temporary proper-name prefixes', () => {
    assert.equal(
      normalizeJobTitle('Temporary Employment Services (TES), Office Assistant'),
      'Temporary Employment Services (TES), Office Assistant',
    );
    assert.equal(normalizeJobTitle('Temporary Facility Operator'), 'Temporary Facility Operator');
    assert.equal(normalizeJobTitle('Temporary Arena/Pool Operator'), 'Temporary Arena/Pool Operator');
  });

  it('keeps course codes and meaningful parens', () => {
    assert.equal(
      normalizeJobTitle('Part-time Professor - Technical Report Writing (ENG1112)'),
      'Professor - Technical Report Writing (ENG1112)',
    );
    assert.equal(
      normalizeJobTitle('Part-Time Facilitator – Liberal Studies (PhD Required –Physical Sciences or Related Discipline)'),
      'Facilitator – Liberal Studies (PhD Required –Physical Sciences or Related Discipline)',
    );
  });

  it('is stable on already-clean titles', () => {
    assert.equal(normalizeJobTitle('Change Management Lead'), 'Change Management Lead');
    assert.equal(normalizeJobTitle('Utility Student'), 'Utility Student');
    assert.equal(normalizeJobTitle(''), '');
  });
});
