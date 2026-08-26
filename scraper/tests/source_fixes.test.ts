import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSourceForRaw } from '../source-fixes';

test('canonicalizes the Ottawa Jobs2Web source label', () => {
  assert.equal(canonicalSourceForRaw('City of Ottawa (Jobs2Web)', 'any captured posting'), 'City of Ottawa');
  assert.equal(canonicalSourceForRaw('City of Ottawa', 'any captured posting'), 'City of Ottawa');
});
