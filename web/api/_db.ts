import { Pool } from '@neondatabase/serverless';

type QueryArgs = Array<unknown>;

export interface DbResult {
  rows: Array<Record<string, unknown>>;
  rowsAffected: number;
}

export interface DbClient {
  execute(sql: string): Promise<DbResult>;
  execute(query: { sql: string; args: QueryArgs }): Promise<DbResult>;
}

const pools = new Map<string, Pool>();

function connectionStringFor(kind: 'current' | 'archive'): string {
  const variable = kind === 'current' ? 'NEON_CURRENT_DATABASE_URL' : 'NEON_ARCHIVE_DATABASE_URL';
  const connectionString = process.env[variable];
  if (!connectionString) {
    throw new Error(`Civic Careers database configuration is missing ${variable}`);
  }
  return connectionString;
}

function poolFor(kind: 'current' | 'archive'): Pool {
  const connectionString = connectionStringFor(kind);
  const existing = pools.get(connectionString);
  if (existing) return existing;

  const pool = new Pool({ connectionString, max: 2 });
  pools.set(connectionString, pool);
  return pool;
}

/** Convert the existing SQLite-style placeholders to PostgreSQL placeholders. */
function postgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createDbFor(kind: 'current' | 'archive'): DbClient {
  return {
    async execute(query) {
      const { sql, args } = typeof query === 'string' ? { sql: query, args: [] as QueryArgs } : query;
      const pool = poolFor(kind);
      const result = await pool.query(postgresPlaceholders(sql), args);
      return {
        rows: (result.rows as Array<Record<string, unknown>>).map(row =>
          typeof row.rid === 'string' && /^\d+$/.test(row.rid)
            ? { ...row, rid: Number(row.rid) }
            : row
        ),
        rowsAffected: result.rowCount ?? 0,
      };
    },
  };
}

export function createDb(): DbClient {
  return createDbFor('current');
}

export function createArchiveDb(): DbClient {
  return createDbFor('archive');
}
