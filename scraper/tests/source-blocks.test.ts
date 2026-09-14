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
  assert.equal(
    isExternalSourceBlock(new Error('page.goto: net::ERR_TIMED_OUT at https://myjobs.greatersudbury.ca/psc/MYJOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL')),
    true,
  );
  assert.equal(
    isExternalSourceBlock(new Error('PeopleSoft redirected to https://myjobs.greatersudbury.ca/psc/MYJOBS/?cmd=login&errorPg=ckreq')),
    true,
  );
  assert.equal(
    isExternalSourceBlock(new Error('page.goto: net::ERR_CONNECTION_RESET at https://careersconnect.translink.bc.ca/psc/EXT/EMPLOYEE/HRMS/c/HRS_HRAM_FL.GBL')),
    true,
  );
  assert.equal(isExternalSourceBlock(new Error('Alongside widget returned HTTP 500')), false);
});
