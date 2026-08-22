/**
 * Export the split Neon databases back into the single Turso database for an
 * emergency rollback. This is dry-run by default; pass --apply to write.
 *
 * The export is additive/upserting only. It never deletes Turso rows, so a
 * failed retry cannot destroy the last rollback copy. Freeze production
 * writes before using --apply, then verify Turso before redeploying the old
 * application.
 *
 * Required environment:
 *   TURSO_URL, TURSO_AUTH_TOKEN,
 *   NEON_CURRENT_DATABASE_URL, NEON_ARCHIVE_DATABASE_URL
 */
import { createClient } from '@libsql/client';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

type NeonRow = Record<string, unknown>;
type TursoValue = string | number | boolean | null;
type TablePlan = { name: string; keyColumn: string; columns: string[] };

const BATCH_SIZE = 100;
const apply = process.argv.includes('--apply');

const plans: TablePlan[] = [
  { name: 'jobs', keyColumn: 'id', columns: ['id', 'url', 'source', 'is_active', 'is_saved', 'first_seen_at', 'scraped_at', 'verified_at', 'publication_status', 'public_id'] },
  { name: 'raw_jobs', keyColumn: 'id', columns: ['id', 'url', 'source', 'raw_text', 'title', 'first_seen_at', 'scraped_at', 'parsed_at', 'posted_at', 'application_url', 'pending_salary_text', 'pending_is_student', 'pending_duration', 'pending_closing_date', 'pending_closing_date_status', 'pending_location'] },
  { name: 'job_details', keyColumn: 'id', columns: ['id', 'job_title', 'department', 'location', 'workplace_address', 'salary_range', 'description', 'closing_date', 'is_inventory', 'listing_type', 'is_student', 'salary_min', 'salary_max', 'salary_period', 'work_model', 'employment_type', 'duration', 'hours', 'availability', 'academic_role_type', 'academic_course', 'academic_workload', 'academic_office_hours', 'academic_supervisor', 'academic_appointment_type', 'academic_schedule', 'is_unionized', 'union_name', 'benefits', 'required_skills', 'experience_requirements', 'education_requirements', 'license_requirements', 'vehicle_required', 'language_requirements', 'security_check_required', 'certification_requirements', 'software_requirements', 'medical_requirements', 'responsibility_tags', 'qualification_tags', 'posted_at', 'parser_version', 'start_date', 'career_stage'] },
  { name: 'parse_failures', keyColumn: 'id', columns: ['id', 'url', 'source', 'reason', 'attempt_count', 'last_failed_at'] },
  { name: 'job_apply_clicks', keyColumn: 'job_id', columns: ['job_id', 'click_count', 'last_clicked_at'] },
  { name: 'manual_review_changes', keyColumn: 'id', columns: ['id', 'job_id', 'note', 'before_json', 'after_json', 'changed_at'] },
  { name: 'source_scrape_status', keyColumn: 'source', columns: ['source', 'last_successful_scrape_at', 'last_status'] },
  { name: 'trial_source_results', keyColumn: 'source', columns: ['source', 'consecutive_successes', 'last_status', 'last_job_count', 'last_run_at'] },
];

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeValue(value: unknown): TursoValue {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().replace('T', ' ').replace('Z', '');
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return String(value);
}

async function readMergedRows(current: Pool, archive: Pool, plan: TablePlan): Promise<{ current: NeonRow[]; archive: NeonRow[]; merged: NeonRow[] }> {
  const [currentResult, archiveResult] = await Promise.all([
    current.query<NeonRow>(`SELECT ${plan.columns.join(', ')} FROM ${plan.name} ORDER BY ${plan.keyColumn}`),
    archive.query<NeonRow>(`SELECT ${plan.columns.join(', ')} FROM ${plan.name} ORDER BY ${plan.keyColumn}`),
  ]);
  const seen = new Set<string>();
  for (const row of [...currentResult.rows, ...archiveResult.rows]) {
    const key = String(row[plan.keyColumn]);
    if (seen.has(key)) throw new Error(`${plan.name} contains duplicate key across Neon databases: ${key}`);
    seen.add(key);
  }
  return { current: currentResult.rows, archive: archiveResult.rows, merged: [...currentResult.rows, ...archiveResult.rows] };
}

function upsertStatements(plan: TablePlan, rows: NeonRow[]) {
  const updates = plan.columns
    .filter(column => column !== plan.keyColumn)
    .map(column => `${column} = excluded.${column}`)
    .join(', ');
  return rows.map(row => ({
    sql: `INSERT INTO ${plan.name} (${plan.columns.join(', ')}) VALUES (${plan.columns.map(() => '?').join(', ')})
          ON CONFLICT(${plan.keyColumn}) DO UPDATE SET ${updates}`,
    args: plan.columns.map(column => normalizeValue(row[column])),
  }));
}

async function main() {
  const current = new Pool({ connectionString: requireEnvironment('NEON_CURRENT_DATABASE_URL'), max: 2 });
  const archive = new Pool({ connectionString: requireEnvironment('NEON_ARCHIVE_DATABASE_URL'), max: 2 });
  const turso = createClient({
    url: requireEnvironment('TURSO_URL'),
    authToken: requireEnvironment('TURSO_AUTH_TOKEN'),
  });

  try {
    console.log(apply
      ? 'APPLY mode: upserting Neon current/archive into Turso; no Turso rows will be deleted'
      : 'DRY-RUN mode: reading Neon only; Turso will not be written');
    for (const plan of plans) {
      const rows = await readMergedRows(current, archive, plan);
      console.log(`[${plan.name}] current=${rows.current.length} archive=${rows.archive.length} total=${rows.merged.length}`);
      if (!apply) continue;
      const statements = upsertStatements(plan, rows.merged);
      for (let index = 0; index < statements.length; index += BATCH_SIZE) {
        await turso.batch(statements.slice(index, index + BATCH_SIZE), 'write');
      }
    }
    console.log(apply ? 'Neon-to-Turso rollback export completed.' : 'Dry run complete. Re-run with --apply only during a rollback window.');
  } finally {
    await Promise.all([current.end(), archive.end()]);
    turso.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
