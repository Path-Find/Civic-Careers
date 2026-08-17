import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';
import { extractRawJobTitle, extractUrlJobTitle, isUsableJobTitle, normalizeSourceJobTitle } from './title';
import { extractPendingMetadata } from './pending-metadata';
import { extractClosingDateStatus } from './closing-date';
import { classifyRawCapture } from './capture-quality';
import { createNeonDatabaseClient, NeonDatabaseClient } from './neon-db';
dotenv.config({ quiet: true });

// After this many failed parse attempts, a job is excluded from getUnparsedJobs
// (stops burning AI calls on something permanently broken) but stays in
// parse_failures for manual review. A fresh rescrape (raw_jobs.scraped_at
// past the last failure) overrides the cap, since new raw_text means a
// scraper fix may have actually resolved the underlying cause.
export const MAX_PARSE_ATTEMPTS = 2;

const DB_INIT_RETRY_DELAYS_MS = [2000, 5000];

function isRetryableDbInitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error && typeof error === 'object' && 'cause' in error
    ? String((error as { cause?: unknown }).cause)
    : '';
  return /fetch failed|timeout|econnreset|econnrefused|temporarily unavailable|\b(?:429|502|503|504)\b/i.test(`${message} ${cause}`);
}

export async function initDb(): Promise<Client> {
  for (let attempt = 0; attempt <= DB_INIT_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await initializeDbOnce();
    } catch (error) {
      const isLastAttempt = attempt === DB_INIT_RETRY_DELAYS_MS.length;
      if (isLastAttempt || !isRetryableDbInitError(error)) throw error;

      const delay = DB_INIT_RETRY_DELAYS_MS[attempt];
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[db] Initialization attempt ${attempt + 1} failed (${message}); retrying in ${delay}ms.`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Database initialization failed after all retry attempts.');
}

async function initializeDbOnce(): Promise<Client> {
  if (process.env.NEON_CURRENT_DATABASE_URL) {
    return await createNeonDatabaseClient() as unknown as Client;
  }

  const client = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS raw_jobs (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      title TEXT,
      pending_salary_text TEXT,
      pending_is_student INTEGER,
      pending_location TEXT,
      pending_duration TEXT,
      pending_closing_date TEXT,
      pending_closing_date_status TEXT DEFAULT 'not_checked',
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      parsed_at DATETIME,
      posted_at TEXT,
      application_url TEXT
    )
  `);

  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN title TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }

  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN first_seen_at DATETIME`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN posted_at TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN application_url TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_salary_text TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_is_student INTEGER`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_location TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_duration TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_closing_date TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN pending_closing_date_status TEXT DEFAULT 'not_checked'`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  await client.execute(`
    UPDATE raw_jobs
    SET pending_closing_date_status = CASE
      WHEN pending_closing_date IS NOT NULL AND TRIM(pending_closing_date) <> '' THEN 'known'
      WHEN pending_closing_date_status IS NULL OR TRIM(pending_closing_date_status) = '' THEN 'not_checked'
      ELSE pending_closing_date_status
    END
    WHERE pending_closing_date_status IS NULL
       OR TRIM(pending_closing_date_status) = ''
       OR (pending_closing_date IS NOT NULL AND TRIM(pending_closing_date) <> '' AND pending_closing_date_status <> 'known')
  `);
  await client.execute(`UPDATE raw_jobs SET first_seen_at = COALESCE(first_seen_at, scraped_at) WHERE first_seen_at IS NULL`);

  // Scraper-owned fields only
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      url TEXT,
      source TEXT,
      is_active INTEGER DEFAULT 1,
      is_saved INTEGER DEFAULT 0,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await client.execute(`ALTER TABLE jobs ADD COLUMN first_seen_at DATETIME`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  await client.execute(`
    UPDATE jobs
    SET first_seen_at = COALESCE(
      first_seen_at,
      (SELECT first_seen_at FROM raw_jobs WHERE raw_jobs.id = jobs.id),
      scraped_at
    )
    WHERE first_seen_at IS NULL
  `);

  // Public URLs use an explicit numeric ID rather than SQLite's internal
  // rowid or a source-specific job key. Seed existing rows from rowid once;
  // subsequent writes preserve the assigned value.
  try {
    await client.execute(`ALTER TABLE jobs ADD COLUMN public_id INTEGER`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  await client.execute(`UPDATE jobs SET public_id = rowid WHERE public_id IS NULL`);
  await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS jobs_public_id_idx ON jobs(public_id)`);
  // Homepage and company-list queries always begin with active jobs and then
  // group or sort by source/freshness. Keep those scans indexed.
  await client.execute(`CREATE INDEX IF NOT EXISTS jobs_active_source_idx ON jobs(is_active, source)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS jobs_active_scraped_idx ON jobs(is_active, scraped_at DESC)`);
  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS jobs_assign_public_id
    AFTER INSERT ON jobs
    WHEN NEW.public_id IS NULL
    BEGIN
      UPDATE jobs SET public_id = NEW.rowid WHERE rowid = NEW.rowid;
    END
  `);

  // AI-owned fields — never touched by the scraper
  await client.execute(`
    CREATE TABLE IF NOT EXISTS job_details (
      id TEXT PRIMARY KEY REFERENCES jobs(id),
      job_title TEXT,
      department TEXT,
      location TEXT,
      workplace_address TEXT,
      salary_range TEXT,
      description TEXT,
      closing_date TEXT,
      is_inventory INTEGER DEFAULT 0,
      listing_type TEXT DEFAULT 'regular',
      is_student INTEGER DEFAULT 0,
      salary_min NUMBER,
      salary_max NUMBER,
      salary_period TEXT,
      work_model TEXT,
      employment_type TEXT,
      duration TEXT,
      hours TEXT,
      availability TEXT,
      academic_role_type TEXT,
      academic_course TEXT,
      academic_workload TEXT,
      academic_office_hours TEXT,
      academic_supervisor TEXT,
      academic_appointment_type TEXT,
      academic_schedule TEXT,
      is_unionized INTEGER,
      union_name TEXT,
      benefits TEXT,
      required_skills TEXT,
      experience_requirements TEXT,
      education_requirements TEXT,
      license_requirements TEXT,
      vehicle_required INTEGER,
      language_requirements TEXT,
      security_check_required INTEGER,
      certification_requirements TEXT,
      software_requirements TEXT,
      medical_requirements TEXT,
      responsibility_tags TEXT,
      qualification_tags TEXT,
      posted_at TEXT,
      career_stage TEXT
    )
  `);

  // CREATE TABLE IF NOT EXISTS above won't add columns to an already-existing
  // table, so new columns need an explicit, idempotent ALTER TABLE here.
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN required_skills TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN posted_at TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN responsibility_tags TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN qualification_tags TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  for (const column of [
    'listing_type', 'experience_requirements', 'education_requirements', 'license_requirements', 'vehicle_required',
    'language_requirements', 'security_check_required', 'certification_requirements',
    'software_requirements', 'medical_requirements', 'hours', 'availability',
    'academic_role_type', 'academic_course', 'academic_workload', 'academic_office_hours',
    'academic_supervisor', 'academic_appointment_type', 'academic_schedule',
  ]) {
    try {
      await client.execute(`ALTER TABLE job_details ADD COLUMN ${column} ${column.endsWith('_required') ? 'INTEGER' : 'TEXT'}`);
    } catch (err: any) {
      if (!/duplicate column/i.test(err.message)) throw err;
    }
  }

  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN parser_version INTEGER`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }

  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN start_date TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN career_stage TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
  try {
    await client.execute(`ALTER TABLE job_details ADD COLUMN workplace_address TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }

  // Human whole-job review flag — set via mark-verified CLI; cleared on full AI reparse.
  try {
    await client.execute(`ALTER TABLE jobs ADD COLUMN verified_at DATETIME`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }

  // Records why a raw job failed to parse, so a batch failure count is
  // diagnosable after the fact instead of only existing in transient stdout.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS parse_failures (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT,
      attempt_count INTEGER DEFAULT 1,
      last_failed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS trial_source_results (
      source TEXT PRIMARY KEY,
      consecutive_successes INTEGER NOT NULL DEFAULT 0,
      last_status TEXT NOT NULL,
      last_job_count INTEGER NOT NULL DEFAULT 0,
      last_run_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS source_scrape_status (
      source TEXT PRIMARY KEY,
      last_successful_scrape_at DATETIME,
      last_status TEXT NOT NULL DEFAULT 'success'
    )
  `);

  return client;
}

