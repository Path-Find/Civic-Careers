/**
 * Plan a bounded expired-job archive batch without writing to the database.
 *
 * This deliberately avoids COUNT(*), ORDER BY RANDOM(), and a full-table
 * payload aggregation. It is safe to run while we are near the Turso read
 * limit, but the default batch should remain small.
 *
 * Usage:
 *   npx tsx plan-expired-job-archive.ts
 *   npx tsx plan-expired-job-archive.ts --limit 25
 *   npx tsx plan-expired-job-archive.ts --source "Example organization"
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const limitIndex = process.argv.indexOf('--limit');
const requestedLimit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : 25;
const limit = Number.isFinite(requestedLimit)
  ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
  : 25;
const sourceIndex = process.argv.indexOf('--source');
const source = sourceIndex >= 0 ? process.argv[sourceIndex + 1]?.trim() || null : null;

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const sourceClause = source ? 'AND j.source = ?' : '';
  const args: Array<string | number> = source ? [source, limit] : [limit];
  const result = await db.execute({
    sql: `
      SELECT
        j.id,
        j.public_id,
        j.source,
        j.url,
        j.is_saved,
        j.scraped_at AS archived_candidate_at,
        d.job_title,
        d.closing_date,
        LENGTH(COALESCE(d.description, '')) AS description_bytes,
        LENGTH(COALESCE(r.raw_text, '')) AS raw_text_bytes
      FROM jobs j INDEXED BY jobs_active_scraped_idx
      LEFT JOIN job_details d ON d.id = j.id
      LEFT JOIN raw_jobs r ON r.id = j.id
      WHERE j.is_active = 0
        ${sourceClause}
      ORDER BY j.scraped_at ASC
      LIMIT ?
    `,
    args,
  });

  const rows = result.rows.map((row) => ({
    id: String(row.id ?? ''),
    public_id: row.public_id == null ? null : Number(row.public_id),
    source: String(row.source ?? ''),
    url: String(row.url ?? ''),
    is_saved: Number(row.is_saved ?? 0),
    archived_candidate_at: row.archived_candidate_at ?? null,
    job_title: String(row.job_title ?? ''),
    closing_date: row.closing_date ?? null,
    description_bytes: Number(row.description_bytes ?? 0),
    raw_text_bytes: Number(row.raw_text_bytes ?? 0),
  }));

  const totals = rows.reduce(
    (summary, row) => ({
      description_bytes: summary.description_bytes + row.description_bytes,
      raw_text_bytes: summary.raw_text_bytes + row.raw_text_bytes,
      saved_jobs: summary.saved_jobs + (row.is_saved ? 1 : 0),
    }),
    { description_bytes: 0, raw_text_bytes: 0, saved_jobs: 0 },
  );

  console.log(JSON.stringify({ limit, source, count: rows.length, totals, rows }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
