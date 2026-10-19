import assert from 'node:assert/strict';
import test from 'node:test';
import { isDayforceNoJobsText } from '../engines/dayforce';

test('recognizes Dayforce\'s explicit no-jobs empty state', () => {
  assert.equal(isDayforceNoJobsText('Search\nWe could not find any jobs based on your search.\nClear filters'), true);
});

test('does not treat an unrelated or blank page as confirmed empty', () => {
  assert.equal(isDayforceNoJobsText(''), false);
  assert.equal(isDayforceNoJobsText('Something went wrong. Please try again later.'), false);
  assert.equal(isDayforceNoJobsText('Jobs\nPage 1 of 3'), false);
});
