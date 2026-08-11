import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextNumberedSuccessFactorsPage } from '../engines/successfactors';
import { dedupeJobs2WebSummaries, getNextJobs2WebStartRow } from '../engines/jobs2web';

test('follows numbered SuccessFactors pages beyond page ten', () => {
  assert.equal(
    getNextNumberedSuccessFactorsPage(
      'Page 10',
      [{ title: 'Page 11', href: 'https://careers.example.test/search?startrow=250' }],
      'https://careers.example.test/search?startrow=225',
    ),
    'https://careers.example.test/search?startrow=250',
  );
});

test('stops numbered SuccessFactors pagination at the last page', () => {
  assert.equal(
    getNextNumberedSuccessFactorsPage(
      'Page 36',
      [{ title: 'Page 36', href: 'https://careers.example.test/search?startrow=875' }],
      'https://careers.example.test/search?startrow=875',
    ),
    null,
  );
});

test('follows the actual Jobs2Web page size', () => {
  assert.equal(
    getNextJobs2WebStartRow(0, [
      'https://jobs.example.test/search?startrow=0',
      'https://jobs.example.test/search?startrow=10',
      'https://jobs.example.test/search?startrow=20',
    ]),
    10,
  );
  assert.equal(
    getNextJobs2WebStartRow(10, [
      'https://jobs.example.test/search?startrow=0',
      'https://jobs.example.test/search?startrow=10',
      'https://jobs.example.test/search?startrow=20',
    ]),
    20,
  );
  assert.equal(getNextJobs2WebStartRow(20, ['https://jobs.example.test/search?startrow=0', 'https://jobs.example.test/search?startrow=10']), null);
});

test('deduplicates desktop and mobile Jobs2Web links', () => {
  assert.deepEqual(dedupeJobs2WebSummaries([
    { title: 'Role', url: 'https://jobs.example.test/job/1' },
    { title: 'Role', url: 'https://jobs.example.test/job/1' },
    { title: 'Other role', url: 'https://jobs.example.test/job/2' },
  ]), [
    { title: 'Role', url: 'https://jobs.example.test/job/1' },
    { title: 'Other role', url: 'https://jobs.example.test/job/2' },
  ]);
});
