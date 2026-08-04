/**
 * Normalize education_requirements: strip "Education:", "AS-01 only:", "ED1:",
 * stream labels, and other non-education prefixes.
 *
 *   npx tsx backfill-education-normalize.ts           # dry-run
 *   npx tsx backfill-education-normalize.ts --apply
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeEducationRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const query = await db.execute(`
    SELECT j.id, j.source, d.job_title, d.education_requirements
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.education_requirements IS NOT NULL
      AND d.education_requirements != ''
      AND d.education_requirements != '[]'
  `);

  const changes: Array<{ id: string; source: string; title: string; from: string; to: string }> = [];

  for (const row of query.rows) {
    const fromList = parseList(row.education_requirements as string | null);
    const toList = normalizeEducationRequirements(fromList);
    const from = JSON.stringify(fromList);
    const to = JSON.stringify(toList);
    if (from === to) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      from,
      to,
    });
  }

  console.log(`[education-normalize] Scanned ${query.rows.length} filled education fields.`);
  console.log(`[education-normalize] Would change: ${changes.length}.`);
  for (const c of changes.slice(0, 25)) {
    console.log(`- ${c.source} | ${c.title}`);
    console.log(`    from: ${c.from.slice(0, 160)}`);
    console.log(`    to:   ${c.to.slice(0, 160)}`);
  }
  if (changes.length > 25) console.log(`  …and ${changes.length - 25} more`);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  for (const c of changes) {
    await db.execute({
      sql: `UPDATE job_details SET education_requirements = ? WHERE id = ?`,
      args: [c.to, c.id],
    });
  }
  console.log(`[education-normalize] Updated ${changes.length} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/education-normalize-2026-08-04.md');
  fs.writeFileSync(outPath, [
    '# Education field normalize — 2026-08-04',
    '',
    'Stripped non-education prefixes from `education_requirements`:',
    '`Education:`, `*Education:**`, `ED1:`, `AED1`, stream labels, `AS-01 only:`, group codes, screening glue text.',
    '',
    `Updated: ${changes.length} rows.`,
    '',
    '## Job IDs',
    '',
    '```',
    ...changes.map(c => c.id),
    '```',
    '',
  ].join('\n'));
  console.log(`[education-normalize] Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
