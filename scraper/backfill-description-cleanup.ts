import { initDb } from './db';
import { cleanJobDescription } from './cleanup_description';
import { cleanSourceDescriptionBoilerplate } from './source-description-cleanup';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const sourceFilter = sourceArg?.slice('--source='.length) || '';
const sourceOnly = process.argv.includes('--source-only');

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE jd.description IS NOT NULL AND jd.description != ''
      ${sourceFilter ? 'AND j.source = ?' : ''}
    ORDER BY j.source, j.id
  `, sourceFilter ? [sourceFilter] : undefined);

  const candidates = result.rows.map(row => {
    const before = String(row.description ?? '');
    const after = sourceOnly
      ? cleanSourceDescriptionBoilerplate(String(row.source ?? ''), before)
      : cleanJobDescription(before, String(row.job_title ?? ''), String(row.source ?? ''));
    return {
      id: String(row.id),
      source: String(row.source),
      job_title: String(row.job_title ?? ''),
      before,
      after,
    };
  }).filter(row => row.before !== row.after).slice(0, limit);

  const allChanges = result.rows.map(row => {
    const before = String(row.description ?? '');
    const after = sourceOnly
      ? cleanSourceDescriptionBoilerplate(String(row.source ?? ''), before)
      : cleanJobDescription(before, String(row.job_title ?? ''), String(row.source ?? ''));
    return { id: String(row.id), source: String(row.source), before, after };
  }).filter(row => row.before !== row.after);
  const bySource = new Map<string, number>();
  for (const row of allChanges) bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);

  console.log(`[Description cleanup] Scanned ${result.rows.length} descriptions.`);
  console.log(`[Description cleanup] ${apply ? 'Applying' : 'Dry run'} ${allChanges.length} candidate(s); showing ${candidates.length}${sourceOnly ? ' (source rules only)' : ''}.`);
  console.log(`[Description cleanup] Sources: ${[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([source, count]) => `${source}=${count}`).join(', ')}`);
  for (const row of candidates) {
    console.log(`\n[${row.id}] ${row.job_title} (${row.source})`);
    console.log(`BEFORE: ${row.before.replace(/\s+/g, ' ').slice(0, 360)}`);
    console.log(`AFTER:  ${row.after.replace(/\s+/g, ' ').slice(0, 360)}`);
  }

  if (!apply || allChanges.length === 0) return;
  await db.batch(allChanges.map(row => ({
    sql: `UPDATE job_details SET description = ? WHERE id = ?`,
    args: [row.after, row.id],
  })), 'write');
  console.log(`[Description cleanup] Updated ${allChanges.length} row(s).`);
}

main().catch(error => {
  console.error('[Description cleanup] Failed:', error);
  process.exitCode = 1;
});
