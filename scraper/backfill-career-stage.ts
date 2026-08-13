import { initDb } from './db';
import { classifyCareerStage, type CareerStage } from './career-stage';

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT jd.id, jd.job_title, jd.is_student, jd.career_stage, raw.raw_text
    FROM job_details jd
    LEFT JOIN raw_jobs raw ON raw.id = jd.id
    ORDER BY jd.id
  `);
  const updates = result.rows.map(row => ({
    id: String(row.id),
    previous: row.career_stage == null ? null : String(row.career_stage),
    careerStage: classifyCareerStage({
      title: row.job_title == null ? null : String(row.job_title),
      rawText: row.raw_text == null ? null : String(row.raw_text),
      isStudent: row.is_student == null ? null : Number(row.is_student),
    }),
  })).filter(row => row.previous !== row.careerStage);

  const counts = updates.reduce<Record<string, number>>((summary, row) => {
    const label = row.careerStage ?? 'uncategorized';
    summary[label] = (summary[label] ?? 0) + 1;
    return summary;
  }, {});
  console.log(`[Career stage] ${APPLY ? 'Applying' : 'Dry run'}: ${updates.length} update(s)${Object.keys(counts).length ? ` (${Object.entries(counts).map(([stage, count]) => `${stage}=${count}`).join(', ')})` : ''}.`);

  if (APPLY) {
    for (let index = 0; index < updates.length; index += 100) {
      await db.batch(updates.slice(index, index + 100).map(update => ({
        sql: 'UPDATE job_details SET career_stage = ? WHERE id = ?',
        args: [update.careerStage as CareerStage | null, update.id],
      })), 'write');
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
