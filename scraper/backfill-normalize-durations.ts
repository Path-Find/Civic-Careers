/**
 * Normalize job_details.duration to preferred shapes (Permanent, ISO ranges, etc.).
 *
 * Usage:
 *   npx tsx backfill-normalize-durations.ts           # dry-run
 *   npx tsx backfill-normalize-durations.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeDuration } from './duration';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const query = await db.execute(`
    SELECT j.id, j.source, d.job_title, d.duration
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.duration IS NOT NULL AND trim(d.duration) != ''
    ORDER BY j.source, j.id
  `);

  const changes: { id: string; source: string; from: string; to: string }[] = [];
  let emptied = 0;
  const dist = new Map<string, number>();

  for (const row of query.rows) {
    const from = String(row.duration).trim();
    const to = normalizeDuration(from);
    if (to) dist.set(to, (dist.get(to) ?? 0) + 1);
    if (from === to) continue;
    if (!to) emptied++;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      from,
      to,
    });
  }

  console.log(`[normalize-durations] Scanned ${query.rows.length} filled duration(s).`);
  console.log(`[normalize-durations] Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}.`);
  console.log(`[normalize-durations] Would empty: ${emptied}.`);

  const pairs = new Map<string, number>();
  for (const c of changes) {
    const key = `${c.from.slice(0, 80)} => ${c.to || '(empty)'}`;
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  console.log('\n=== Top transforms ===');
  for (const [k, n] of [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log(String(n).padStart(4), k);
  }

  console.log('\n=== Result dist (changed rows target) ===');
  for (const [k, n] of [...dist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(String(n).padStart(4), k);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  const BATCH = 50;
  for (let i = 0; i < changes.length; i += BATCH) {
    const slice = changes.slice(i, i + BATCH);
    await db.batch(
      slice.map((c) => ({
        sql: `UPDATE job_details SET duration = ? WHERE id = ?`,
        args: [c.to || null, c.id],
      })),
      'write',
    );
    process.stdout.write(`\rApplied ${Math.min(i + BATCH, changes.length)}/${changes.length}`);
  }
  console.log('\nDone.');

  const outPath = path.resolve(__dirname, '../docs/duration-normalize-2026-08-04.md');
  fs.writeFileSync(
    outPath,
    [
      '# Duration normalize 2026-08-04',
      '',
      `Scanned: ${query.rows.length}`,
      `Updated: ${changes.length}`,
      `Emptied: ${emptied}`,
      '',
      '## Top transforms',
      '',
      ...[...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([k, n]) => `- ${n} \`${k}\``),
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
