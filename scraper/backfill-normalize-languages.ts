/**
 * Normalize language_requirements across job_details to plain names only
 * (English | French | Bilingual | named other) via normalizeLanguageRequirements().
 *
 * Usage:
 *   npx tsx backfill-normalize-languages.ts           # dry-run
 *   npx tsx backfill-normalize-languages.ts --apply   # write
 *   npx tsx backfill-normalize-languages.ts --active-only
 */
import { initDb } from './db';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { normalizeLanguageRequirements } from './requirements';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const ACTIVE_ONLY = process.argv.includes('--active-only');

type Change = {
  id: string;
  source: string;
  title: string;
  is_active: number;
  from: string;
  to: string;
};

function parseField(raw: string | null): unknown {
  if (raw == null || raw === '') return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function main() {
  const db = await initDb();

  const query = await db.execute(`
    SELECT j.id, j.source, j.is_active, d.job_title, d.language_requirements
    FROM jobs j
    JOIN job_details d ON d.id = j.id
    WHERE d.language_requirements IS NOT NULL
      AND d.language_requirements != ''
      AND d.language_requirements != '[]'
      ${ACTIVE_ONLY ? 'AND j.is_active = 1' : ''}
    ORDER BY j.source, j.id
  `);

  const changes: Change[] = [];
  const resultDist = new Map<string, number>();

  for (const row of query.rows) {
    const from = String(row.language_requirements);
    const toArr = normalizeLanguageRequirements(parseField(from));
    const to = JSON.stringify(toArr);
    resultDist.set(to, (resultDist.get(to) || 0) + 1);
    if (to === from) continue;
    changes.push({
      id: String(row.id),
      source: String(row.source),
      title: String(row.job_title ?? ''),
      is_active: Number(row.is_active ?? 0),
      from,
      to,
    });
  }

  console.log(`[normalize-languages] Scanned ${query.rows.length} filled language field(s)${ACTIVE_ONLY ? ' (active only)' : ''}.`);
  console.log(`[normalize-languages] Would change: ${changes.length}.`);
  console.log(`[normalize-languages] Would clear to []: ${changes.filter(c => c.to === '[]').length}.`);

  const pairCounts = new Map<string, number>();
  for (const c of changes) {
    const key = `${c.from} => ${c.to}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }
  console.log('\n=== Unique transforms (count) ===');
  for (const [key, n] of [...pairCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(String(n).padStart(4), key);
  }

  console.log('\n=== Result distribution after normalize (all scanned) ===');
  for (const [key, n] of [...resultDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log(String(n).padStart(4), key);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write.');
    return;
  }

  let updated = 0;
  for (const change of changes) {
    await db.execute({
      sql: 'UPDATE job_details SET language_requirements = ? WHERE id = ?',
      args: [change.to, change.id],
    });
    updated += 1;
  }
  console.log(`\n[normalize-languages] Updated ${updated} row(s).`);

  const outPath = path.resolve(__dirname, '../docs/language-normalize-2026-08-04.md');
  const lines = [
    '# Language field normalization — 2026-08-04',
    '',
    'Ran `scraper/backfill-normalize-languages.ts --apply` against Turso `job_details.language_requirements`.',
    '',
    `Scanned: ${query.rows.length} filled fields${ACTIVE_ONLY ? ' (active only)' : ' (all jobs)'}.`,
    `Updated: ${updated}.`,
    `Cleared to empty: ${changes.filter(c => c.to === '[]').length}.`,
    '',
    '## Rules applied',
    '',
    '- Canonical tokens via `normalizeLanguageRequirements()` in `requirements.ts`',
    '- Collapse bare `Bilingual` under more specific bilingual forms',
    '- Drop standalone English/French when `Bilingual (English/French)` is present',
    '- Essential supersedes plain language name',
    '- PSC levels uppercased (`bbb/bbb` → `BBB/BBB`); `CBC level` → `CBC/CBC`',
    '- Multi-level imperative phrases expand to one token per level',
    '- Stable sort: Essential → plain EN/FR → other languages → Bilingual…',
    '',
    '## Updated job IDs',
    '',
    '| ID | Source | Title | From | To |',
    '|---|---|---|---|---|',
    ...changes.map(c =>
      `| \`${c.id}\` | ${c.source} | ${c.title.replace(/\|/g, '\\|')} | \`${c.from.replace(/\|/g, '\\|')}\` | \`${c.to.replace(/\|/g, '\\|')}\` |`
    ),
    '',
    '## IDs only',
    '',
    '```',
    ...changes.map(c => c.id),
    '```',
    '',
  ];
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`[normalize-languages] Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
