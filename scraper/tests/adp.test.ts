import assert from 'node:assert/strict';
import test from 'node:test';
import { adpDetailUrl, adpTitleFromRaw } from '../engines/adp';

test('uses the ADP detail heading and falls back to the first raw-text line', () => {
  assert.equal(adpTitleFromRaw('Specialist, Hydrology and Hydraulics\n\nJob Description'), 'Specialist, Hydrology and Hydraulics');
  assert.equal(adpTitleFromRaw('Job Description', 'Supervisor, Realty and Greenspace Acquisition'), 'Supervisor, Realty and Greenspace Acquisition');
});

test('recognizes a direct ADP posting URL and rejects the generic portal', () => {
  assert.equal(adpDetailUrl('https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=abc&jobId=596446'), 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=abc&jobId=596446');
  assert.equal(adpDetailUrl('https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=abc'), null);
});
