import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { stripStructuredBenefitRestatements } from './cleanup_description';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

function parseList(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
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
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description, jd.benefits
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE j.is_active = 1
      AND COALESCE(jd.is_inventory, 0) = 0
      AND jd.description IS NOT NULL AND jd.description != ''
      AND jd.benefits IS NOT NULL AND jd.benefits != '' AND jd.benefits != '[]'
  `);
  const changes = result.rows.map(row => {
    const before = String(row.description ?? '');
    const after = stripStructuredBenefitRestatements(before, parseList(row.benefits));
    return {
      id: String(row.id),
      source: String(row.source ?? ''),
      title: String(row.job_title ?? ''),
      before,
      after,
    };
  }).filter(row => row.before !== row.after);

  console.log(`[Benefit restatements] Scanned ${result.rows.length}; ${APPLY ? 'updating' : 'would update'} ${changes.length}.`);
  for (const change of changes.slice(0, 25)) {
    console.log(`- ${change.source} | ${change.title || change.id}`);
    console.log(`  BEFORE: ${change.before.replace(/\s+/g, ' ').slice(0, 280)}`);
    console.log(`  AFTER:  ${change.after.replace(/\s+/g, ' ').slice(0, 280)}`);
  }
  if (changes.length > 25) console.log(`  …and ${changes.length - 25} more`);
  if (!APPLY || changes.length === 0) return;

  for (let i = 0; i < changes.length; i += 40) {
    await db.batch(
      changes.slice(i, i + 40).map(change => ({
        sql: 'UPDATE job_details SET description = ? WHERE id = ?',
        args: [change.after, change.id],
      })),
      'write',
    );
  }
  console.log(`[Benefit restatements] Updated ${changes.length} row(s).`);
}

main().catch(error => {
  console.error('[Benefit restatements] Failed:', error);
  process.exit(1);
});
