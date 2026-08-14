import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient } from 'pg';
import { NeonDatabaseClient } from '../neon-db';

type Query = (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;

function makePool(query: Query) {
  let connections = 0;
  return {
    connect: async () => {
      connections += 1;
      return { query, release: () => undefined } as unknown as PoolClient;
    },
    query: async () => {
      throw new Error('Pool.query must not be used while routing locks are held');
    },
    end: async () => undefined,
    get connections() {
      return connections;
    },
  };
}

test('restoring an archived job reuses both held routing connections', async () => {
  const archivedJob = {
    id: 'job-1',
    url: 'https://example.com/job-1',
    source: 'Example Employer',
    is_active: 0,
    is_saved: 0,
    first_seen_at: '2026-08-01 00:00:00',
    scraped_at: '2026-08-01 00:00:00',
    verified_at: null,
    public_id: 1,
  };

  const archiveQuery: Query = async (text) => {
    if (text.includes('SELECT id FROM jobs WHERE id = $1 LIMIT 1')) {
      return { rows: [{ id: 'job-1' }], rowCount: 1 };
    }
    if (text.includes('SELECT id, url, source, is_active')) {
      return { rows: [archivedJob], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  };

  const currentQuery: Query = async (text) => {
    if (text.startsWith('SELECT id FROM jobs WHERE id IN')) {
      return { rows: [{ id: 'job-1' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  };

  const currentPool = makePool(currentQuery);
  const archivePool = makePool(archiveQuery);
  const database = new NeonDatabaseClient('postgres://current', 'postgres://archive');
  Object.defineProperty(database, 'currentPool', { value: currentPool });
  Object.defineProperty(database, 'archivePool', { value: archivePool });

  await database.restoreIfArchived('job-1');

  assert.equal(currentPool.connections, 1);
  assert.equal(archivePool.connections, 1);
});