function asNeonClient(client: Client): NeonDatabaseClient | null {
  return client instanceof NeonDatabaseClient ? client : null;
}

// Called by parser — writes base job row so job_details FK is satisfiable
export async function saveJob(client: Client, job: { id: string; url: string; source: string; first_seen_at: string }) {
  await asNeonClient(client)?.restoreIfArchived(job.id);
  await client.execute({
    sql: `INSERT INTO jobs (id, url, source, is_active, first_seen_at, scraped_at)
          VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            is_active = 1,
            scraped_at = CURRENT_TIMESTAMP`,
    args: [job.id, job.url, job.source, job.first_seen_at],
  });
}

// Called by parser — writes all AI-extracted fields
export async function saveJobDetails(client: Client, job: {
  id: string;
  job_title: string;
  department: string;
  location: string;
  workplace_address?: string | null;
  salary_range: string;
  description: string;
  closing_date: string;
  is_inventory?: number;
  listing_type?: string;
  is_student?: number;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: string;
  work_model?: string;
  employment_type?: string;
  duration?: string;
  hours?: string;
  availability?: string;
  academic_role_type?: string | null;
  academic_course?: string;
  academic_workload?: string;
  academic_office_hours?: string;
  academic_supervisor?: string;
  academic_appointment_type?: string;
  academic_schedule?: string;
  experience_requirements?: string;
  is_unionized?: number;
  union_name?: string;
  benefits?: string;
  required_skills?: string;
  education_requirements?: string;
  license_requirements?: string;
  vehicle_required?: number | null;
  language_requirements?: string;
  security_check_required?: number | null;
  certification_requirements?: string;
  software_requirements?: string;
  medical_requirements?: string;
  responsibility_tags?: string;
  qualification_tags?: string;
  parser_version?: number;
  posted_at?: string | null;
  start_date?: string | null;
  career_stage?: string | null;
}) {
  await asNeonClient(client)?.restoreIfArchived(job.id);
  await client.execute({
    sql: `INSERT INTO job_details (
      id, job_title, department, location, workplace_address, salary_range, description, closing_date,
      is_inventory, listing_type, is_student, salary_min, salary_max, salary_period,
      work_model, employment_type, duration, experience_requirements, is_unionized, union_name, benefits, required_skills,
      hours, availability, academic_role_type, academic_course, academic_workload, academic_office_hours, academic_supervisor, academic_appointment_type, academic_schedule,
      education_requirements, license_requirements, vehicle_required, language_requirements,
      security_check_required, certification_requirements, software_requirements, medical_requirements,
      responsibility_tags, qualification_tags, parser_version, posted_at, start_date, career_stage
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      job_title = excluded.job_title,
      department = excluded.department,
      location = excluded.location,
      workplace_address = excluded.workplace_address,
      salary_range = excluded.salary_range,
      description = excluded.description,
      closing_date = excluded.closing_date,
      is_inventory = excluded.is_inventory,
      listing_type = excluded.listing_type,
      is_student = excluded.is_student,
      salary_min = excluded.salary_min,
      salary_max = excluded.salary_max,
      salary_period = excluded.salary_period,
      work_model = excluded.work_model,
      employment_type = excluded.employment_type,
      duration = excluded.duration,
      hours = COALESCE(NULLIF(excluded.hours, ''), job_details.hours),
      availability = COALESCE(NULLIF(excluded.availability, ''), job_details.availability),
      academic_role_type = COALESCE(NULLIF(excluded.academic_role_type, ''), job_details.academic_role_type),
      academic_course = COALESCE(NULLIF(excluded.academic_course, ''), job_details.academic_course),
      academic_workload = COALESCE(NULLIF(excluded.academic_workload, ''), job_details.academic_workload),
      academic_office_hours = COALESCE(NULLIF(excluded.academic_office_hours, ''), job_details.academic_office_hours),
      academic_supervisor = COALESCE(NULLIF(excluded.academic_supervisor, ''), job_details.academic_supervisor),
      academic_appointment_type = COALESCE(NULLIF(excluded.academic_appointment_type, ''), job_details.academic_appointment_type),
      academic_schedule = COALESCE(NULLIF(excluded.academic_schedule, ''), job_details.academic_schedule),
      experience_requirements = excluded.experience_requirements,
      is_unionized = excluded.is_unionized,
      union_name = excluded.union_name,
      benefits = excluded.benefits,
      required_skills = excluded.required_skills,
      education_requirements = excluded.education_requirements,
      license_requirements = excluded.license_requirements,
      vehicle_required = excluded.vehicle_required,
      language_requirements = excluded.language_requirements,
      security_check_required = excluded.security_check_required,
      certification_requirements = excluded.certification_requirements,
      software_requirements = excluded.software_requirements,
      medical_requirements = excluded.medical_requirements,
      responsibility_tags = excluded.responsibility_tags,
      qualification_tags = excluded.qualification_tags,
      parser_version = excluded.parser_version,
      posted_at = excluded.posted_at,
      start_date = COALESCE(excluded.start_date, job_details.start_date),
      career_stage = excluded.career_stage`,
    args: [
      job.id, job.job_title, job.department, job.location, job.workplace_address ?? null, job.salary_range,
      job.description, job.closing_date,
      job.is_inventory ?? 0, job.listing_type ?? 'regular', job.is_student ?? 0,
      job.salary_min ?? null, job.salary_max ?? null, job.salary_period ?? null,
      job.work_model ?? null, job.employment_type ?? null, job.duration ?? null, job.experience_requirements ?? null,
      job.is_unionized ?? null, job.union_name ?? null, job.benefits ?? null,
      job.required_skills ?? null,
      job.hours ?? null, job.availability ?? null, job.academic_role_type ?? null, job.academic_course ?? null,
      job.academic_workload ?? null, job.academic_office_hours ?? null, job.academic_supervisor ?? null, job.academic_appointment_type ?? null, job.academic_schedule ?? null,
      job.education_requirements ?? null, job.license_requirements ?? null,
      job.vehicle_required ?? null, job.language_requirements ?? null, job.security_check_required ?? null,
      job.certification_requirements ?? null, job.software_requirements ?? null, job.medical_requirements ?? null,
      job.responsibility_tags ?? null, job.qualification_tags ?? null,
      job.parser_version ?? null, job.posted_at ?? null, job.start_date ?? null, job.career_stage ?? null,
    ],
  });
  // Full AI (or full-details) rewrite invalidates prior human verification.
  await client.execute({
    sql: `UPDATE jobs SET verified_at = NULL WHERE id = ? AND verified_at IS NOT NULL`,
    args: [job.id],
  });
}

