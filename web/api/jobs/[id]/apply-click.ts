import type { IncomingMessage, ServerResponse } from 'node:http';
import { createArchiveDb, createDb } from '../../_db.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const pathMatch = parsed.pathname.match(/\/api\/jobs\/([^/]+)\/apply-click/);
  const rawId = pathMatch?.[1] ?? parsed.searchParams.get('id');
  const id = rawId ? decodeURIComponent(rawId) : rawId;
  if (!id) {
    res.writeHead(400);
    res.end('Missing id');
    return;
  }

  try {
    let db = createDb();
    let job = await db.execute({ sql: 'SELECT 1 FROM jobs WHERE id = ?', args: [id] });
    if (job.rows.length === 0) {
      db = createArchiveDb();
      job = await db.execute({ sql: 'SELECT 1 FROM jobs WHERE id = ?', args: [id] });
    }
    if (job.rows.length === 0) {
      res.writeHead(404);
      res.end('Job not found');
      return;
    }

    await db.execute({
      sql: `INSERT INTO job_apply_clicks (job_id, click_count, last_clicked_at)
            VALUES (?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(job_id) DO UPDATE SET
              click_count = job_apply_clicks.click_count + 1,
              last_clicked_at = CURRENT_TIMESTAMP`,
      args: [id],
    });
    res.writeHead(204);
    res.end();
  } catch (error) {
    console.error('[API] Failed to record apply click:', error);
    res.writeHead(500);
    res.end('Unable to record apply click');
  }
}
