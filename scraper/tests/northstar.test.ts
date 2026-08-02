import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNorthStarJobs } from '../engines/northstar';

test('extracts and deduplicates NorthStar Popup detail URLs', () => {
  assert.deepEqual(extractNorthStarJobs([
    {
      title: 'Support Staff',
      href: 'javascript:Popup("https://www.northstarats.com/University-of-Winnipeg/support/123")',
    },
    {
      title: 'Support Staff duplicate',
      href: 'javascript:Popup("https://www.northstarats.com/University-of-Winnipeg/support/123")',
    },
    {
      title: 'Invalid link',
      href: 'javascript:Popup("https://example.com/not-northstar/456")',
    },
  ]), [
    {
      title: 'Support Staff',
      url: 'https://www.northstarats.com/University-of-Winnipeg/support/123',
    },
  ]);
});
