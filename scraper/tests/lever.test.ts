import assert from 'node:assert/strict';
import test from 'node:test';
import { extractLeverJobs } from '../engines/lever';

test('extracts Lever postings with stable IDs and application URLs', () => {
  assert.deepEqual(extractLeverJobs([
    {
      id: 'abc-123',
      text: 'Library Technician',
      hostedUrl: 'https://jobs.lever.co/okanagan/abc-123',
      applyUrl: 'https://jobs.lever.co/okanagan/abc-123/apply',
      categories: { department: 'Library', location: 'Kelowna' },
    },
    {
      id: 'abc-123',
      text: 'Duplicate',
    },
    {
      id: 'def-456',
      text: 'Student Assistant',
      categories: { allLocations: ['Penticton', 'Vernon'] },
    },
  ], 'okanagan'), [
    {
      id: 'lever_abc-123',
      title: 'Library Technician',
      url: 'https://jobs.lever.co/okanagan/abc-123',
      applicationUrl: 'https://jobs.lever.co/okanagan/abc-123/apply',
      department: 'Library',
      location: 'Kelowna',
    },
    {
      id: 'lever_def-456',
      title: 'Student Assistant',
      url: 'https://jobs.lever.co/okanagan/def-456',
      applicationUrl: 'https://jobs.lever.co/okanagan/def-456/apply',
      location: 'Penticton, Vernon',
    },
  ]);
});
