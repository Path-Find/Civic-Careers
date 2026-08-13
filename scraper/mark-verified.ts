/**
 * Mark (or clear) whole-job human verification on jobs.verified_at.
 *
 * Usage:
 *   npx tsx mark-verified.ts <job_id> [job_id...]
 *   npx tsx mark-verified.ts --clear <job_id> [job_id...]
 *   npx tsx mark-verified.ts --list   # show recently verified (limit 50)
 */
import { initDb } from './db';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const CLEAR = process.argv.includes('--clear');
const LIST = process.argv.includes('--list');
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));

async function main() {
  const db = await initDb();

  // Ensure column exists (idempotent).
  try {
    await db.execute(`ALTER TABLE jobs ADD COLUMN verified_at TIMESTAMPTZ`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/duplicate column|already exists/i.test(message)) throw err;
  }

  if (LIST) {
    const rows = await db.execute(`
      SELECT j.id, j.source, j.verified_at, d.job_title
      FROM jobs j
      LEFT JOIN job_details d ON d.id = j.id
      WHERE j.verified_at IS NOT NULL
      ORDER BY j.verified_at DESC
      LIMIT 50
    `);
    for (const r of rows.rows) {
      console.log(`${r.verified_at}  ${r.id}  ${r.source}  ${r.job_title ?? ''}`);
    }
    console.log(`(${rows.rows.length} shown)`);
    return;
  }

  if (!ids.length) {
    console.error('Usage: npx tsx mark-verified.ts [--clear] <job_id>...');
    console.error('       npx tsx mark-verified.ts --list');
    process.exit(1);
  }

  for (const id of ids) {
    const existing = await db.execute({
      sql: `SELECT id, verified_at FROM jobs WHERE id = ?`,
      args: [id],
    });
    if (!existing.rows.length) {
      console.error(`Not found: ${id}`);
      continue;
    }
    if (CLEAR) {
      await db.execute({
        sql: `UPDATE jobs SET verified_at = NULL WHERE id = ?`,
        args: [id],
      });
      console.log(`Cleared verified_at: ${id}`);
    } else {
      await db.execute({
        sql: `UPDATE jobs SET verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [id],
      });
      console.log(`Verified: ${id}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
