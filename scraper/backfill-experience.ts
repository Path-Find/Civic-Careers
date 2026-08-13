import { initDb } from './db';
import dotenv from 'dotenv';
import {
  appendExperienceQualificationBullets,
  extractExperienceRequirementsFromSources,
  extractExperienceSkills,
  isTruncatedExperienceRequirement,
  normalizeExperienceRequirements,
} from './requirements';

// Default: normalize populated fields only. Add --fill-missing to also extract
// experience from descriptions where the field is empty.

dotenv.config({ quiet: true });

const apply = process.argv.includes('--apply');
const fillMissing = process.argv.includes('--fill-missing');
const summaryOnly = process.argv.includes('--summary-only');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));
const PAGE_SIZE = 250;

type Change = { id: string; source: string; title: string; description: string; values: string[]; skills: string[] };

function parseList(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

async function main() {
  const db = await initDb();
  try {
    await db.execute('ALTER TABLE job_details ADD COLUMN experience_requirements TEXT');
  } catch (error) {
    if (!/duplicate column|already exists/i.test(String(error))) throw error;
  }

  const changes: Change[] = [];
  let offset = 0;
  let scanned = 0;
  while (scanned < limit) {
    const result = await db.execute({
      sql: `SELECT jd.id, j.source, jd.job_title, jd.description, jd.experience_requirements,
                   COALESCE(raw.raw_text, '') AS raw_text,
                   jd.required_skills
            FROM job_details jd
            JOIN jobs j ON j.id = jd.id
            LEFT JOIN raw_jobs raw ON raw.id = jd.id
            WHERE (jd.description IS NOT NULL AND jd.description != '')
               OR (raw.raw_text IS NOT NULL AND raw.raw_text != '')
            ORDER BY jd.id LIMIT ? OFFSET ?`,
      args: [Math.min(PAGE_SIZE, limit - scanned), offset],
    });
    if (result.rows.length === 0) break;
    for (const row of result.rows) {
      const current = parseList(row.experience_requirements);
      const currentSkills = parseList(row.required_skills);
      if (current.length === 0 && !fillMissing) continue;
      const description = String(row.description ?? '');
      const rawText = String(row.raw_text ?? '');
      const recovered = extractExperienceRequirementsFromSources(description, rawText)
        .filter(value => !isTruncatedExperienceRequirement(value));
      const safeCurrent = current.filter(value => !isTruncatedExperienceRequirement(value));
      const values = current.length > 0
        ? normalizeExperienceRequirements(
          safeCurrent.length === current.length || recovered.length === 0
            ? safeCurrent
            : [...safeCurrent, ...recovered],
        )
        : extractExperienceRequirementsFromSources(description, rawText);
      const nextDescription = appendExperienceQualificationBullets(description, safeCurrent);
      const skills = [...new Set([...currentSkills, ...extractExperienceSkills(current)])];
      if (JSON.stringify(values) !== JSON.stringify(current)
        || JSON.stringify(skills) !== JSON.stringify(currentSkills)
        || nextDescription !== description) {
        changes.push({
          id: String(row.id),
          source: String(row.source),
          title: String(row.job_title ?? ''),
          description: nextDescription,
          values,
          skills,
        });
      }
    }
    scanned += result.rows.length;
    offset += result.rows.length;
    console.log(`[Experience backfill] Scanned ${scanned} job(s).`);
    if (result.rows.length < PAGE_SIZE) break;
  }

  console.log(`[Experience backfill] ${apply ? 'Applying' : 'Dry run'} ${changes.length} candidate(s).`);
  for (const change of changes.slice(0, summaryOnly ? 0 : 30)) {
    console.log(JSON.stringify(change));
  }
  if (!apply || changes.length === 0) return;

  for (let i = 0; i < changes.length; i += 100) {
    await db.batch(changes.slice(i, i + 100).map(change => ({
      sql: 'UPDATE job_details SET description = ?, experience_requirements = ?, required_skills = ? WHERE id = ?',
      args: [change.description, JSON.stringify(change.values), JSON.stringify(change.skills), change.id],
    })), 'write');
  }
  console.log(`[Experience backfill] Updated ${changes.length} row(s).`);
}

main().catch(error => {
  console.error('[Experience backfill] Failed:', error);
  process.exitCode = 1;
});