export async function saveRawJob(client: Client, job: {
  id: string;
  url: string;
  application_url?: string | null;
  source: string;
  raw_text: string;
  title?: string | undefined;
  posted_at?: string | null;
}): Promise<boolean> {
  await asNeonClient(client)?.restoreIfArchived(job.id);
  const captureQuality = classifyRawCapture(job.source, job.raw_text);
  if (!captureQuality.valid) {
    await discardRawJob(client, job.id);
    return false;
  }

  const suppliedTitle = job.title?.trim() || '';
  const sourceTitle = (isUsableJobTitle(suppliedTitle) ? suppliedTitle : extractRawJobTitle(job.source, job.raw_text) || extractUrlJobTitle(job.application_url ?? job.url, job.raw_text)) || null;
  const title = sourceTitle ? normalizeSourceJobTitle(job.source, sourceTitle) : null;
  const pending = extractPendingMetadata(sourceTitle, job.raw_text);
  const pendingClosing = extractClosingDateStatus(job.raw_text);
  const pendingClosingDate = pendingClosing.date;
  const pendingClosingDateStatus = pendingClosing.status;
  await client.batch([
    {
      sql: `INSERT INTO raw_jobs (id, url, application_url, source, raw_text, title, pending_salary_text, pending_is_student, pending_location, pending_duration, pending_closing_date, pending_closing_date_status, first_seen_at, scraped_at, parsed_at, posted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, ?)
        ON CONFLICT(id) DO UPDATE SET
          url = excluded.url,
          application_url = COALESCE(excluded.application_url, raw_jobs.application_url),
          source = excluded.source,
          raw_text = excluded.raw_text,
          title = COALESCE(excluded.title, raw_jobs.title),
          pending_salary_text = COALESCE(excluded.pending_salary_text, raw_jobs.pending_salary_text),
          pending_is_student = COALESCE(excluded.pending_is_student, raw_jobs.pending_is_student),
          pending_location = COALESCE(excluded.pending_location, raw_jobs.pending_location),
          pending_duration = COALESCE(excluded.pending_duration, raw_jobs.pending_duration),
          pending_closing_date = COALESCE(NULLIF(TRIM(excluded.pending_closing_date), ''), raw_jobs.pending_closing_date),
          pending_closing_date_status = CASE
            WHEN excluded.pending_closing_date IS NOT NULL AND TRIM(excluded.pending_closing_date) <> '' THEN 'known'
            WHEN raw_jobs.pending_closing_date IS NOT NULL AND TRIM(raw_jobs.pending_closing_date) <> '' THEN 'known'
            WHEN raw_jobs.pending_closing_date_status = 'known' THEN 'known'
            WHEN raw_jobs.pending_closing_date_status IN ('not_listed', 'open_until_filled', 'invalid', 'blocked') THEN raw_jobs.pending_closing_date_status
            ELSE 'not_checked'
          END,
          scraped_at = CURRENT_TIMESTAMP,
          posted_at = COALESCE(excluded.posted_at, raw_jobs.posted_at)`,
      args: [job.id, job.url, job.application_url ?? null, job.source, job.raw_text, title, pending.salaryText, pending.isStudent, pending.location ?? null, pending.duration, pendingClosingDate, pendingClosingDateStatus, job.posted_at ?? null],
    },
    {
      sql: `INSERT INTO jobs (id, url, source, is_active, first_seen_at, scraped_at)
        SELECT id, COALESCE(application_url, url), source, 1, first_seen_at, scraped_at
        FROM raw_jobs WHERE id = ?
        ON CONFLICT(id) DO NOTHING`,
      args: [job.id],
    },
  ], 'write');
  return true;
}

