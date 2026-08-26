import { initDb } from './db';
import { cleanCompensationSections, cleanJobDescription, removePlaceholderSections } from './cleanup_description';
import { cleanSourceDescriptionBoilerplate } from './source-description-cleanup';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));
const sourceArg = process.argv.find(value => value.startsWith('--source='));
const sourceFilter = sourceArg?.slice('--source='.length) || '';
const sourceOnly = process.argv.includes('--source-only');
const placeholderOnly = process.argv.includes('--placeholder-only');
const compensationOnly = process.argv.includes('--compensation-only');
const includeArchive = process.argv.includes('--include-archive');

async function main() {
  const db = await initDb() as any;
  const query = {
    sql: `
      SELECT j.id, j.source, jd.job_title, jd.description
      FROM jobs j
      JOIN job_details jd ON jd.id = j.id
      WHERE jd.description IS NOT NULL AND jd.description != ''
        ${sourceFilter ? 'AND j.source = ?' : ''}
      ORDER BY j.source, j.id
    `,
    args: sourceFilter ? [sourceFilter] : [],
  };
  const current = (await db.execute(query)).rows.map((row: Record<string, unknown>) => ({ ...row, store: 'current' }));
  const archive = includeArchive && typeof db.executeArchive === 'function'
    ? (await db.executeArchive(query)).rows.map((row: Record<string, unknown>) => ({ ...row, store: 'archive' }))
    : [];
  const result = [...current, ...archive];

  const transformed = result.map((row: Record<string, unknown>) => {
    const before = String(row.description ?? '');
    const after = placeholderOnly
      ? removePlaceholderSections(before)
      : sourceOnly
      ? cleanSourceDescriptionBoilerplate(String(row.source ?? ''), before)
      : compensationOnly
      ? cleanCompensationSections(before)
      : cleanJobDescription(before, String(row.job_title ?? ''), String(row.source ?? ''));
    return {
      id: String(row.id),
      source: String(row.source),
      job_title: String(row.job_title ?? ''),
      store: String(row.store),
      before,
      after,
    };
  });
  const skippedEmpty = transformed.filter(row => row.before !== row.after && !row.after.trim());
  const allChanges = transformed.filter(row => row.before !== row.after && row.after.trim());
  const candidates = allChanges.slice(0, limit);
  const bySource = new Map<string, number>();
  for (const row of allChanges) bySource.set(row.source, (bySource.get(row.source) ?? 0) + 1);

  console.log(`[Description cleanup] Scanned ${result.length} descriptions${includeArchive ? ' (current + archive)' : ''}.`);
  const mode = placeholderOnly ? 'placeholder sections only' : sourceOnly ? 'source rules only' : compensationOnly ? 'compensation sections only' : '';
  console.log(`[Description cleanup] ${apply ? 'Applying' : 'Dry run'} ${allChanges.length} candidate(s); showing ${candidates.length}${mode ? ` (${mode})` : ''}.`);
  if (skippedEmpty.length > 0) console.log(`[Description cleanup] Skipping ${skippedEmpty.length} candidate(s) that would become empty.`);
  console.log(`[Description cleanup] Sources: ${[...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([source, count]) => `${source}=${count}`).join(', ')}`);
  for (const row of candidates) {
    console.log(`\n[${row.store}] [${row.id}] ${row.job_title} (${row.source})`);
    console.log(`BEFORE: ${row.before.replace(/\s+/g, ' ').slice(0, 360)}`);
    console.log(`AFTER:  ${row.after.replace(/\s+/g, ' ').slice(0, 360)}`);
  }

  if (!apply || allChanges.length === 0) return;
  const currentChanges = allChanges.filter(row => row.store === 'current');
  const archiveChanges = allChanges.filter(row => row.store === 'archive');
  if (currentChanges.length > 0) await db.batch(currentChanges.map(row => ({
    sql: `UPDATE job_details SET description = ? WHERE id = ?`,
    args: [row.after, row.id],
  })), 'write');
  if (archiveChanges.length > 0) {
    if (typeof db.batchArchive !== 'function') throw new Error('Archive database is unavailable; refusing to write archive rows.');
    await db.batchArchive(archiveChanges.map(row => ({
      sql: `UPDATE job_details SET description = ? WHERE id = ?`,
      args: [row.after, row.id],
    })));
  }
  console.log(`[Description cleanup] Updated ${currentChanges.length} current and ${archiveChanges.length} archived row(s).`);
}

main().catch(error => {
  console.error('[Description cleanup] Failed:', error);
  process.exitCode = 1;
});
