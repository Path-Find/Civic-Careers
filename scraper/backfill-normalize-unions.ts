/**
 * Light-normalize union_name + is_unionized consistency.
 *
 * Usage:
 *   npx tsx backfill-normalize-unions.ts           # dry-run
 *   npx tsx backfill-normalize-unions.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeUnionFields } from './validate';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, d.job_title, d.union_name, d.is_unionized
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE (d.union_name IS NOT NULL AND trim(d.union_name) != '')
       OR d.is_unionized IS NOT NULL
    ORDER BY j.source, j.id
  `);

  type Change = {
    id: string;
    source: string;
    fromName: string;
    toName: string;
    fromFlag: number | null;
    toFlag: number;
  };
  const changes: Change[] = [];

  for (const row of query.rows) {
    const fromName = String(row.union_name ?? '').trim();
    const fromFlag = row.is_unionized == null ? null : Number(row.is_unionized);
    const next = normalizeUnionFields(fromName || null, fromFlag === 1);
    const toName = next.union_name;
    const toFlag = next.is_unionized ? 1 : 0;
    if (toName === fromName && toFlag === (fromFlag ?? 0)) continue;
    // Skip pure flag null→0 with empty name if already empty and not unionized interest
    if (!fromName && fromFlag == null && !toName && toFlag === 0) continue;
    if (!fromName && fromFlag === 0 && !toName && toFlag === 0) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      fromName,
      toName,
      fromFlag,
      toFlag,
    });
  }

  console.log(`[normalize-unions] Scanned ${query.rows.length}. Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}.`);
  const samples = changes.slice(0, 40);
  for (const c of samples) {
    console.log(
      `  ${JSON.stringify(c.fromName)} uni=${c.fromFlag} → ${JSON.stringify(c.toName)} uni=${c.toFlag}`,
    );
  }
  if (changes.length > samples.length) console.log(`  … +${changes.length - samples.length} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    const slice = changes.slice(i, i + BATCH);
    await db.batch(
      slice.map((c) => ({
        sql: `UPDATE job_details SET union_name = ?, is_unionized = ? WHERE id = ?`,
        args: [c.toName || null, c.toFlag, c.id],
      })),
      'write',
    );
    process.stdout.write(`\rApplied ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
  }
  console.log('\nDone.');

  const outPath = path.resolve(__dirname, '../docs/union-normalize-2026-08-04.md');
  fs.writeFileSync(
    outPath,
    [
      '# Union normalize 2026-08-04',
      '',
      `Scanned: ${query.rows.length}`,
      `Updated: ${changes.length}`,
      '',
      ...samples.map(
        (c) =>
          `- \`${c.fromName || '(empty)'}\` uni=${c.fromFlag} → \`${c.toName || '(empty)'}\` uni=${c.toFlag}`,
      ),
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
