import { initDb } from './db';

const apply = process.argv.includes('--apply');

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.closing_date
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE j.is_active = 0
      AND COALESCE(jd.is_inventory, 0) = 0
      AND jd.closing_date IS NOT NULL
      AND jd.closing_date != ''
      AND substr(jd.closing_date, 1, 10) >= CURRENT_DATE::text
    ORDER BY j.source, substr(jd.closing_date, 1, 10), jd.job_title
  `);

  const candidates = result.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    job_title: row.job_title == null ? null : String(row.job_title),
    closing_date: String(row.closing_date),
  }));
  const companies = new Set(candidates.map(candidate => candidate.source));
  console.log(`[Reactivate open jobs] ${candidates.length} jobs across ${companies.size} companies.`);
  for (const candidate of candidates.slice(0, 40)) console.log(JSON.stringify(candidate));

  if (!apply) {
    console.log('[Reactivate open jobs] Dry run only. Pass --apply to update jobs.');
    return;
  }

  await db.batch(candidates.map(candidate => ({
    sql: 'UPDATE jobs SET is_active = 1 WHERE id = ? AND is_active = 0',
    args: [candidate.id],
  })), 'write');
  console.log(`[Reactivate open jobs] Reactivated ${candidates.length} jobs.`);
}

main().catch(error => {
  console.error('[Reactivate open jobs] Failed:', error);
  process.exitCode = 1;
});
