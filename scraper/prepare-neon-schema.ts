/**
 * Create or upgrade the two Neon databases used by Civic Careers.
 *
 * This is safe to run before the first production copy. It does not read or
 * write Turso and it never drops a table.
 *
 * Required environment:
 *   NEON_CURRENT_DATABASE_URL, NEON_ARCHIVE_DATABASE_URL
 */
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function prepare(pool: Pool, label: string, schema: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);

    await client.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_id BIGINT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS application_url TEXT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_salary_text TEXT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_is_student INTEGER;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_duration TEXT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_closing_date TEXT;
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_closing_date_status TEXT DEFAULT 'not_checked';
      ALTER TABLE raw_jobs ADD COLUMN IF NOT EXISTS pending_location TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS workplace_address TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_role_type TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_course TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_workload TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_office_hours TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_supervisor TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_appointment_type TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS academic_schedule TEXT;
      ALTER TABLE job_details ADD COLUMN IF NOT EXISTS career_stage TEXT;
      ALTER TABLE job_details ALTER COLUMN is_inventory DROP NOT NULL;
      ALTER TABLE job_details ALTER COLUMN listing_type DROP NOT NULL;
      ALTER TABLE job_details ALTER COLUMN is_student DROP NOT NULL;
    `);

    const sequence = await client.query<{ sequence_name: string | null; is_identity: string }>(`
      SELECT pg_get_serial_sequence('public.jobs', 'public_id') AS sequence_name,
             is_identity
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'public_id'
    `);
    const sequenceName = sequence.rows[0]?.sequence_name;
    if (!sequenceName) throw new Error(`${label}: jobs.public_id has no identity/sequence`);
    if (sequence.rows[0]?.is_identity !== 'YES') {
      const quotedSequence = sequenceName.replaceAll("'", "''");
      await client.query(`ALTER TABLE jobs ALTER COLUMN public_id SET DEFAULT nextval('${quotedSequence}'::regclass)`);
    }

    await client.query(`
      CREATE INDEX IF NOT EXISTS jobs_active_scraped_idx ON jobs (is_active, scraped_at DESC);
      CREATE INDEX IF NOT EXISTS jobs_active_source_idx ON jobs (is_active, source);
      CREATE INDEX IF NOT EXISTS jobs_verified_idx ON jobs (verified_at, is_active);
      CREATE INDEX IF NOT EXISTS job_details_closing_date_idx ON job_details (closing_date);
      CREATE INDEX IF NOT EXISTS raw_jobs_parsed_scraped_idx ON raw_jobs (parsed_at, scraped_at);
      CREATE INDEX IF NOT EXISTS raw_jobs_source_scraped_idx ON raw_jobs (source, scraped_at DESC);
    `);
    await client.query('COMMIT');
    console.log(`[schema] ${label} ready`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const schema = await readFile(new URL('./neon-schema.sql', import.meta.url), 'utf8');
  const current = new Pool({ connectionString: requireEnvironment('NEON_CURRENT_DATABASE_URL'), max: 2 });
  const archive = new Pool({ connectionString: requireEnvironment('NEON_ARCHIVE_DATABASE_URL'), max: 2 });

  try {
    await prepare(current, 'current', schema);
    await prepare(archive, 'archive', schema);
  } finally {
    await Promise.all([current.end(), archive.end()]);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