/** Publish a listing whose source detail document is intentionally not parsed. */
export async function savePendingJob(client: Client, job: {
  id: string;
  url: string;
  application_url?: string | null;
  source: string;
  title?: string | undefined;
  closing_date?: string | null;
  posted_at?: string | null;
}) {
  await asNeonClient(client)?.restoreIfArchived(job.id);
  const suppliedTitle = job.title?.trim() || '';
  const sourceTitle = isUsableJobTitle(suppliedTitle) ? suppliedTitle : null;
  const title = sourceTitle ? normalizeSourceJobTitle(job.source, sourceTitle) : null;
  const pending = extractPendingMetadata(sourceTitle, '');
  const pendingClosingDateStatus = job.closing_date ? 'known' : 'not_checked';
  await client.batch([
    {
      sql: `INSERT INTO raw_jobs (id, url, application_url, source, raw_text, title, pending_salary_text, pending_is_student, pending_duration, pending_closing_date, pending_closing_date_status, first_seen_at, scraped_at, parsed_at, posted_at)
        VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(id) DO UPDATE SET
          url = excluded.url,
          application_url = COALESCE(excluded.application_url, raw_jobs.application_url),
          source = excluded.source,
          raw_text = '',
          title = COALESCE(excluded.title, raw_jobs.title),
          pending_salary_text = COALESCE(excluded.pending_salary_text, raw_jobs.pending_salary_text),
          pending_is_student = COALESCE(excluded.pending_is_student, raw_jobs.pending_is_student),
          pending_duration = COALESCE(excluded.pending_duration, raw_jobs.pending_duration),
          pending_closing_date = COALESCE(excluded.pending_closing_date, raw_jobs.pending_closing_date),
          pending_closing_date_status = CASE
            WHEN excluded.pending_closing_date IS NOT NULL AND TRIM(excluded.pending_closing_date) <> '' THEN 'known'
            ELSE COALESCE(raw_jobs.pending_closing_date_status, 'not_checked')
          END,
          scraped_at = CURRENT_TIMESTAMP,
          parsed_at = CURRENT_TIMESTAMP,
          posted_at = COALESCE(excluded.posted_at, raw_jobs.posted_at)`,
      args: [job.id, job.url, job.application_url ?? null, job.source, title, pending.salaryText, pending.isStudent, pending.duration, job.closing_date ?? null, pendingClosingDateStatus, job.posted_at ?? null],
    },
    {
      sql: `INSERT INTO jobs (id, url, source, is_active, first_seen_at, scraped_at)
        SELECT id, COALESCE(application_url, url), source, 1, first_seen_at, scraped_at
        FROM raw_jobs WHERE id = ?
        ON CONFLICT(id) DO UPDATE SET
          url = excluded.url,
          source = excluded.source,
          is_active = 1,
          scraped_at = excluded.scraped_at`,
      args: [job.id],
    },
  ], 'write');
}

