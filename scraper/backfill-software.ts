import { initDb } from './db';
import { dedupeSkillsAgainstSoftware, extractSoftwareRequirements } from './requirements';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 100));

async function main() {
  const db = await initDb();
  const result = await db.execute({
    sql: `SELECT jd.id, jd.job_title, j.source, jd.description, jd.software_requirements,
                 jd.required_skills
          FROM job_details jd JOIN jobs j ON j.id = jd.id
          WHERE jd.description IS NOT NULL AND j.is_active = 1
          ORDER BY jd.id`
  });

  const candidates = [] as Array<{ id: string; job_title: string; source: string; values: string[]; skills: string[]; skippedOptionalLines: number }>;
  let skippedOptionalLines = 0;
  for (const row of result.rows) {
    const extracted = extractSoftwareRequirements(String(row.description));
    skippedOptionalLines += extracted.skippedOptionalLines;
    if (!extracted.values.length && !row.required_skills) continue;
    const currentValues = row.software_requirements ? JSON.parse(String(row.software_requirements)) : [];
    const currentSkills = row.required_skills ? JSON.parse(String(row.required_skills)) : [];
    // Do not erase an existing AI/software value merely because this
    // deterministic extractor does not recognize it yet. Replace the field
    // only when the source produced a trustworthy non-empty set.
    const nextValues = extracted.values.length ? extracted.values : currentValues;
    const nextSkills = dedupeSkillsAgainstSoftware(currentSkills, nextValues);
    const hasSameValues = currentValues.length === nextValues.length
      && currentValues.every((value: string) => nextValues.includes(value));
    const hasSameSkills = currentSkills.length === nextSkills.length
      && currentSkills.every((value: string) => nextSkills.includes(value));
    if (hasSameValues && hasSameSkills) continue;
    candidates.push({
      id: String(row.id),
      job_title: String(row.job_title),
      source: String(row.source),
      values: nextValues,
      skills: nextSkills,
      skippedOptionalLines: extracted.skippedOptionalLines,
    });
    if (candidates.length >= limit) break;
  }

  console.log(`[Software backfill] ${apply ? 'Applying' : 'Dry run'} ${candidates.length} candidate(s); skipped ${skippedOptionalLines} optional software line(s).`);
  for (const candidate of candidates) {
    console.log(`- ${candidate.job_title} (${candidate.source}): software=${candidate.values.join(', ')}; skills=${candidate.skills.join(', ')}`);
  }

  if (!apply || candidates.length === 0) return;
  await db.batch(candidates.map(candidate => ({
    sql: `UPDATE job_details SET software_requirements = ?, required_skills = ?
          WHERE id = ?`,
    args: [JSON.stringify(candidate.values), JSON.stringify(candidate.skills), candidate.id],
  })), 'write');
  console.log(`[Software backfill] Updated ${candidates.length} row(s).`);
}

main().catch(error => {
  console.error('[Software backfill] Failed:', error);
  process.exitCode = 1;
});
