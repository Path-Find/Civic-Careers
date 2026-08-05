import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupExpiredJobs, cleanupExpiredJobsForSource } from '../db';

test('cleanupExpiredJobsForSource deactivates only that source missing this run', async () => {
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

  await cleanupExpiredJobsForSource(client as never, 'York University', '2026-08-05 00:00:00');

  const deactivate = statements.find(s => s.sql.includes('SET is_active = 0'));
  assert.ok(deactivate, 'expected an is_active = 0 update');
  assert.match(deactivate!.sql, /source\s*=\s*\?/i, 'must scope to one source');
  assert.match(deactivate!.sql, /raw_jobs/i);
  assert.deepEqual(deactivate!.args, ['York University', 'York University', '2026-08-05 00:00:00']);

  const purge = statements.find(s => /DELETE FROM parse_failures/i.test(s.sql));
  assert.ok(purge, 'expected parse_failures cleanup for delisted rows');
  assert.deepEqual(purge!.args, ['York University', 'York University', '2026-08-05 00:00:00']);
});

test('cleanupExpiredJobs is a no-op global path (do not use for expiry)', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    execute: async (query: { sql: string; args?: unknown[] } | string) => {
      if (typeof query === 'string') statements.push({ sql: query });
      else statements.push(query);
      return { rows: [], rowsAffected: 0 };
    },
  };

  await cleanupExpiredJobs(client as never, '2026-08-05 00:00:00');
  assert.equal(statements.length, 0, 'global cleanup must not touch the database');
});
