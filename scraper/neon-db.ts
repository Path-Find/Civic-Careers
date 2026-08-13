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

type MovableTable = keyof typeof TABLES;

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
  private readonly archiveIds = new Set<string>();

  constructor(currentUrl: string, archiveUrl: string) {
    this.currentPool = new Pool({ connectionString: currentUrl, max: 2 });
    this.archivePool = new Pool({ connectionString: archiveUrl, max: 2 });
  }

  async initialize(): Promise<void> {
    const archiveJobs = await this.archivePool.query<{ id: string }>('SELECT id FROM jobs');
    for (const row of archiveJobs.rows) this.archiveIds.add(row.id);

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
    const { sql, args } = statementParts(statement);
    return resultSet(await this.currentPool.query<Row>(postgresPlaceholders(sql), args));
  }

  async batch(statements: Statement[]) {
    const client = await this.currentPool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const statement of statements) {
        const { sql, args } = statementParts(statement);
        results.push(resultSet(await client.query<Row>(postgresPlaceholders(sql), args)));
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreIfArchived(id: string): Promise<void> {
    if (this.archiveIds.has(id)) await this.moveIds('archive', 'current', [id]);
  }

  async moveJobsToArchive(ids: string[]): Promise<void> {
    await this.moveIds('current', 'archive', ids);
  }

  private async moveIds(from: 'current' | 'archive', to: 'current' | 'archive', ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0 || from === to) return;

    const sourcePool = from === 'current' ? this.currentPool : this.archivePool;
    const targetPool = to === 'current' ? this.currentPool : this.archivePool;
    const rowsByTable = new Map<MovableTable, Row[]>();

    for (const table of Object.keys(TABLES) as MovableTable[]) {
      const plan = TABLES[table];
      const filterColumn = table === 'manual_review_changes' ? 'job_id' : plan.key;
      const result = await sourcePool.query<Row>(
        `SELECT ${plan.columns.join(', ')} FROM ${table} WHERE ${filterColumn} = ANY($1::text[])`,
        [uniqueIds],
      );
      rowsByTable.set(table, result.rows);
    }

    const target = await targetPool.connect();
    try {
      await target.query('BEGIN');
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
      await target.query('COMMIT');
    } catch (error) {
      await target.query('ROLLBACK');
      throw error;
    } finally {
      target.release();
    }

    const source = await sourcePool.connect();
    try {
      await source.query('BEGIN');
      for (const table of ['manual_review_changes', 'job_apply_clicks', 'parse_failures', 'job_details', 'raw_jobs', 'jobs'] as MovableTable[]) {
        const filterColumn = table === 'manual_review_changes' ? 'job_id' : TABLES[table].key;
        await source.query(`DELETE FROM ${table} WHERE ${filterColumn} = ANY($1::text[])`, [uniqueIds]);
      }
      await source.query('COMMIT');
    } catch (error) {
      await source.query('ROLLBACK');
      throw error;
    } finally {
      source.release();
    }

    if (to === 'archive') {
      for (const id of uniqueIds) this.archiveIds.add(id);
    } else {
      for (const id of uniqueIds) this.archiveIds.delete(id);
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
