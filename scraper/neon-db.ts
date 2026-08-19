import { Pool, type PoolClient } from 'pg';

type Statement = string | { sql: string; args?: unknown[] };
type Row = Record<string, unknown>;

const TABLES = {
  jobs: {
    key: 'id',
    columns: ['id', 'url', 'source', 'is_active', 'is_saved', 'first_seen_at', 'scraped_at', 'verified_at', 'public_id'],
  },
  raw_jobs: {
    key: 'id',
    columns: ['id', 'url', 'source', 'raw_text', 'title', 'first_seen_at', 'scraped_at', 'parsed_at', 'posted_at', 'application_url', 'pending_salary_text', 'pending_is_student', 'pending_duration', 'pending_closing_date', 'pending_closing_date_status', 'pending_location'],
  },
  job_details: {
    key: 'id',
    columns: ['id', 'job_title', 'department', 'location', 'workplace_address', 'salary_range', 'description', 'closing_date', 'is_inventory', 'listing_type', 'is_student', 'salary_min', 'salary_max', 'salary_period', 'work_model', 'employment_type', 'duration', 'hours', 'availability', 'academic_role_type', 'academic_course', 'academic_workload', 'academic_office_hours', 'academic_supervisor', 'academic_appointment_type', 'academic_schedule', 'is_unionized', 'union_name', 'benefits', 'required_skills', 'experience_requirements', 'education_requirements', 'license_requirements', 'vehicle_required', 'language_requirements', 'security_check_required', 'certification_requirements', 'software_requirements', 'medical_requirements', 'responsibility_tags', 'qualification_tags', 'posted_at', 'parser_version', 'start_date', 'career_stage'],
  },
  parse_failures: {
    key: 'id',
    columns: ['id', 'url', 'source', 'reason', 'attempt_count', 'last_failed_at'],
  },
  job_apply_clicks: {
    key: 'job_id',
    columns: ['job_id', 'click_count', 'last_clicked_at'],
  },
  manual_review_changes: {
    key: 'id',
    columns: ['id', 'job_id', 'note', 'before_json', 'after_json', 'changed_at'],
  },
} as const;

// The scraper, parser, and web API use this same advisory-lock key. It keeps
// current/archive moves from racing normal Neon writes within a database.
const ROUTING_LOCK_KEY = 817563421;

type MovableTable = keyof typeof TABLES;
// Routing moves must use these already-held clients. Opening another client
// from either pool while the routing transactions are active can exhaust the
// small pool under concurrent scraper detail saves.
type RoutingClients = { current: PoolClient; archive: PoolClient };

function postgresPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function statementParts(statement: Statement): { sql: string; args: unknown[] } {
  if (typeof statement === 'string') return { sql: statement, args: [] };
  return { sql: statement.sql, args: statement.args ?? [] };
}

function resultSet(result: { rows: Row[]; rowCount: number | null }): { rows: Row[]; rowsAffected: number } {
  return { rows: result.rows, rowsAffected: result.rowCount ?? 0 };
}

export class NeonDatabaseClient {
  readonly currentPool: Pool;
  readonly archivePool: Pool;

  constructor(currentUrl: string, archiveUrl: string) {
    this.currentPool = new Pool({ connectionString: currentUrl, max: 3 });
    this.archivePool = new Pool({ connectionString: archiveUrl, max: 3 });
  }

  async initialize(): Promise<void> {
    const archiveMax = await this.archivePool.query<{ max: string | null }>('SELECT MAX(public_id)::text AS max FROM jobs');
    const currentMax = await this.currentPool.query<{ max: string | null }>('SELECT MAX(public_id)::text AS max FROM jobs');
    const maxPublicId = Math.max(Number(archiveMax.rows[0]?.max ?? 0), Number(currentMax.rows[0]?.max ?? 0));
    if (maxPublicId > 0) {
      await this.currentPool.query(
        `SELECT setval(pg_get_serial_sequence('jobs', 'public_id'), $1, true)`,
        [maxPublicId],
      );
    }
  }

  async execute(statement: Statement) {
    return this.withCurrentLock(async client => {
      const { sql, args } = statementParts(statement);
      return resultSet(await client.query<Row>(postgresPlaceholders(sql), args));
    });
  }

  async batch(statements: Statement[]) {
    return this.withCurrentLock(async client => {
      const results = [];
      for (const statement of statements) {
        const { sql, args } = statementParts(statement);
        results.push(resultSet(await client.query<Row>(postgresPlaceholders(sql), args)));
      }
      return results;
    });
  }

  async restoreIfArchived(id: string): Promise<void> {
    await this.withRoutingLocks(async ({ archive, current }) => {
      const archived = await archive.query<{ id: string }>(
        'SELECT id FROM jobs WHERE id = $1 LIMIT 1',
        [id],
      );
      if (archived.rowCount) await this.moveIds('archive', 'current', [id], { current, archive });
    });
  }

  async moveJobsToArchive(ids: string[]): Promise<void> {
    await this.withRoutingLocks(async ({ current, archive }) => {
      await this.moveIds('current', 'archive', ids, { current, archive });
    });
  }

  async moveSourceMissingJobsToArchive(source: string, runStartedAt: string): Promise<number> {
    return this.withRoutingLocks(async ({ current, archive }) => {
      const result = await current.query<{ id: string }>(
        `SELECT j.id FROM jobs j
         WHERE j.source = $1
           AND j.is_active = 1
           AND j.id NOT IN (
             SELECT id FROM raw_jobs WHERE source = $1 AND scraped_at >= $2
           )`,
        [source, runStartedAt],
      );
      await this.moveIds('current', 'archive', result.rows.map(row => row.id), { current, archive });
      return result.rowCount ?? 0;
    });
  }

