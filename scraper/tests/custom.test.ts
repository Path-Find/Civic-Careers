import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStLawrenceJobs } from '../engines/custom';

test('extracts and deduplicates St. Lawrence College job links', () => {
  const html = `<a href="/jobs/admn-pt-26-27-052" title="Talent Management Consultant">Talent Management Consultant</a>
    <a href="/jobs/supp-26/27-051" title="International Admissions Coordinator">International Admissions Coordinator</a>
    <a href="/jobs/admn-pt-26-27-052">Duplicate</a>`;

  assert.deepEqual(extractStLawrenceJobs(html, 'https://www.stlawrencecollege.ca/about/careers-at-slc/current-job-opportunities'), [
    {
      id: 'stlawrence_admn_pt_26_27_052',
      title: 'Talent Management Consultant',
      url: 'https://www.stlawrencecollege.ca/jobs/admn-pt-26-27-052',
    },
    {
      id: 'stlawrence_supp_26_27_051',
      title: 'International Admissions Coordinator',
      url: 'https://www.stlawrencecollege.ca/jobs/supp-26/27-051',
    },
  ]);
});
