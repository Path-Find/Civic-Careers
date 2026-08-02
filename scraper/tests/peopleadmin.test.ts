import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPeopleAdminJobs, peopleAdminJobId } from '../engines/peopleadmin';

const searchPage = `<div id="search_results">
  <div class="job-item job-item-posting">
    <a href="/postings/21934">Administrative Coordinator &amp; Programs</a>
  </div>
  <div class="job-item job-item-posting">
    <a href="/postings/21934">Duplicate</a>
    <a href="/postings/21935"><span>Part-Time Academic</span></a>
  </div>
  <a href="/postings/search?page=2">Next</a>
</div>`;

test('extracts and deduplicates stable PeopleAdmin posting links', () => {
  assert.deepEqual(extractPeopleAdminJobs(searchPage, 'https://dal.peopleadmin.ca/postings/search'), [
    {
      id: 'peopleadmin_dal_peopleadmin_ca_21934',
      title: 'Administrative Coordinator & Programs',
      url: 'https://dal.peopleadmin.ca/postings/21934',
    },
    {
      id: 'peopleadmin_dal_peopleadmin_ca_21935',
      title: 'Part-Time Academic',
      url: 'https://dal.peopleadmin.ca/postings/21935',
    },
  ]);
});

test('uses the tenant hostname to prevent cross-board ID collisions', () => {
  assert.equal(
    peopleAdminJobId('https://uleth.peopleadmin.ca/postings/9271'),
    'peopleadmin_uleth_peopleadmin_ca_9271',
  );
});
