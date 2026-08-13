/**
 * Title-case ALL CAPS multi-word departments (LEGISLATIVE SERVICES → Legislative Services).
 * Leaves short codes (EECS, CMHC) alone.
 *
 *   npx tsx backfill-department-casing.ts           # dry-run
 *   npx tsx backfill-department-casing.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import { normalizeDepartment } from './validate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = await initDb();

  const result = await db.execute(`
    SELECT id, department
    FROM job_details
    WHERE department IS NOT NULL AND department != ''
    ORDER BY id
  `);

  type Change = { id: string; from: string; to: string };
  const changes: Change[] = [];

  for (const row of result.rows) {
    const id = String(row.id);
    const from = String(row.department ?? '');
    const to = normalizeDepartment(from);
    if (to !== from) {
      changes.push({ id, from, to });
    }
  }

  const samples = new Map<string, number>();
  for (const c of changes) {
    const key = `${c.from} → ${c.to}`;
    samples.set(key, (samples.get(key) || 0) + 1);
  }

  console.log(`Rows scanned: ${result.rows.length}`);
  console.log(`Would update: ${changes.length}`);
  console.log('\nTop renames:');
  [...samples.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([label, n]) => console.log(`  ${String(n).padStart(4)}  ${label}`));

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    const batch = changes.slice(i, i + BATCH);
    await db.batch(
      batch.map(c => ({
        sql: 'UPDATE job_details SET department = ? WHERE id = ?',
        args: [c.to, c.id],
      })),
      'write',
    );
    updated += batch.length;
    if (updated % 200 === 0 || updated === changes.length) {
      console.log(`Updated ${updated}/${changes.length}`);
    }
  }

  console.log(`Done. Updated ${updated} departments.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
