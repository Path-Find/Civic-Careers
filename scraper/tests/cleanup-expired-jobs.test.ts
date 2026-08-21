import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupExpiredJobs, cleanupExpiredJobsForSource } from '../db';
import { looksUnrendered } from '../utils';

test('cleanupExpiredJobsForSource deactivates only that source missing this run', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    execute: async (query: { sql: string; args?: unknown[] } | string) => {
      if (typeof query === 'string') {
        statements.push({ sql: query });
      } else {
        statements.push(query);
      }
      if (typeof query !== 'string' && /SELECT COUNT\(\*\) AS count FROM raw_jobs/i.test(query.sql)) {
        return { rows: [{ count: 1 }], rowsAffected: 0 };
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

test('cleanupExpiredJobsForSource refuses to archive a source when the scrape captured zero postings', async () => {
  const statements: string[] = [];
  const client = {
    execute: async (query: { sql: string } | string) => {
      const sql = typeof query === 'string' ? query : query.sql;
      statements.push(sql);
      return { rows: [{ count: 0 }], rowsAffected: 0 };
    },
  };

  await assert.rejects(
    cleanupExpiredJobsForSource(client as never, 'VIA TGF Inc.', '2026-08-21 00:00:00'),
    /No postings were captured; refusing to archive/i,
  );
  assert.equal(statements.length, 1);
  assert.match(statements[0], /SELECT COUNT\(\*\)/i);
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

test('recognizes Workday and loading-page shells as unrendered', () => {
  assert.equal(looksUnrendered('Skip to main contentLoadingFollow UsPrivacy Statement'), true);
  assert.equal(looksUnrendered('Loading... Skip to Main Content Sign In'), true);
});
