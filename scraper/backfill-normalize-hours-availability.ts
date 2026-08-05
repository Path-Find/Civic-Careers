/**
 * Normalize job_details.hours + availability (and split fused hours strings).
 *
 * Usage:
 *   npx tsx backfill-normalize-hours-availability.ts           # dry-run
 *   npx tsx backfill-normalize-hours-availability.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { splitHoursAndAvailability } from './hours-availability';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const query = await db.execute(`
    SELECT j.id, j.source, d.job_title, d.hours, d.availability
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE (d.hours IS NOT NULL AND trim(d.hours) != '')
       OR (d.availability IS NOT NULL AND trim(d.availability) != '')
    ORDER BY j.source, j.id
  `);

  type Change = {
    id: string;
    source: string;
    fromH: string;
    toH: string;
    fromA: string;
    toA: string;
  };
  const changes: Change[] = [];

  for (const row of query.rows) {
    const fromH = String(row.hours ?? '').trim();
    const fromA = String(row.availability ?? '').trim();
    const { hours: toH, availability: toA } = splitHoursAndAvailability(fromH, fromA);
    if (toH === fromH && toA === fromA) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      fromH,
      toH,
      fromA,
      toA,
    });
  }

  console.log(`[hours-availability] Scanned ${query.rows.length} row(s) with hours and/or availability.`);
  console.log(`[hours-availability] Would change: ${changes.length}${APPLY ? ' (applying)' : ' (dry-run)'}.`);
  for (const c of changes) {
    console.log(
      `  ${c.source} ${c.id}\n    hours: ${JSON.stringify(c.fromH)} → ${JSON.stringify(c.toH)}\n    avail: ${JSON.stringify(c.fromA)} → ${JSON.stringify(c.toA)}`,
    );
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await db.execute({
      sql: `UPDATE job_details SET hours = ?, availability = ? WHERE id = ?`,
      args: [c.toH || null, c.toA || null, c.id],
    });
  }
  console.log(`Updated ${changes.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/hours-availability-normalize-2026-08-04.md');
  fs.writeFileSync(
    outPath,
    [
      '# Hours / availability normalize 2026-08-04',
      '',
      `Scanned: ${query.rows.length}`,
      `Updated: ${changes.length}`,
      '',
      ...changes.map(
        (c) =>
          `- \`${c.id}\` hours \`${c.fromH}\` → \`${c.toH || '(empty)'}\`; availability \`${c.fromA}\` → \`${c.toA || '(empty)'}\``,
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
