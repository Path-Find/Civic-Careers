import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from '../../_db.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const parsed = new URL(req.url!, `http://${req.headers.host}`);
  const pathMatch = parsed.pathname.match(/\/api\/jobs\/([^/]+)\/toggle-save/);
  const id = pathMatch?.[1] ?? parsed.searchParams.get('id');
  if (!id) {
    res.writeHead(400);
    res.end('Missing id');
    return;
  }

  try {
    const db = createDb();
    await db.execute({ sql: 'UPDATE jobs SET is_saved = 1 - is_saved WHERE id = ?', args: [id] });
    const result = await db.execute({ sql: 'SELECT is_saved FROM jobs WHERE id = ?', args: [id] });
    if (result.rows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Job not found' }));
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.rows[0]));
  } catch (error) {
    console.error('[API] Failed to toggle saved job:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unable to update saved job right now' }));
  }
}
