import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSelkirkJobs } from '../engines/selkirk';

test('extracts Selkirk Hireserve jobs and preserves metadata', () => {
  assert.deepEqual(extractSelkirkJobs({ jobs: [
    {
      id: 603872,
      title: 'Administrative Assistant',
      weblink: 'https://careers.selkirk.ca/vacancy/administrative-assistant-603872.html',
      publication: { internet: { closing_date: '2026-08-06 00:00:00' } },
      classifications: {
        class_18545: { name: 'Location', values: [{ class_val: 'Castlegar' }] },
      },
    },
    {
      id: 603872,
      title: 'Duplicate',
      weblink: 'https://careers.selkirk.ca/vacancy/duplicate-603872.html',
    },
    {
      id: 603865,
      title: 'Bookstore Support Clerk',
      weblink: 'https://careers.selkirk.ca/vacancy/bookstore-support-clerk-603865.html',
    },
  ] }), [
    {
      id: 'selkirk_603872',
      title: 'Administrative Assistant',
      url: 'https://careers.selkirk.ca/vacancy/administrative-assistant-603872.html',
      location: 'Castlegar',
      closingDate: '2026-08-06 00:00:00',
    },
    {
      id: 'selkirk_603865',
      title: 'Bookstore Support Clerk',
      url: 'https://careers.selkirk.ca/vacancy/bookstore-support-clerk-603865.html',
    },
  ]);
});
