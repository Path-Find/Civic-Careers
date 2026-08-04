import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { extractExperienceRequirements } from './requirements';

dotenv.config();

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));
const PAGE_SIZE = 250;

type Change = { id: string; source: string; title: string; values: string[] };

function parseList(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
  try {
    await db.execute('ALTER TABLE job_details ADD COLUMN experience_requirements TEXT');
  } catch (error) {
    if (!/duplicate column/i.test(String(error))) throw error;
  }

  const changes: Change[] = [];
  let offset = 0;
  let scanned = 0;
  while (scanned < limit) {
    const result = await db.execute({
      sql: `SELECT jd.id, j.source, jd.job_title, jd.description, jd.experience_requirements
            FROM job_details jd JOIN jobs j ON j.id = jd.id
            WHERE jd.description IS NOT NULL AND jd.description != ''
            ORDER BY jd.id LIMIT ? OFFSET ?`,
      args: [Math.min(PAGE_SIZE, limit - scanned), offset],
    });
    if (result.rows.length === 0) break;
    for (const row of result.rows) {
      const current = parseList(row.experience_requirements);
      if (current.length > 0) continue;
      const values = extractExperienceRequirements(String(row.description ?? ''));
      if (values.length > 0) {
        changes.push({
          id: String(row.id),
          source: String(row.source),
          title: String(row.job_title ?? ''),
          values,
        });
      }
    }
    scanned += result.rows.length;
    offset += result.rows.length;
    console.log(`[Experience backfill] Scanned ${scanned} job(s).`);
    if (result.rows.length < PAGE_SIZE) break;
  }

  console.log(`[Experience backfill] ${apply ? 'Applying' : 'Dry run'} ${changes.length} candidate(s).`);
  for (const change of changes.slice(0, 30)) {
    console.log(JSON.stringify(change));
  }
  if (!apply || changes.length === 0) return;

  for (let i = 0; i < changes.length; i += 100) {
    await db.batch(changes.slice(i, i + 100).map(change => ({
      sql: 'UPDATE job_details SET experience_requirements = ? WHERE id = ?',
      args: [JSON.stringify(change.values), change.id],
    })), 'write');
  }
  console.log(`[Experience backfill] Updated ${changes.length} row(s).`);
}

main().catch(error => {
  console.error('[Experience backfill] Failed:', error);
  process.exitCode = 1;
});
