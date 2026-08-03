import { initDb } from './db';
import { reconcileStructuredRequirements } from './requirements';

const apply = process.argv.includes('--apply');
const sample = process.argv.includes('--sample');
const limitArg = process.argv.find(value => value.startsWith('--limit='));
const perSourceArg = process.argv.find(value => value.startsWith('--per-source='));
const limit = Math.max(1, Number(limitArg?.split('=')[1] || 10000));
const perSource = Math.max(1, Number(perSourceArg?.split('=')[1] || 1));

type Row = {
  id: string;
  source: string;
  job_title: string;
  description: string;
  education_requirements: string | null;
  license_requirements: string | null;
  benefits: string | null;
  required_skills: string | null;
};

type Work = Row & {
  education_requirements_next: string[];
  license_requirements_next: string[];
  benefits_next: string[];
  required_skills_next: string[];
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function sameList(left: string[], right: string[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  const db = await initDb();
  const query = await db.execute(`
    SELECT j.id, j.source, jd.job_title, jd.description,
           jd.education_requirements, jd.license_requirements,
           jd.benefits, jd.required_skills
    FROM jobs j
    JOIN job_details jd ON jd.id = j.id
    WHERE jd.description IS NOT NULL AND jd.description != ''
    ORDER BY j.source, j.id
  `);

  const rows: Row[] = query.rows.map(row => ({
    id: String(row.id),
    source: String(row.source),
    job_title: String(row.job_title ?? ''),
    description: String(row.description ?? ''),
    education_requirements: row.education_requirements as string | null,
    license_requirements: row.license_requirements as string | null,
    benefits: row.benefits as string | null,
    required_skills: row.required_skills as string | null,
  }));

  const work: Work[] = rows.map(row => {
    const result = reconcileStructuredRequirements(row.description, {
      education_requirements: parseList(row.education_requirements),
      license_requirements: parseList(row.license_requirements),
      benefits: parseList(row.benefits),
      required_skills: parseList(row.required_skills),
    });
    return {
      ...row,
      education_requirements_next: result.education_requirements,
      license_requirements_next: result.license_requirements,
      benefits_next: result.benefits,
      required_skills_next: result.required_skills,
    };
  });

  const candidates = work.filter(row =>
    !sameList(parseList(row.education_requirements), row.education_requirements_next)
    || !sameList(parseList(row.license_requirements), row.license_requirements_next)
    || !sameList(parseList(row.benefits), row.benefits_next)
    || !sameList(parseList(row.required_skills), row.required_skills_next)
  );

  const sourceCounts = new Map<string, number>();
  const selected = sample
    ? candidates.filter(row => {
      const count = sourceCounts.get(row.source) ?? 0;
      if (count >= perSource) return false;
      sourceCounts.set(row.source, count + 1);
      return true;
    }).slice(0, limit)
    : candidates.slice(0, limit);

  const educationDetected = work.filter(row => row.education_requirements_next.length > 0 && row.education_requirements_next.join(' ') !== parseList(row.education_requirements).join(' ')).length;
  const licenseDetected = work.filter(row => row.license_requirements_next.length > 0 && row.license_requirements_next.join(' ') !== parseList(row.license_requirements).join(' ')).length;
  const skillCorrections = work.filter(row => !sameList(parseList(row.required_skills), row.required_skills_next)).length;
  const benefitCorrections = work.filter(row => !sameList(parseList(row.benefits), row.benefits_next)).length;

  console.log(`[Education/licence backfill] Scanned ${work.length} parsed jobs.`);
  console.log(`[Education/licence backfill] Changes available: ${candidates.length}; education ${educationDetected}; licences ${licenseDetected}; skills ${skillCorrections}; benefits ${benefitCorrections}.`);
  console.log(`[Education/licence backfill] ${sample ? 'Source-balanced sample' : apply ? 'Applying' : 'Dry run'}: ${selected.length} job(s).`);
  for (const row of selected.slice(0, 30)) {
    console.log(JSON.stringify({
      id: row.id,
      source: row.source,
      title: row.job_title,
      education: row.education_requirements_next,
      licences: row.license_requirements_next,
      benefits: row.benefits_next,
      skills: row.required_skills_next,
    }));
  }

  if (!apply || sample || selected.length === 0) return;
  await db.batch(selected.map(row => ({
    sql: `UPDATE job_details
          SET education_requirements = ?, license_requirements = ?, benefits = ?, required_skills = ?
          WHERE id = ?`,
    args: [
      JSON.stringify(row.education_requirements_next),
      JSON.stringify(row.license_requirements_next),
      JSON.stringify(row.benefits_next),
      JSON.stringify(row.required_skills_next),
      row.id,
    ],
  })), 'write');
  console.log(`[Education/licence backfill] Updated ${selected.length} row(s).`);
}

main().catch(error => {
  console.error('[Education/licence backfill] Failed:', error);
  process.exitCode = 1;
});
