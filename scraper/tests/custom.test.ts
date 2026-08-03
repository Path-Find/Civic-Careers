import assert from 'node:assert/strict';
import test from 'node:test';
import { extractBrassRingJobs, extractCustomHtmlJobs, extractHaltonHillsJobs, extractNanaimoJobs, extractPhenomJobs, extractStLawrenceJobs, shouldScrapeGovernmentOfCanadaListing } from '../engines/custom';
import { APPLICATION_URL_FIXES, EXCLUDED_GOVERNMENT_OF_CANADA_IDS, GOVERNMENT_OF_CANADA_FIXES } from '../source-fixes';

test('ignores the Government of Canada candidate profile page as a job', () => {
  assert.equal(shouldScrapeGovernmentOfCanadaListing('Candidate profile', 'Candidate profile'), false);
  assert.equal(shouldScrapeGovernmentOfCanadaListing('Clerical and Administrative Positions', 'Pool to be created Yes'), true);
  assert.equal(shouldScrapeGovernmentOfCanadaListing('Internal posting', 'Internal to the public service'), false);
});

test('keeps the CRA recruitment posting on its official application page', () => {
  assert.equal(GOVERNMENT_OF_CANADA_FIXES['2434700']?.applicationUrl, 'https://careers-carrieres.cra-arc.gc.ca/gol-ged/wcis/pub/rtrvjbpst.action?pi=8EB30FC0002E1FD18383F97AB53463CE');
  assert.equal(EXCLUDED_GOVERNMENT_OF_CANADA_IDS.has('2445703'), true);
});

test('keeps the legacy Toronto posting ID when its canonical URL is found', () => {
  assert.equal(APPLICATION_URL_FIXES['8bcafdef991f'], 'https://jobs.toronto.ca/jobsatcity/job/TORONTO-Solid-Waste-Collection-Operator-%28DZ-Licence-Required%29-ON-M9C-2Y2/598508217/');
});

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

test('extracts custom HTML job links while ignoring category and apply links', () => {
  const nipissingHtml = `<a href="/careers/employment-postings/staff">Staff Opportunities</a>
    <a href="/careers/employment-postings/research-coordinator" hreflang="en"> Research Coordinator </a>
    <a href="/careers/employment-postings/research-coordinator" hreflang="en">Duplicate</a>`;
  assert.equal(extractCustomHtmlJobs(
    nipissingHtml,
    'https://www.nipissingu.ca/careers/employment-postings',
    '/careers/employment-postings',
    { requireHrefLang: 'en' },
  ).length, 1);

  const northernHtml = `<a href="/careers/jobs/invigilator-26-26/"><span class="job-title">Invigilator (26-26)</span></a>
    <a href="/careers/jobs/invigilator-26-26/" class="btn btn-primary">Apply Now</a>`;
  assert.deepEqual(extractCustomHtmlJobs(
    northernHtml,
    'https://www.northerncollege.ca/careers/',
    '/careers/jobs',
    { titleClass: 'job-title' },
  ), [{
    id: 'custom_395d9e329041',
    title: 'Invigilator (26-26)',
    url: 'https://www.northerncollege.ca/careers/jobs/invigilator-26-26/',
  }]);
});

test('extracts stable Phenom job IDs and titles from rendered result links', () => {
  const html = `<a href="https://recruitment.edmonton.ca/job/55582/Project-Delivery-and-QA-Analyst" data-ph-at-job-title-text="Project Delivery and QA Analyst"></a>
    <a href="https://recruitment.edmonton.ca/job/55699/Arborist-I" data-ph-at-job-title-text="Arborist I - ISA Certified"></a>
    <a href="https://recruitment.edmonton.ca/job/55582/Project-Delivery-and-QA-Analyst" data-ph-at-job-title-text="Duplicate"></a>`;

  assert.deepEqual(extractPhenomJobs(html, 'https://recruitment.edmonton.ca/search-results'), [
    {
      id: 'phenom_55582',
      title: 'Project Delivery and QA Analyst',
      url: 'https://recruitment.edmonton.ca/job/55582/Project-Delivery-and-QA-Analyst',
    },
    {
      id: 'phenom_55699',
      title: 'Arborist I - ISA Certified',
      url: 'https://recruitment.edmonton.ca/job/55699/Arborist-I',
    },
  ]);
});

test('extracts and deduplicates Halton Hills job cards', () => {
  const html = `<a href="/town-hall/get-involved/careers/senior-planner-(202647)" class="job_card_container"><div class="card_title">Senior Environmental Planner</div></a>
    <a href="/town-hall/get-involved/careers/senior-planner-(202647)" class="job_card_container"><div class="card_title">Duplicate</div></a>
    <a href="/town-hall/get-involved/careers/lifeguard-(202646)" class="job_card_container"><div class="card_title">Lifeguard Instructor</div></a>`;

  assert.deepEqual(extractHaltonHillsJobs(html, 'https://www.haltonhills.ca/careers'), [
    {
      id: 'haltonhills_6cd2465b1013',
      title: 'Senior Environmental Planner',
      url: 'https://www.haltonhills.ca/town-hall/get-involved/careers/senior-planner-(202647)',
    },
    {
      id: 'haltonhills_6f17f213900e',
      title: 'Lifeguard Instructor',
      url: 'https://www.haltonhills.ca/town-hall/get-involved/careers/lifeguard-(202646)',
    },
  ]);
});

test('extracts Nanaimo detail pages with their PDF descriptions', () => {
  const html = `<div class="grid-item"><h3><a href="/docs/external-ad-(26-91).pdf">Director, Facilities</a></h3><div class="time">Opens: Jul 20, 2026</div><div class="time">Closes: Aug 17, 2026 4:30 AM</div><div class="date">Competition: 26-91</div><a href="/your-government/careers/job-postings/director--facilities">View Job Posting and Job Description</a></div>`;

  assert.deepEqual(extractNanaimoJobs(html, 'https://www.nanaimo.ca/your-government/careers/job-postings'), [{
    id: 'nanaimo_26_91',
    title: 'Director, Facilities',
    url: 'https://www.nanaimo.ca/your-government/careers/job-postings/director--facilities',
    descriptionUrl: 'https://www.nanaimo.ca/docs/external-ad-(26-91).pdf',
    applicationUrl: 'https://www.nanaimo.ca/your-government/careers/job-postings/director--facilities',
  }]);
});
