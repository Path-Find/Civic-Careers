import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

// After this many failed parse attempts, a job is excluded from getUnparsedJobs
// (stops burning AI calls on something permanently broken) but stays in
// parse_failures for manual review. A fresh rescrape (raw_jobs.scraped_at
// past the last failure) overrides the cap, since new raw_text means a
// scraper fix may have actually resolved the underlying cause.
export const MAX_PARSE_ATTEMPTS = 2;

export async function initDb(): Promise<Client> {
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
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      parsed_at DATETIME
    )
  `);

  try {
    await client.execute(`ALTER TABLE raw_jobs ADD COLUMN title TEXT`);
  } catch (err: any) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }

  // Scraper-owned fields only
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      url TEXT,
      source TEXT,
      is_active INTEGER DEFAULT 1,
      is_saved INTEGER DEFAULT 0,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // AI-owned fields — never touched by the scraper
  await client.execute(`
    CREATE TABLE IF NOT EXISTS job_details (
      id TEXT PRIMARY KEY REFERENCES jobs(id),
      job_title TEXT,
      department TEXT,
      location TEXT,
      salary_range TEXT,
      description TEXT,
      closing_date TEXT,
      is_inventory INTEGER DEFAULT 0,
      is_student INTEGER DEFAULT 0,
      salary_min NUMBER,
      salary_max NUMBER,
      salary_period TEXT,
      work_model TEXT,
      employment_type TEXT,
      duration TEXT,
      is_unionized INTEGER,
      union_name TEXT,
      benefits TEXT,
      required_skills TEXT
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
    await client.execute(`ALTER TABLE job_details ADD COLUMN parser_version INTEGER`);
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

  return client;
}

// Called by parser — writes base job row so job_details FK is satisfiable
export async function saveJob(client: Client, job: { id: string; url: string; source: string }) {
  await client.execute({
    sql: `INSERT INTO jobs (id, url, source, is_active, scraped_at)
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            is_active = 1,
            scraped_at = CURRENT_TIMESTAMP`,
    args: [job.id, job.url, job.source],
  });
}

// Called by parser — writes all AI-extracted fields
export async function saveJobDetails(client: Client, job: {
  id: string;
  job_title: string;
  department: string;
  location: string;
  salary_range: string;
  description: string;
  closing_date: string;
  is_inventory?: number;
  is_student?: number;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: string;
  work_model?: string;
  employment_type?: string;
  duration?: string;
  is_unionized?: number;
  union_name?: string;
  benefits?: string;
  required_skills?: string;
  parser_version?: number;
}) {
  await client.execute({
    sql: `INSERT INTO job_details (
      id, job_title, department, location, salary_range, description, closing_date,
      is_inventory, is_student, salary_min, salary_max, salary_period,
      work_model, employment_type, duration, is_unionized, union_name, benefits, required_skills, parser_version
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      job_title = excluded.job_title,
      department = excluded.department,
      location = excluded.location,
      salary_range = excluded.salary_range,
      description = excluded.description,
      closing_date = excluded.closing_date,
      is_inventory = excluded.is_inventory,
      is_student = excluded.is_student,
      salary_min = excluded.salary_min,
      salary_max = excluded.salary_max,
      salary_period = excluded.salary_period,
      work_model = excluded.work_model,
      employment_type = excluded.employment_type,
      duration = excluded.duration,
      is_unionized = excluded.is_unionized,
      union_name = excluded.union_name,
      benefits = excluded.benefits,
      required_skills = excluded.required_skills,
      parser_version = excluded.parser_version`,
    args: [
      job.id, job.job_title, job.department, job.location, job.salary_range,
      job.description, job.closing_date,
      job.is_inventory ?? 0, job.is_student ?? 0,
      job.salary_min ?? null, job.salary_max ?? null, job.salary_period ?? null,
      job.work_model ?? null, job.employment_type ?? null, job.duration ?? null,
      job.is_unionized ?? null, job.union_name ?? null, job.benefits ?? null,
      job.required_skills ?? null, job.parser_version ?? null,
    ],
  });
}

export async function saveRawJob(client: Client, job: {
  id: string;
  url: string;
  source: string;
  raw_text: string;
  title?: string | undefined;
}) {
  await client.execute({
    sql: `INSERT INTO raw_jobs (id, url, source, raw_text, title, scraped_at, parsed_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
      ON CONFLICT(id) DO UPDATE SET
        url = excluded.url,
        source = excluded.source,
        raw_text = excluded.raw_text,
        title = COALESCE(excluded.title, raw_jobs.title),
        scraped_at = CURRENT_TIMESTAMP`,
    args: [job.id, job.url, job.source, job.raw_text, job.title ?? null],
  });
}

// A detail page that never renders usable content must not remain queued for
// parsing forever. The next scrape can recreate the row if the source recovers.
export async function discardRawJob(client: Client, id: string) {
  await client.batch([
    { sql: `DELETE FROM raw_jobs WHERE id = ? AND parsed_at IS NULL`, args: [id] },
    { sql: `DELETE FROM parse_failures WHERE id = ?`, args: [id] },
  ], 'write');
}

export async function getUnparsedJobs(client: Client): Promise<Array<{ id: string; url: string; source: string; raw_text: string; title: string | null }>> {
  const result = await client.execute({
    sql: `
      SELECT r.id, r.url, r.source, r.raw_text, r.title
      FROM raw_jobs r
      LEFT JOIN jobs j ON r.id = j.id
      LEFT JOIN parse_failures f ON r.id = f.id
      WHERE r.parsed_at IS NULL
        AND (j.is_active IS NULL OR j.is_active = 1)
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
    args: [MAX_PARSE_ATTEMPTS],
  });
  return result.rows.map(row => ({
    id: row.id as string,
    url: row.url as string,
    source: row.source as string,
    raw_text: row.raw_text as string,
    title: row.title as string | null,
  }));
}

export async function markJobParsed(client: Client, id: string) {
  await client.execute({
    sql: `UPDATE raw_jobs SET parsed_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [id],
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
          WHERE r.parsed_at IS NOT NULL
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
              SELECT id FROM job_details WHERE parser_version IS NULL OR parser_version < ?
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

export async function cleanupExpiredJobs(client: Client, runStartedAt: string) {
  await client.execute({
    sql: `UPDATE jobs SET is_active = 0 WHERE id NOT IN (
      SELECT id FROM raw_jobs WHERE scraped_at >= ?
    )`,
    args: [runStartedAt],
  });

  // A job no longer showing up in scrapes at all (delisted, or source removed)
  // has no future rescrape to reset its cap via — its failure record would
  // otherwise sit there forever. Safe to drop since it can't be retried anyway.
  await client.execute({
    sql: `DELETE FROM parse_failures WHERE id NOT IN (
      SELECT id FROM raw_jobs WHERE scraped_at >= ?
    )`,
    args: [runStartedAt],
  });
}
