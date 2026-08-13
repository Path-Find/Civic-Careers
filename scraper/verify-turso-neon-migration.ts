/**
 * Read-only parity check for the Turso → split Neon migration.
 *
 * Required environment:
 *   TURSO_URL, TURSO_AUTH_TOKEN,
 *   NEON_CURRENT_DATABASE_URL, NEON_ARCHIVE_DATABASE_URL
 */
import { createClient } from '@libsql/client';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';

dotenv.config({ path: '.env', quiet: true });

const source = createClient({
  url: requireEnvironment('TURSO_URL'),
  authToken: requireEnvironment('TURSO_AUTH_TOKEN'),
});
const current = new Pool({ connectionString: requireEnvironment('NEON_CURRENT_DATABASE_URL'), max: 2 });
const archive = new Pool({ connectionString: requireEnvironment('NEON_ARCHIVE_DATABASE_URL'), max: 2 });

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function hash(value: unknown): string {
  return createHash('sha256').update(String(value ?? '')).digest('hex');
}

async function sourceCount(table: string): Promise<number> {
  const result = await source.execute(`SELECT COUNT(*) AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function targetCount(pool: Pool, table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  let failures = 0;
  const check = (label: string, actual: number, expected: number) => {
    const passed = actual === expected;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${label}: ${actual} (expected ${expected})`);
    if (!passed) failures += 1;
  };

  const sourceJobs = await source.execute(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN is_active <> 1 OR is_active IS NULL THEN 1 ELSE 0 END) AS inactive
    FROM jobs
  `);
  const sourceJobCounts = sourceJobs.rows[0] ?? {};
  const currentJobs = await targetCount(current, 'jobs');
  const archiveJobs = await targetCount(archive, 'jobs');
  check('jobs total', currentJobs + archiveJobs, Number(sourceJobCounts.total ?? 0));
  check('jobs current/active', currentJobs, Number(sourceJobCounts.active ?? 0));
  check('jobs archive/inactive', archiveJobs, Number(sourceJobCounts.inactive ?? 0));

  for (const table of ['raw_jobs', 'job_details', 'parse_failures', 'job_apply_clicks', 'manual_review_changes', 'source_scrape_status', 'trial_source_results']) {
    const [sourceRows, currentRows, archiveRows] = await Promise.all([
      sourceCount(table),
      targetCount(current, table),
      targetCount(archive, table),
    ]);
    const expectedArchive = table === 'source_scrape_status' || table === 'trial_source_results' ? 0 : undefined;
    check(`${table} total`, currentRows + archiveRows, sourceRows);
    if (expectedArchive !== undefined) check(`${table} archive`, archiveRows, expectedArchive);
  }

  for (const [label, pool] of [['current', current], ['archive', archive]] as const) {
    const [rawOrphans, detailOrphans, wrongState] = await Promise.all([
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM raw_jobs r LEFT JOIN jobs j ON j.id = r.id WHERE j.id IS NULL'),
      pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM job_details d LEFT JOIN jobs j ON j.id = d.id WHERE j.id IS NULL'),
      pool.query<{ count: string }>(label === 'current'
        ? 'SELECT COUNT(*)::text AS count FROM jobs WHERE is_active <> 1'
        : 'SELECT COUNT(*)::text AS count FROM jobs WHERE is_active = 1'),
    ]);
    check(`${label} raw orphans`, Number(rawOrphans.rows[0]?.count ?? 0), 0);
    check(`${label} detail orphans`, Number(detailOrphans.rows[0]?.count ?? 0), 0);
    check(`${label} wrong-state jobs`, Number(wrongState.rows[0]?.count ?? 0), 0);
  }

  const sample = await source.execute(`
    SELECT j.id, j.public_id, j.url, j.source, j.is_active, j.is_saved,
           r.raw_text, d.description
    FROM jobs j
    LEFT JOIN raw_jobs r ON r.id = j.id
    LEFT JOIN job_details d ON d.id = j.id
    ORDER BY j.public_id
    LIMIT 20
  `);
  for (const row of sample.rows) {
    const pool = Number(row.is_active ?? 0) === 1 ? current : archive;
    const target = await pool.query<{
      id: string;
      public_id: string;
      url: string;
      source: string;
      is_active: number;
      is_saved: number;
      raw_text: string | null;
      description: string | null;
    }>(`
      SELECT j.id, j.public_id::text, j.url, j.source, j.is_active, j.is_saved,
             r.raw_text, d.description
      FROM jobs j
      LEFT JOIN raw_jobs r ON r.id = j.id
      LEFT JOIN job_details d ON d.id = j.id
      WHERE j.id = $1
    `, [row.id]);
    const actual = target.rows[0];
    const same = actual
      && actual.id === row.id
      && actual.public_id === String(row.public_id)
      && actual.url === row.url
      && actual.source === row.source
      && Number(actual.is_active) === Number(row.is_active)
      && Number(actual.is_saved) === Number(row.is_saved)
      && hash(actual.raw_text) === hash(row.raw_text)
      && hash(actual.description) === hash(row.description);
    if (!same) failures += 1;
    console.log(`${same ? 'PASS' : 'FAIL'} sample ${row.id}`);
  }

  console.log(failures === 0 ? 'Migration verification passed.' : `Migration verification failed: ${failures} check(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([current.end(), archive.end()]);
  });
