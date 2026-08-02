import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPrevueJobs } from '../engines/prevue';

test('extracts PrevueAPS jobs and preserves closing dates', () => {
  assert.deepEqual(extractPrevueJobs({ data: { jobs: [
    {
      id: 31155,
      title: 'Library Assistant',
      jobUrl: 'https://cotr.prevueaps.ca/jobs/31155',
      jobLocation: 'Cranbrook, BC, Canada',
      endDateRef: 'Aug 17, 2026',
      untilFilled: 0,
    },
    {
      id: 31155,
      title: 'Duplicate',
      jobUrl: 'https://cotr.prevueaps.ca/jobs/31155',
    },
    {
      id: 31278,
      title: 'Auxiliary Clerk',
      jobUrl: 'https://cotr.prevueaps.ca/jobs/31278',
      untilFilled: 1,
    },
  ] } }), [
    {
      id: 'prevue_31155',
      title: 'Library Assistant',
      url: 'https://cotr.prevueaps.ca/jobs/31155',
      applicationUrl: 'https://cotr.prevueaps.ca/jobs/31155',
      location: 'Cranbrook, BC, Canada',
      closingDate: 'Aug 17, 2026',
    },
    {
      id: 'prevue_31278',
      title: 'Auxiliary Clerk',
      url: 'https://cotr.prevueaps.ca/jobs/31278',
      applicationUrl: 'https://cotr.prevueaps.ca/jobs/31278',
    },
  ]);
});
