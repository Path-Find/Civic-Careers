/**
 * Extract expected/role start dates from raw_text into job_details.start_date.
 * Only fills empty fields.
 *
 *   npx tsx backfill-start-dates.ts           # dry-run
 *   npx tsx backfill-start-dates.ts --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { extractStartDate } from './start-date';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Candidate = {
  id: string;
  source: string;
  title: string;
  startDate: string;
};

async function main() {
  const db = await initDb();

  // Ensure column exists (same as initDb migration).
  try {
    await db.execute(`ALTER TABLE job_details ADD COLUMN start_date TEXT`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/duplicate column|already exists/i.test(message)) throw err;
  }

  const result = await db.execute(`
    SELECT r.id, r.source, r.raw_text, d.job_title, d.description, d.start_date
    FROM raw_jobs r
    JOIN job_details d ON d.id = r.id
    WHERE r.raw_text IS NOT NULL AND r.raw_text != ''
      AND (d.start_date IS NULL OR d.start_date = '')
  `);

  const candidates: Candidate[] = [];
  const bySource = new Map<string, number>();
  const valueDist = new Map<string, number>();

  for (const row of result.rows) {
    const extracted = extractStartDate(`${row.raw_text ?? ''}\n${row.description ?? ''}`);
    if (!extracted) continue;
    const source = String(row.source);
    candidates.push({
      id: String(row.id),
      source,
      title: String(row.job_title ?? ''),
      startDate: extracted,
    });
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
    valueDist.set(extracted, (valueDist.get(extracted) ?? 0) + 1);
  }

  console.log(`[Start date backfill] Scanned ${result.rows.length} jobs missing start_date.`);
  console.log(`[Start date backfill] ${APPLY ? 'Applying' : 'Dry run'}: ${candidates.length} fillable.`);
  console.log('[Start date backfill] By source:', JSON.stringify(Object.fromEntries(
    [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25),
  ), null, 2));
  console.log('[Start date backfill] Top values:');
  for (const [value, n] of [...valueDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(String(n).padStart(4), value);
  }
  for (const c of candidates.slice(0, 20)) {
    console.log(`- ${c.startDate} | ${c.source} | ${c.title || c.id}`);
  }
  if (candidates.length > 20) console.log(`- … ${candidates.length - 20} more`);

  if (!APPLY || candidates.length === 0) {
    if (!APPLY) console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of candidates) {
    await db.execute({
      sql: `UPDATE job_details SET start_date = ? WHERE id = ? AND (start_date IS NULL OR start_date = '')`,
      args: [c.startDate, c.id],
    });
  }
  console.log(`[Start date backfill] Updated ${candidates.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/start-date-backfill-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Start date backfill — 2026-08-04',
    '',
    'New structured field `job_details.start_date` (ISO date or short free text: Immediate / Fall 2026 / October 2026).',
    '',
    `Updated: ${candidates.length} rows.`,
    '',
    '## Labels recognized',
    '',
    '- Expected / Anticipated / Target / Position / Employment / Work start date',
    '- Start date / Starting date / Commencement date',
    '- Prose: "start date is …"',
    '',
    '## By source',
    '',
    ...[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `- ${s}: ${n}`),
    '',
    '## Job IDs',
    '',
    '```',
    ...candidates.map(c => `${c.id}\t${c.startDate}`),
    '```',
    '',
  ].join('\n'));
  console.log(`[Start date backfill] Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
