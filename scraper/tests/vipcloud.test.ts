import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVipCloudJobs } from '../engines/vipcloud';

test('extracts VIP Cloud requisitions and normalizes dates', () => {
  assert.deepEqual(extractVipCloudJobs([
    {
      title: 'Aquafit Instructor',
      requisition: '00813',
      category: 'Recreational Programming',
      location: 'Whitchurch-Stouffville',
      postedAt: '07/27/2026',
      closingDate: '08/21/2026',
    },
    {
      title: 'Duplicate',
      requisition: '00813',
    },
  ], 'https://townofws-careers.vipcloud.ca/default'), [
    {
      id: '1d7bdf9bb9b2',
      title: 'Aquafit Instructor',
      url: 'https://townofws-careers.vipcloud.ca/default#00813',
      applicationUrl: 'https://townofws-careers.vipcloud.ca/default',
      category: 'Recreational Programming',
      location: 'Whitchurch-Stouffville',
      postedAt: '2026-07-27',
      closingDate: '2026-08-21',
    },
  ]);
});
