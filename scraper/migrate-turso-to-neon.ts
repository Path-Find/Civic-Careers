/**
 * Copy Turso/libSQL into two Neon Postgres databases:
 *   - current: active jobs and live scraper state
 *   - archive: inactive/expired jobs and their parsed history
 *
 * Safety:
 * - Dry-run by default. Pass --apply to write Neon.
 * - Uses keyset pagination rather than OFFSET or random ordering.
 * - Reads each source table once and routes rows in memory.
 * - Upserts by the existing primary key, so a failed run can be resumed.
 * - Never writes to Turso.
 *
 * Required environment:
 *   TURSO_URL, TURSO_AUTH_TOKEN,
 *   NEON_CURRENT_DATABASE_URL, NEON_ARCHIVE_DATABASE_URL
 *
 * Examples:
 *   npx tsx migrate-turso-to-neon.ts
 *   npx tsx migrate-turso-to-neon.ts --apply
 */
import { createClient } from '@libsql/client';
import { Pool, type PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

type SourceRow = Record<string, unknown>;
type Route = 'current' | 'archive';

type TablePlan = {
  name: string;
  keyColumn: string;
  columns: string[];
  timestampColumns?: string[];
  route?: (row: SourceRow, jobIsActive: Map<string, boolean>) => Route;
};

const BATCH_SIZE = 1000;

const jobsPlan: TablePlan = {
  name: 'jobs',
  keyColumn: 'id',
  columns: ['id', 'url', 'source', 'is_active', 'is_saved', 'first_seen_at', 'scraped_at', 'verified_at', 'public_id'],
  timestampColumns: ['first_seen_at', 'scraped_at', 'verified_at'],
  route: (row) => Number(row.is_active ?? 0) === 1 ? 'current' : 'archive',
};

const routedTablePlans: TablePlan[] = [
  {
    name: 'raw_jobs',
    keyColumn: 'id',
    columns: ['id', 'url', 'source', 'raw_text', 'title', 'first_seen_at', 'scraped_at', 'parsed_at', 'posted_at', 'application_url', 'pending_salary_text', 'pending_is_student', 'pending_duration', 'pending_closing_date', 'pending_closing_date_status', 'pending_location'],
    timestampColumns: ['first_seen_at', 'scraped_at', 'parsed_at'],
  },
  {
    name: 'job_details',
    keyColumn: 'id',
    columns: ['id', 'job_title', 'department', 'location', 'workplace_address', 'salary_range', 'description', 'closing_date', 'is_inventory', 'listing_type', 'is_student', 'salary_min', 'salary_max', 'salary_period', 'work_model', 'employment_type', 'duration', 'hours', 'availability', 'academic_role_type', 'academic_course', 'academic_workload', 'academic_office_hours', 'academic_supervisor', 'academic_appointment_type', 'academic_schedule', 'is_unionized', 'union_name', 'benefits', 'required_skills', 'experience_requirements', 'education_requirements', 'license_requirements', 'vehicle_required', 'language_requirements', 'security_check_required', 'certification_requirements', 'software_requirements', 'medical_requirements', 'responsibility_tags', 'qualification_tags', 'posted_at', 'parser_version', 'start_date', 'career_stage'],
  },
  {
    name: 'parse_failures',
    keyColumn: 'id',
    columns: ['id', 'url', 'source', 'reason', 'attempt_count', 'last_failed_at'],
    timestampColumns: ['last_failed_at'],
  },
  {
    name: 'job_apply_clicks',
    keyColumn: 'job_id',
    columns: ['job_id', 'click_count', 'last_clicked_at'],
    timestampColumns: ['last_clicked_at'],
  },
  {
    name: 'manual_review_changes',
    keyColumn: 'id',
    columns: ['id', 'job_id', 'note', 'before_json', 'after_json', 'changed_at'],
    timestampColumns: ['changed_at'],
  },
];

const currentOnlyTablePlans: TablePlan[] = [
  {
    name: 'source_scrape_status',
    keyColumn: 'source',
    columns: ['source', 'last_successful_scrape_at', 'last_status'],
    timestampColumns: ['last_successful_scrape_at'],
  },
  {
    name: 'trial_source_results',
    keyColumn: 'source',
    columns: ['source', 'consecutive_successes', 'last_status', 'last_job_count', 'last_run_at'],
    timestampColumns: ['last_run_at'],
  },
];

const apply = process.argv.includes('--apply');
const onlyIndex = process.argv.indexOf('--only');
const onlyTable = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
const onlyTables = onlyTable ? new Set(onlyTable.split(',').map((table) => table.trim()).filter(Boolean)) : null;
const sourceDb = createClient({
  url: requireEnvironment('TURSO_URL'),
  authToken: requireEnvironment('TURSO_AUTH_TOKEN'),
});

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeValue(value: unknown, timestampColumns: Set<string>, column: string): unknown {
  if (value == null) return null;
  if (timestampColumns.has(column) && String(value).trim() === '') return null;
  return value;
}

function upsertSql(plan: TablePlan): string {
  const updates = plan.columns
    .filter((column) => column !== plan.keyColumn)
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');
  return `INSERT INTO ${plan.name} (${plan.columns.join(', ')}) VALUES `;
}

async function forEachBatch(plan: TablePlan, callback: (rows: SourceRow[]) => Promise<void>): Promise<number> {
  let lastKey: string | number | null = null;
  let total = 0;

  while (true) {
    const keyClause = lastKey == null ? '' : `WHERE ${plan.keyColumn} > ?`;
    const args = lastKey == null ? [BATCH_SIZE] : [lastKey, BATCH_SIZE];
    const result = await sourceDb.execute({
      sql: `SELECT ${plan.columns.join(', ')} FROM ${plan.name} ${keyClause} ORDER BY ${plan.keyColumn} LIMIT ?`,
      args,
    });
    const batch = result.rows as SourceRow[];
    if (batch.length === 0) break;
    await callback(batch);
    total += batch.length;
    lastKey = batch.at(-1)?.[plan.keyColumn] as string | number;
    if (batch.length < BATCH_SIZE) break;
  }

  return total;
}

async function writeRows(client: PoolClient, plan: TablePlan, rows: SourceRow[]): Promise<void> {
  if (rows.length === 0) return;
  const timestampColumns = new Set(plan.timestampColumns ?? []);
  const values: unknown[] = [];
  const placeholders = rows.map((row, rowIndex) => {
    const rowPlaceholders = plan.columns.map((column, columnIndex) => {
      values.push(normalizeValue(row[column], timestampColumns, column));
      return `$${rowIndex * plan.columns.length + columnIndex + 1}`;
    });
    return `(${rowPlaceholders.join(', ')})`;
  });
  const updates = plan.columns
    .filter((column) => column !== plan.keyColumn)
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');
  const insert = `${upsertSql(plan)}${placeholders.join(', ')} ON CONFLICT (${plan.keyColumn}) DO UPDATE SET ${updates}`;
  await client.query('BEGIN');
  try {
    await client.query(insert, values);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function synchronizeSequences(currentPool: Pool, archivePool: Pool): Promise<void> {
  const [currentJobs, archiveJobs] = await Promise.all([
    currentPool.query<{ max: string | null }>('SELECT MAX(public_id)::text AS max FROM jobs'),
    archivePool.query<{ max: string | null }>('SELECT MAX(public_id)::text AS max FROM jobs'),
  ]);
  const globalMaxPublicId = Math.max(
    Number(currentJobs.rows[0]?.max ?? 0),
    Number(archiveJobs.rows[0]?.max ?? 0),
  );
  await currentPool.query(`
    SELECT setval(
      pg_get_serial_sequence('jobs', 'public_id'),
      $1,
      true
    )
  `, [Math.max(globalMaxPublicId, 1)]);
  await archivePool.query(`
    SELECT setval(
      pg_get_serial_sequence('jobs', 'public_id'),
      GREATEST(COALESCE(MAX(public_id), 1), 1),
      MAX(public_id) IS NOT NULL
    )
    FROM jobs
  `);
  await currentPool.query(`
    SELECT setval(
      pg_get_serial_sequence('manual_review_changes', 'id'),
      COALESCE(MAX(id), 1),
      MAX(id) IS NOT NULL
    )
    FROM manual_review_changes
  `);
}

async function main() {
  const currentPool = new Pool({ connectionString: requireEnvironment('NEON_CURRENT_DATABASE_URL'), max: 2 });
  const archivePool = new Pool({ connectionString: requireEnvironment('NEON_ARCHIVE_DATABASE_URL'), max: 2 });
  const jobIsActive = new Map<string, boolean>();

  try {
    console.log(apply ? 'APPLY mode: writing Neon current/archive only' : 'DRY-RUN mode: no writes');
    if (onlyTable) console.log(`Resuming only table: ${onlyTable}`);

    const clients = new Map<Route, PoolClient>();
    if (apply) {
      clients.set('current', await currentPool.connect());
      clients.set('archive', await archivePool.connect());
    }

    try {
      if (!onlyTable) {
        const jobsByRoute = new Map<Route, number>([['current', 0], ['archive', 0]]);
        await forEachBatch(jobsPlan, async (rows) => {
          const currentRows: SourceRow[] = [];
          const archiveRows: SourceRow[] = [];
          for (const row of rows) {
            jobIsActive.set(String(row.id), Number(row.is_active ?? 0) === 1);
            (jobsPlan.route!(row, jobIsActive) === 'archive' ? archiveRows : currentRows).push(row);
          }
          jobsByRoute.set('current', jobsByRoute.get('current')! + currentRows.length);
          jobsByRoute.set('archive', jobsByRoute.get('archive')! + archiveRows.length);
          if (apply) {
            await writeRows(clients.get('current')!, jobsPlan, currentRows);
            await writeRows(clients.get('archive')!, jobsPlan, archiveRows);
          }
        });
        console.log(`[jobs] current=${jobsByRoute.get('current')} archive=${jobsByRoute.get('archive')}`);
      } else {
        const [currentJobs, archiveJobs] = await Promise.all([
          currentPool.query<{ id: string }>('SELECT id FROM jobs'),
          archivePool.query<{ id: string }>('SELECT id FROM jobs'),
        ]);
        for (const row of currentJobs.rows) jobIsActive.set(row.id, true);
        for (const row of archiveJobs.rows) jobIsActive.set(row.id, false);
      }

      for (const plan of [...routedTablePlans, ...currentOnlyTablePlans]) {
        if (onlyTables && !onlyTables.has(plan.name)) continue;
        const totals = new Map<Route, number>([['current', 0], ['archive', 0]]);
        await forEachBatch(plan, async (rows) => {
          const currentRows: SourceRow[] = [];
          const archiveRows: SourceRow[] = [];
          for (const row of rows) {
            const route = plan.route?.(row, jobIsActive)
              ?? (jobIsActive.get(String(row.id ?? row.job_id)) === false ? 'archive' : 'current');
            (route === 'archive' ? archiveRows : currentRows).push(row);
          }
          totals.set('current', totals.get('current')! + currentRows.length);
          totals.set('archive', totals.get('archive')! + archiveRows.length);
          if (apply) {
            await writeRows(clients.get('current')!, plan, currentRows);
            await writeRows(clients.get('archive')!, plan, archiveRows);
          }
        });
        console.log(`[${plan.name}] current=${totals.get('current')} archive=${totals.get('archive')}`);
      }
    } finally {
      clients.get('current')?.release();
      clients.get('archive')?.release();
    }

    if (apply) {
      await synchronizeSequences(currentPool, archivePool);
      console.log('Identity sequences synchronized.');
    }
  } finally {
    await currentPool.end();
    await archivePool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
