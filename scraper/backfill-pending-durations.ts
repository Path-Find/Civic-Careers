import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { extractPendingMetadata } from './pending-metadata';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    await db.execute('ALTER TABLE raw_jobs ADD COLUMN pending_duration TEXT');
  } catch (error) {
    if (!/duplicate column/i.test(String(error))) throw error;
  }

  const result = await db.execute(`
    SELECT r.id, r.source, r.title, r.raw_text
    FROM raw_jobs r
    LEFT JOIN job_details d ON d.id = r.id
    WHERE d.id IS NULL AND r.parsed_at IS NULL
    ORDER BY r.source, r.id
  `);

  const counts = new Map<string, number>();
  let matched = 0;
  for (const row of result.rows) {
    const duration = extractPendingMetadata(String(row.title ?? ''), String(row.raw_text ?? '')).duration;
    if (!duration) continue;

    matched += 1;
    counts.set(String(row.source), (counts.get(String(row.source)) ?? 0) + 1);
    if (APPLY) {
      await db.execute({
        sql: 'UPDATE raw_jobs SET pending_duration = ? WHERE id = ? AND parsed_at IS NULL',
        args: [duration, row.id],
      });
    }
  }

  console.log(`${APPLY ? 'Updated' : 'Would update'} ${matched} pending job(s).`);
  for (const [source, count] of counts) console.log(`${source}: ${count}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