  async moveExpiredJobsToArchive(today: string): Promise<number> {
    return this.withRoutingLocks(async ({ current, archive }) => {
      const result = await current.query<{ id: string }>(
        `SELECT j.id FROM jobs j
         JOIN job_details d ON d.id = j.id
         WHERE j.is_active = 1
           AND d.closing_date IS NOT NULL
           AND TRIM(d.closing_date) <> ''
           AND SUBSTR(d.closing_date, 1, 10) < $1`,
        [today],
      );
      await this.moveIds('current', 'archive', result.rows.map(row => row.id), { current, archive });
      return result.rowCount ?? 0;
    });
  }

  private async withCurrentLock<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.currentPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(${ROUTING_LOCK_KEY})`);
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async withRoutingLocks<T>(callback: (clients: RoutingClients) => Promise<T>): Promise<T> {
    const currentLock = await this.currentPool.connect();
    let archiveLock: PoolClient | null = null;
    try {
      // Acquire both pool connections before opening either transaction. If
      // the archive pool is temporarily exhausted, waiting here must not leave
      // a current-database transaction idle until Neon kills it.
      archiveLock = await this.archivePool.connect();
      await currentLock.query('BEGIN');
      await currentLock.query(`SELECT pg_advisory_xact_lock(${ROUTING_LOCK_KEY})`);
      await archiveLock.query('BEGIN');
      await archiveLock.query(`SELECT pg_advisory_xact_lock(${ROUTING_LOCK_KEY})`);
      const result = await callback({ current: currentLock, archive: archiveLock });
      await archiveLock.query('COMMIT');
      await currentLock.query('COMMIT');
      return result;
    } catch (error) {
      await archiveLock?.query('ROLLBACK').catch(() => undefined);
      await currentLock.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      archiveLock?.release();
      currentLock.release();
    }
  }

  private async moveIds(
    from: 'current' | 'archive',
    to: 'current' | 'archive',
    ids: string[],
    clients: RoutingClients,
  ): Promise<void> {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0 || from === to) return;

    const source = from === 'current' ? clients.current : clients.archive;
    const target = to === 'current' ? clients.current : clients.archive;
    const rowsByTable = new Map<MovableTable, Row[]>();

    for (const table of Object.keys(TABLES) as MovableTable[]) {
      const plan = TABLES[table];
      const filterColumn = table === 'manual_review_changes' ? 'job_id' : plan.key;
      const result = await source.query<Row>(
        `SELECT ${plan.columns.join(', ')} FROM ${table} WHERE ${filterColumn} = ANY($1::text[])`,
        [uniqueIds],
      );
      rowsByTable.set(table, result.rows);
    }

    for (const table of Object.keys(TABLES) as MovableTable[]) {
      const rows = rowsByTable.get(table) ?? [];
      if (rows.length === 0) continue;
      const plan = TABLES[table];
      const values: unknown[] = [];
      const placeholders = rows.map((row, rowIndex) => {
        const rowPlaceholders = plan.columns.map((column, columnIndex) => {
          values.push(table === 'jobs' && column === 'is_active'
            ? (to === 'archive' ? 0 : 1)
            : row[column]);
          return `$${rowIndex * plan.columns.length + columnIndex + 1}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      });
      const updates = plan.columns
        .filter(column => column !== plan.key)
        .map(column => `${column} = EXCLUDED.${column}`)
        .join(', ');
      await target.query(
        `INSERT INTO ${table} (${plan.columns.join(', ')}) VALUES ${placeholders.join(', ')}
         ON CONFLICT (${plan.key}) DO UPDATE SET ${updates}`,
        values,
      );
    }

    for (const table of Object.keys(TABLES) as MovableTable[]) {
      const rows = rowsByTable.get(table) ?? [];
      if (rows.length === 0) continue;
      const plan = TABLES[table];
      const keys = rows.map(row => String(row[plan.key]));
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      const verified = await target.query(
        `SELECT ${plan.key} FROM ${table} WHERE ${plan.key} IN (${placeholders})`,
        keys,
      );
      if (verified.rowCount !== new Set(keys).size) {
        throw new Error(`Archive move verification failed for ${table}: expected ${new Set(keys).size}, found ${verified.rowCount ?? 0}`);
      }
    }

    for (const table of ['manual_review_changes', 'job_apply_clicks', 'parse_failures', 'job_details', 'raw_jobs', 'jobs'] as MovableTable[]) {
      const filterColumn = table === 'manual_review_changes' ? 'job_id' : TABLES[table].key;
      await source.query(`DELETE FROM ${table} WHERE ${filterColumn} = ANY($1::text[])`, [uniqueIds]);
    }
  }

  async close(): Promise<void> {
    await Promise.all([this.currentPool.end(), this.archivePool.end()]);
  }
}

export async function createNeonDatabaseClient(): Promise<NeonDatabaseClient> {
  const currentUrl = process.env.NEON_CURRENT_DATABASE_URL;
  const archiveUrl = process.env.NEON_ARCHIVE_DATABASE_URL;
  if (!currentUrl || !archiveUrl) {
    throw new Error('Neon database configuration is missing NEON_CURRENT_DATABASE_URL or NEON_ARCHIVE_DATABASE_URL');
  }
  const client = new NeonDatabaseClient(currentUrl, archiveUrl);
  await client.initialize();
  return client;
}
