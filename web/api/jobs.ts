import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from './_db.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const id = parsed.searchParams.get('id');
  const rid = parsed.searchParams.get('rid');

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
        sql: `SELECT j.rowid AS rid, j.id, j.url, j.source, j.is_active, j.is_saved, j.scraped_at,
                     jd.job_title, jd.department, jd.location, jd.salary_range,
                     jd.closing_date, jd.is_inventory, jd.is_student,
                     jd.salary_min, jd.salary_max, jd.salary_period,
                     jd.work_model, jd.employment_type, jd.duration,
                     jd.is_unionized, jd.union_name, jd.benefits, jd.required_skills
              FROM jobs j
              LEFT JOIN job_details jd ON j.id = jd.id
              WHERE j.rowid = ?`,
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

    const result = await db.execute(`
      SELECT j.rowid AS rid, j.id, j.url, j.source, j.is_active, j.is_saved, j.scraped_at,
             jd.job_title, jd.department, jd.location, jd.salary_range,
             jd.closing_date, jd.is_inventory, jd.is_student,
             jd.salary_min, jd.salary_max, jd.salary_period,
             jd.work_model, jd.employment_type, jd.duration,
             jd.is_unionized, jd.union_name, jd.benefits, jd.required_skills
      FROM jobs j
      LEFT JOIN job_details jd ON j.id = jd.id
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