/**
 * Publish raw postings as shell listings without marking them parsed.
 * The normal parser later fills job_details and sets raw_jobs.parsed_at.
 */
export async function promotePendingJobs(client: Client): Promise<number> {
  const result = await client.execute(`
    INSERT INTO jobs (id, url, source, is_active, first_seen_at, scraped_at)
    SELECT r.id, COALESCE(r.application_url, r.url), r.source, 1, r.first_seen_at, r.scraped_at
    FROM raw_jobs r
    LEFT JOIN jobs j ON j.id = r.id
    WHERE r.parsed_at IS NULL AND j.id IS NULL
    ON CONFLICT(id) DO NOTHING
  `);
  return result.rowsAffected ?? 0;
}

export async function retireJob(client: Client, id: string): Promise<void> {
  const neon = asNeonClient(client);
  if (neon) {
    await neon.moveJobsToArchive([id]);
    return;
  }
  await client.batch([
    {
      sql: `INSERT INTO jobs (id, url, source, is_active, first_seen_at, scraped_at)
            SELECT id, COALESCE(application_url, url), source, 0, first_seen_at, CURRENT_TIMESTAMP
            FROM raw_jobs WHERE id = ?
            ON CONFLICT(id) DO UPDATE SET is_active = 0, scraped_at = CURRENT_TIMESTAMP`,
      args: [id],
    },
    { sql: `UPDATE raw_jobs SET parsed_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [id] },
    { sql: `DELETE FROM parse_failures WHERE id = ?`, args: [id] },
  ], 'write');
}

// A detail page that never renders usable content must not remain queued for
// parsing forever. The next scrape can recreate the row if the source recovers.
export async function discardRawJob(client: Client, id: string) {
  const neon = asNeonClient(client);
  if (neon) {
    const existing = await client.execute({
      sql: `SELECT j.id FROM jobs j
            JOIN raw_jobs r ON r.id = j.id
            WHERE j.id = ? AND r.parsed_at IS NULL`,
      args: [id],
    });
    await client.batch([
      { sql: `DELETE FROM raw_jobs WHERE id = ? AND parsed_at IS NULL`, args: [id] },
      { sql: `DELETE FROM parse_failures WHERE id = ?`, args: [id] },
    ], 'write');
    await neon.moveJobsToArchive(existing.rows.map(row => String(row.id)));
    return;
  }
  await client.batch([
    { sql: `UPDATE jobs SET is_active = 0, scraped_at = CURRENT_TIMESTAMP
            WHERE id = ? AND EXISTS (SELECT 1 FROM raw_jobs WHERE id = ? AND parsed_at IS NULL)`, args: [id, id] },
    { sql: `DELETE FROM raw_jobs WHERE id = ? AND parsed_at IS NULL`, args: [id] },
    { sql: `DELETE FROM parse_failures WHERE id = ?`, args: [id] },
  ], 'write');
}

export async function getUnparsedJobs(client: Client, excludedSources: string[] = []): Promise<Array<{ id: string; url: string; application_url: string | null; source: string; raw_text: string; title: string | null; first_seen_at: string; posted_at: string | null }>> {
  const sourceExclusion = excludedSources.length > 0
    ? `AND r.source NOT IN (${excludedSources.map(() => '?').join(',')})`
    : '';
  const result = await client.execute({
    sql: `
      SELECT r.id, r.url, r.application_url, r.source, r.raw_text, r.title, r.first_seen_at, r.posted_at
      FROM raw_jobs r
      LEFT JOIN jobs j ON r.id = j.id
      LEFT JOIN parse_failures f ON r.id = f.id
      WHERE r.parsed_at IS NULL
        AND (j.is_active IS NULL OR j.is_active = 1)
        AND (j.verified_at IS NULL)
        ${sourceExclusion}
        AND (
          f.id IS NULL
          OR r.scraped_at > f.last_failed_at
          OR (
            f.reason NOT LIKE 'permanent:%'
            AND f.reason NOT LIKE 'validation failed%'
            AND f.reason NOT LIKE 'unrendered page%'
            AND f.attempt_count < ?
          )
        )
      ORDER BY r.scraped_at ASC
    `,
    args: [...excludedSources, MAX_PARSE_ATTEMPTS],
  });
  return result.rows.map(row => ({
    id: row.id as string,
    url: row.url as string,
    application_url: row.application_url as string | null,
    source: row.source as string,
    raw_text: row.raw_text as string,
    title: row.title as string | null,
    first_seen_at: row.first_seen_at as string,
    posted_at: row.posted_at as string | null,
  }));
}

export async function markJobParsed(client: Client, id: string) {
  await client.execute({
    sql: `UPDATE raw_jobs SET parsed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [id],
  });
}

/** Source-confirmed closing date refresh; safe to apply without AI parsing. */
export async function refreshClosingDate(client: Client, id: string, closingDate: string) {
  await client.execute({
    sql: `UPDATE job_details SET closing_date = ? WHERE id = ?`,
    args: [closingDate, id],
  });
}

// Called on parse failure — upserts so repeated failures on the same job
// increment attempt_count instead of creating duplicate rows.
export async function recordParseFailure(client: Client, failure: { id: string; url: string; source: string; reason: string }) {
  await client.execute({
    sql: `INSERT INTO parse_failures (id, url, source, reason, attempt_count, last_failed_at)
          VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            reason = excluded.reason,
            attempt_count = attempt_count + 1,
            last_failed_at = CURRENT_TIMESTAMP`,
    args: [failure.id, failure.url, failure.source, failure.reason],
  });
}

// Called on parse success — clears any prior failure record so a job that
// eventually succeeds doesn't linger in parse_failures.
export async function clearParseFailure(client: Client, id: string) {
  await client.execute({
    sql: `DELETE FROM parse_failures WHERE id = ?`,
    args: [id],
  });
}

export async function countStalledParseFailures(client: Client): Promise<number> {
  const result = await client.execute({
    sql: `SELECT COUNT(*) as count FROM parse_failures WHERE attempt_count >= ?`,
    args: [MAX_PARSE_ATTEMPTS],
  });
  return Number(result.rows[0]?.count ?? 0);
}

// Jobs successfully parsed under an older prompt/model version — raw_jobs.parsed_at
// being set means getUnparsedJobs will never pick these back up on its own.
export async function countStaleParses(client: Client, currentVersion: number): Promise<Array<{ source: string; count: number }>> {
  const result = await client.execute({
    sql: `SELECT r.source as source, COUNT(*) as count
          FROM raw_jobs r
          JOIN job_details d ON r.id = d.id
          JOIN jobs j ON j.id = r.id
          WHERE r.parsed_at IS NOT NULL
            AND j.verified_at IS NULL
            AND (d.parser_version IS NULL OR d.parser_version < ?)
          GROUP BY r.source
          ORDER BY count DESC`,
    args: [currentVersion],
  });
  return result.rows.map(row => ({ source: row.source as string, count: Number(row.count) }));
}

// Clears parsed_at on stale-version jobs so the next `npm run parse` picks them
// back up through the normal queue — same concurrency, retry tracking, and
// Discord reporting as any other parse run, just re-targeted at old rows.
export async function queueStaleParsesForReparse(client: Client, currentVersion: number): Promise<number> {
  const result = await client.execute({
    sql: `UPDATE raw_jobs SET parsed_at = NULL
          WHERE parsed_at IS NOT NULL
            AND id IN (
              SELECT d.id
              FROM job_details d
              JOIN jobs j ON j.id = d.id
              WHERE j.verified_at IS NULL
                AND (d.parser_version IS NULL OR d.parser_version < ?)
            )`,
    args: [currentVersion],
  });
  return Number(result.rowsAffected ?? 0);
}

export async function toggleSaveJob(client: Client, id: string) {
  await client.execute({
    sql: `UPDATE jobs SET is_saved = 1 - is_saved WHERE id = ?`,
    args: [id],
  });
}

/**
 * After a successful scrape of one source: deactivate that source's jobs that
 * were not re-touched in this run (delisted from the portal).
 *
 * NEVER call this from the parser with a global time window — that wiped the
 * whole feed after a York-only scrape + parse (2026-08-05).
 */
export async function cleanupExpiredJobsForSource(
  client: Client,
  source: string,
  runStartedAt: string,
): Promise<void> {
  const neon = asNeonClient(client);
  if (neon) {
    await neon.moveSourceMissingJobsToArchive(source, runStartedAt);
    return;
  }
  await client.execute({
    sql: `UPDATE jobs SET is_active = 0
          WHERE source = ?
            AND id NOT IN (
              SELECT id FROM raw_jobs WHERE source = ? AND scraped_at >= ?
            )`,
    args: [source, source, runStartedAt],
  });

  await client.execute({
    sql: `DELETE FROM parse_failures
          WHERE id IN (
            SELECT j.id FROM jobs j
            WHERE j.source = ?
              AND j.is_active = 0
              AND j.id NOT IN (
                SELECT id FROM raw_jobs WHERE source = ? AND scraped_at >= ?
              )
          )`,
    args: [source, source, runStartedAt],
  });
}

/** @deprecated Use cleanupExpiredJobsForSource after each source scrape. */
export async function cleanupExpiredJobs(client: Client, runStartedAt: string) {
  // Kept for tests/callers: no-op global path. Prefer per-source cleanup.
  void client;
  void runStartedAt;
  console.warn('[cleanupExpiredJobs] no-op: use cleanupExpiredJobsForSource per source instead');
}

/** Deactivate active listings whose stored application deadline has passed. */
export async function deactivateExpiredJobs(
  client: Client,
  today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()),
): Promise<number> {
  const neon = asNeonClient(client);
  if (neon) {
    return neon.moveExpiredJobsToArchive(today);
  }
  const result = await client.execute({
    sql: `UPDATE jobs
          SET is_active = 0, scraped_at = CURRENT_TIMESTAMP
          WHERE is_active = 1
            AND id IN (
              SELECT id FROM job_details
              WHERE closing_date IS NOT NULL
                AND TRIM(closing_date) <> ''
                AND SUBSTR(closing_date, 1, 10) < ?
            )`,
    args: [today],
  });
  return Number(result.rowsAffected ?? 0);
}
