import assert from 'node:assert/strict';
import test from 'node:test';
import { sourceMetadataFixFor } from '../source-metadata-fixes';

test('keeps the Ontario Health atHome metadata fix source-backed', () => {
  const fix = sourceMetadataFixFor('12236', [
    'Primary Responsibilities: Assess clients. Department: Ottawa General Hospital',
    'What must you have? Registered Nurse and registered with the College of Nurses of Ontario.',
    'What would give you the edge? French fluency. Hours of Work Monday to Friday – 8:30am to 4:30pm',
    'What do we offer? Defined benefit pension plan. Who are we',
  ].join(' '));

  assert.ok(fix);
  assert.equal(fix.location, 'Ottawa, ON');
  assert.equal(fix.salaryPeriod, 'hourly');
  assert.deepEqual(fix.benefits, ['Pension']);
  assert.match(fix.description, /## Responsibilities/);
  assert.match(fix.description, /## Benefits/);
});

test('does not invent fixes for unreviewed rows', () => {
  assert.equal(sourceMetadataFixFor('not-reviewed'), null);
});
