import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRSSJobs } from '../engines/rss';

test('extracts RSS detail links using either jobid or id query parameters', () => {
  const xml = `
    <rss><channel>
      <item><link>https://example.com/job?jobid=ABC123</link></item>
      <item><link>https://example.com/ViewCompetition.aspx?id=7383</link></item>
      <item><link>https://example.com/no-id</link></item>
    </channel></rss>
  `;

  assert.deepEqual(extractRSSJobs(xml, 'conestoga'), [
    { id: 'conestoga_abc123', url: 'https://example.com/job?jobid=ABC123' },
    { id: 'conestoga_7383', url: 'https://example.com/ViewCompetition.aspx?id=7383' },
  ]);
});
