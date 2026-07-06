import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from './_db.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const id = parsed.searchParams.get('id');
  const db = createDb();

  res.setHeader('Content-Type', 'application/json');

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

  const result = await db.execute(`
    SELECT j.rowid AS rid, j.id, j.url, j.source, j.is_active, j.is_saved, j.scraped_at,
           jd.job_title, jd.department, jd.location, jd.salary_range,
           jd.closing_date, jd.is_inventory, jd.is_student,
           jd.salary_min, jd.salary_max, jd.salary_period,
           jd.work_model, jd.employment_type, jd.duration,
           jd.is_unionized, jd.union_name, jd.benefits
    FROM jobs j
    LEFT JOIN job_details jd ON j.id = jd.id
    ORDER BY j.is_active DESC, j.scraped_at DESC
  `);
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.end(JSON.stringify(result.rows));
}
