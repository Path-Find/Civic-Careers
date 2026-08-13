/**
 * Canonicalize recurring certification labels without collapsing meaningful
 * differences such as First Aid level, CPR level, AED, or alternatives.
 *
 *   npx tsx backfill-certification-normalize.ts --active-only       # dry-run
 *   npx tsx backfill-certification-normalize.ts --active-only --apply
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeCertificationRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

function parseList(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

type Change = {
  id: string;
  source: string;
  title: string;
  isActive: number;
  from: string[];
  to: string[];
};

async function main() {
  const db = await initDb();

  const result = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.certification_requirements
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.certification_requirements IS NOT NULL
      AND d.certification_requirements NOT IN ('', '[]')
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
    ORDER BY j.source, j.id
  `);

  const changes: Change[] = [];
  for (const row of result.rows) {
    const from = parseList(row.certification_requirements);
    const to = normalizeCertificationRequirements(from);
    if (JSON.stringify(from) === JSON.stringify(to)) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      isActive: Number(row.is_active ?? 0),
      from,
      to,
    });
  }

  console.log(`Scanned ${result.rows.length} jobs.`);
  console.log(`Would update ${changes.length} certification lists (${changes.filter(c => c.isActive === 1).length} active).`);
  for (const change of changes.slice(0, 30)) {
    console.log(`- ${change.source} | ${change.title || change.id}`);
    console.log(`  ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`);
  }
  if (changes.length > 30) console.log(`  …and ${changes.length - 30} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  const BATCH_SIZE = 40;
  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    await db.batch(
      batch.map(change => ({
        sql: 'UPDATE job_details SET certification_requirements = ? WHERE id = ?',
        args: [JSON.stringify(change.to), change.id],
      })),
      'write',
    );
    console.log(`Wrote ${Math.min(i + BATCH_SIZE, changes.length)}/${changes.length}.`);
  }

  const outPath = path.resolve(__dirname, '../docs/certification-normalize-2026-08-05.md');
  fs.writeFileSync(outPath, [
    '# Certification normalization — 2026-08-05',
    '',
    `Updated: ${changes.length} ${ACTIVE_ONLY ? 'active ' : ''}job records.`,
    'Meaningful distinctions were preserved: First Aid level, CPR level, AED, and alternative levels.',
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(change => change.id),
    '```',
    '',
  ].join('\n'));
  console.log(`Wrote ${outPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
