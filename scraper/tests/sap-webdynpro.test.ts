import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSapWebDynproJobs } from '../engines/sap-webdynpro';

test('extracts SAP Web Dynpro postings and normalizes dates', () => {
  assert.deepEqual(extractSapWebDynproJobs([
    {
      title: 'ADMS MODELING OFFICER',
      reference: 'CO57223277-01',
      postedAt: '2026/07/31',
      location: 'Winnipeg',
      closingDate: '2026/08/11',
    },
    {
      title: 'Duplicate',
      reference: 'CO57223277-01',
    },
  ], 'https://careers.hydro.mb.ca/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search'), [
    {
      id: '119179afa5bf',
      title: 'ADMS MODELING OFFICER',
      url: 'https://careers.hydro.mb.ca/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search#CO57223277-01',
      applicationUrl: 'https://careers.hydro.mb.ca/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search',
      location: 'Winnipeg',
      postedAt: '2026-07-31',
      closingDate: '2026-08-11',
    },
  ]);
});
