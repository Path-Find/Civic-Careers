/**
 * Strip employment/duration/inventory noise from job_details.job_title.
 *
 * Usage:
 *   npx tsx backfill-normalize-titles.ts           # dry-run
 *   npx tsx backfill-normalize-titles.ts --apply   # write
 *   npx tsx backfill-normalize-titles.ts --active-only
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { normalizeJobTitle } from './title';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

type Change = {
  id: string;
  source: string;
  is_active: number;
  from: string;
  to: string;
};

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.job_title IS NOT NULL
      AND trim(d.job_title) != ''
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
    ORDER BY j.source, j.id
  `);

  const changes: Change[] = [];
  let already = 0;

  for (const row of query.rows) {
    const from = String(row.job_title ?? '');
    const to = normalizeJobTitle(from);
    if (from === to) {
      already++;
      continue;
    }
    changes.push({
      id: String(row.id),
      source: String(row.source),
      is_active: Number(row.is_active ?? 0),
      from,
      to,
    });
  }

  console.log(`Rows with title: ${query.rows.length}`);
  console.log(`Already clean: ${already}`);
  console.log(`Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}`);
  console.log(`Active among changes: ${changes.filter(c => c.is_active === 1).length}`);

  console.log('\nSample changes (up to 40):');
  for (const c of changes.slice(0, 40)) {
    console.log(`  ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`);
  }

  if (APPLY && changes.length) {
    const BATCH = 50;
    for (let i = 0; i < changes.length; i += BATCH) {
      const slice = changes.slice(i, i + BATCH);
      await db.batch(
        slice.map((c) => ({
          sql: 'UPDATE job_details SET job_title = ? WHERE id = ?',
          args: [c.to, c.id],
        })),
        'write',
      );
      console.log(`  wrote ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
    }
    console.log('Done.');
  } else if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to write to Turso.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
