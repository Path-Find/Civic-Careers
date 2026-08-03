import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from './_db.js';

const jobColumns = `
  j.rowid AS rid, j.id, j.url, j.source, j.is_active, j.is_saved, j.first_seen_at, j.scraped_at,
  j.scraped_at AS last_checked_at,
  jd.job_title, jd.department, jd.location, jd.salary_range,
  jd.closing_date, jd.posted_at, jd.is_inventory, jd.is_student,
  jd.salary_min, jd.salary_max, jd.salary_period,
  jd.work_model, jd.employment_type, jd.duration,
  jd.is_unionized, jd.union_name, jd.benefits, jd.required_skills,
  jd.education_requirements, jd.license_requirements, jd.vehicle_required,
  jd.language_requirements, jd.security_check_required, jd.certification_requirements,
  jd.software_requirements,
  jd.responsibility_tags, jd.qualification_tags`;

const jobJoins = `
  FROM jobs j
  LEFT JOIN job_details jd ON j.id = jd.id`;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const id = parsed.searchParams.get('id');
  const rid = parsed.searchParams.get('rid');
  const view = parsed.searchParams.get('view');
  const limit = Math.min(Math.max(Number(parsed.searchParams.get('limit') ?? 50), 1), 100);
  const offset = Math.max(Number(parsed.searchParams.get('offset') ?? 0), 0);

  res.setHeader('Content-Type', 'application/json');

  try {
    const db = createDb();

    if (id) {
      const result = await db.execute({
        sql: 'SELECT description FROM job_details WHERE id = ?',
        args: [id]
      });
      if (result.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      res.end(JSON.stringify({ description: result.rows[0].description }));
      return;
    }

    if (rid) {
      const result = await db.execute({
        sql: `SELECT ${jobColumns} ${jobJoins} WHERE j.rowid = ?`,
        args: [rid]
      });
      if (result.rows.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }
      res.end(JSON.stringify(result.rows[0]));
      return;
    }

    if (view === 'home') {
      const activeJobWhere = `
        WHERE j.is_active = 1
          AND COALESCE(jd.is_inventory, 0) = 0
          AND (jd.closing_date IS NULL OR jd.closing_date = '' OR substr(jd.closing_date, 1, 10) >= date('now'))`;
      const [recent, closingSoon, counts] = await Promise.all([
        db.execute(`SELECT * FROM (SELECT ${jobColumns}, ROW_NUMBER() OVER (PARTITION BY j.source ORDER BY j.scraped_at DESC) AS source_rank ${jobJoins} ${activeJobWhere}) recent_by_source WHERE source_rank = 1 ORDER BY scraped_at DESC LIMIT 10`),
        db.execute(`SELECT ${jobColumns} ${jobJoins}
          ${activeJobWhere}
          AND jd.closing_date IS NOT NULL AND jd.closing_date != ''
          AND substr(jd.closing_date, 1, 10) <= date('now', '+14 days')
          ORDER BY substr(jd.closing_date, 1, 10) ASC LIMIT 10`),
        db.execute(`SELECT
          COUNT(*) AS available_job_count,
          SUM(CASE WHEN j.first_seen_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS recently_added_count,
          MAX(j.scraped_at) AS last_checked_at
          ${jobJoins} ${activeJobWhere}`),
      ]);
      const countRow = counts.rows[0] || {};
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      res.end(JSON.stringify({
        recentJobs: recent.rows,
        closingSoonJobs: closingSoon.rows,
        availableJobCount: Number(countRow.available_job_count ?? 0),
        recentlyAddedCount: Number(countRow.recently_added_count ?? 0),
        lastCheckedAt: countRow.last_checked_at ?? null,
      }));
      return;
    }

    if (view === 'companies') {
      const result = await db.execute(`
        SELECT
          j.source AS name,
          SUM(CASE WHEN j.is_active = 1
            AND COALESCE(jd.is_inventory, 0) = 0
            AND (jd.closing_date IS NULL OR jd.closing_date = '' OR substr(jd.closing_date, 1, 10) >= date('now'))
            THEN 1 ELSE 0 END) AS active_job_count,
          COUNT(*) AS total_job_count,
          SUM(CASE WHEN j.first_seen_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS recent_job_count,
          MAX(j.first_seen_at) AS latest_job_added_at,
          MAX(j.scraped_at) AS last_checked_at
        ${jobJoins}
        GROUP BY j.source
        ORDER BY active_job_count DESC, name ASC`);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      res.end(JSON.stringify(result.rows));
      return;
    }

    if (view === 'jobs') {
      const [result, count] = await Promise.all([
        db.execute({
          sql: `SELECT ${jobColumns} ${jobJoins} ORDER BY j.is_active DESC, j.scraped_at DESC LIMIT ? OFFSET ?`,
          args: [limit, offset],
        }),
        db.execute(`SELECT COUNT(*) AS total ${jobJoins}`),
      ]);
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
      res.end(JSON.stringify({ jobs: result.rows, total: Number(count.rows[0]?.total ?? 0) }));
      return;
    }

    if (view === 'saved') {
      const result = await db.execute(`
        SELECT ${jobColumns}
        ${jobJoins}
        WHERE j.is_saved = 1
        ORDER BY j.is_active DESC, j.scraped_at DESC
      `);
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(result.rows));
      return;
    }

    const result = await db.execute(`
      SELECT ${jobColumns}
      ${jobJoins}
      ORDER BY j.is_active DESC, j.scraped_at DESC
    `);
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.end(JSON.stringify(result.rows));
  } catch (error) {
    console.error('[API] Failed to load jobs:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Unable to load jobs right now' }));
  }
}
