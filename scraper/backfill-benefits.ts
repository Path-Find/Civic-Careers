import { initDb } from './db';
import dotenv from 'dotenv';
import { normalizeBenefits } from './requirements';
import { BENEFIT_OVERRIDES } from './benefit-fixes';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');
const requestedIds = new Set(
  (process.argv.find(argument => argument.startsWith('--ids='))?.slice('--ids='.length) ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean),
);

function parseList(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = await initDb();
  const idFilter = requestedIds.size > 0
    ? ` AND j.id IN (${[...requestedIds].map(() => '?').join(',')})`
    : '';
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.benefits
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE j.is_active = 1
      AND jd.benefits IS NOT NULL
      AND jd.benefits != ''
      AND jd.benefits != '[]'
      ${idFilter}
    ORDER BY j.source, j.id
  `, [...requestedIds]);

  const changes = result.rows.map(row => {
    const before = parseList(row.benefits);
    const after = BENEFIT_OVERRIDES[String(row.id)] ?? normalizeBenefits(before);
    return {
      id: String(row.id),
      source: String(row.source ?? ''),
      title: String(row.job_title ?? ''),
      before,
      after,
    };
  }).filter(row => JSON.stringify(row.before) !== JSON.stringify(row.after));

  console.log(`[Benefits] ${requestedIds.size > 0 ? `Selected ${[...requestedIds].join(', ')}; ` : ''}Scanned ${result.rows.length}; ${APPLY ? 'updating' : 'would update'} ${changes.length}.`);
  for (const change of changes.slice(0, 40)) {
    console.log(`- ${change.source} | ${change.title || change.id}`);
    console.log(`  BEFORE: ${JSON.stringify(change.before)}`);
    console.log(`  AFTER:  ${JSON.stringify(change.after)}`);
  }
  if (changes.length > 40) console.log(`  …and ${changes.length - 40} more`);
  if (!APPLY || changes.length === 0) return;

  await db.batch(changes.map(change => ({
    sql: 'UPDATE job_details SET benefits = ? WHERE id = ?',
    args: [JSON.stringify(change.after), change.id],
  })), 'write');
  console.log(`[Benefits] Updated ${changes.length} row(s).`);
}

main().catch(error => {
  console.error('[Benefits] Failed:', error);
  process.exitCode = 1;
});
