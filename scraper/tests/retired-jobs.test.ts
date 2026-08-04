import assert from 'node:assert/strict';
import test from 'node:test';
import { scrapeRawAndStage } from '../utils';
import { isRetiredGovernmentOfCanadaPage } from '../source-fixes';

test('deactivates a parsed job when its stored raw page is retired', async () => {
  const statements: string[] = [];
  const client = {
    execute: async () => ({
      rows: [{ parsed_at: '2026-07-27 13:31:34', raw_text: 'This job has moved or is no longer available. Please search our current job openings.' }],
    }),
    batch: async (queries: Array<{ sql: string }>) => {
      statements.push(...queries.map(query => query.sql));
      return { rows: [] };
    },
  };
  const context = {
    newPage: async () => {
      throw new Error('retired stored pages should not be fetched again');
    },
  };

  const result = await scrapeRawAndStage(
    client as never,
    context as never,
    { id: '2352259', url: 'https://example.test/job/2352259', retiredPage: isRetiredGovernmentOfCanadaPage },
    'Government of Canada',
  );

  assert.equal(result, true);
  assert.equal(statements.some(statement => statement.includes('is_active = 0')), true);
  assert.equal(statements.some(statement => statement.includes('parsed_at = CURRENT_TIMESTAMP')), true);
});
