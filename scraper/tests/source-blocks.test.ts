import assert from 'node:assert/strict';
import test from 'node:test';
import { isExternalSourceBlock } from '../utils';

test('recognizes known external source blocks without hiding ordinary failures', () => {
  for (const message of [
    'City of Vaughan: Njoyn board blocked by Radware CAPTCHA',
    'University of New Brunswick: Alongside widget returned HTTP 526',
    'City of Toronto: official board blocked by Radware/hCaptcha challenge',
    'University of Waterloo: Workday board blocked by an external browser challenge',
  ]) {
    assert.equal(isExternalSourceBlock(new Error(message)), true, message);
  }

  assert.equal(isExternalSourceBlock(new Error('Njoyn request timed out')), false);
  assert.equal(isExternalSourceBlock(new Error('Alongside widget returned HTTP 500')), false);
});
