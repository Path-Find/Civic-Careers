import assert from 'node:assert/strict';
import test from 'node:test';
import { extractBrassRingJobs, extractStLawrenceJobs } from '../engines/custom';

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

test('extracts and deduplicates BrassRing job links by numeric ID', () => {
  const html = `<a href="/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25749&amp;siteid=5764&amp;PageType=JobDetails&amp;jobid=770979">Utility Operator 2</a>
    <a href="/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25749&amp;siteid=5764&amp;PageType=JobDetails&amp;jobid=771196"><span>Ferry Relief Mate Eligibility List</span></a>
    <a href="/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25749&amp;siteid=5764&amp;PageType=JobDetails&amp;jobid=770979">Duplicate</a>`;

  assert.deepEqual(extractBrassRingJobs(html, 'https://sjobs.brassring.com/TGnewUI/Search/Home/Home'), [
    {
      id: 'brassring_770979',
      title: 'Utility Operator 2',
      url: 'https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25749&siteid=5764&PageType=JobDetails&jobid=770979',
    },
    {
      id: 'brassring_771196',
      title: 'Ferry Relief Mate Eligibility List',
      url: 'https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad?partnerid=25749&siteid=5764&PageType=JobDetails&jobid=771196',
    },
  ]);
});
