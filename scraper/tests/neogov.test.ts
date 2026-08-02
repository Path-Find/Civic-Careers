import test from 'node:test';
import assert from 'node:assert/strict';
import { neogovJobId } from '../engines/neogov';

test('uses the stable NEOGOV numeric job ID', () => {
  assert.equal(
    neogovJobId('https://gjobs.neogov.ca/careers/cambriancollege/jobs/120825/dental-hygiene-technologists'),
    'neogov_120825',
  );
});

test('falls back to a URL hash when a detail URL has no numeric job ID', () => {
  assert.match(
    neogovJobId('https://example.com/careers/cambriancollege/jobs/temporary-role'),
    /^neogov_[a-f0-9]{12}$/,
  );
});
