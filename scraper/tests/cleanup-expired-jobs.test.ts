import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupExpiredJobs } from '../db';

test('cleanupExpiredJobs only deactivates within sources scraped this run', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    execute: async (query: { sql: string; args?: unknown[] } | string) => {
      if (typeof query === 'string') {
        statements.push({ sql: query });
      } else {
        statements.push(query);
      }
      return { rows: [], rowsAffected: 0 };
    },
  };

  await cleanupExpiredJobs(client as never, '2026-08-05 00:00:00');

  const deactivate = statements.find(s => s.sql.includes('SET is_active = 0'));
  assert.ok(deactivate, 'expected an is_active = 0 update');
  assert.match(deactivate!.sql, /source IN/i, 'must scope by source');
  assert.match(deactivate!.sql, /DISTINCT source/i);
  assert.deepEqual(deactivate!.args, ['2026-08-05 00:00:00', '2026-08-05 00:00:00']);
});
