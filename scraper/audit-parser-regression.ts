/**
 * Read-only deterministic parser regression audit.
 *
 * Selects a balanced sample from the current and archive Neon databases and
 * runs the same quality evaluator used before publication. This deliberately
 * does not call an AI provider, re-scrape a source, or write to either database.
 *
 *   npx tsx audit-parser-regression.ts
 *   npx tsx audit-parser-regression.ts --limit=6 --sources="Brock University,City of Ottawa"
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { evaluateJobQuality, type QualityEvaluation } from './quality-pipeline';

dotenv.config({ quiet: true });

const limit = Math.max(1, Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] ?? 5));
const requestedSources = process.argv.find(arg => arg.startsWith('--sources='))
  ?.split('=')[1]
  .split(',')
  .map(value => value.trim())
  .filter(Boolean) ?? [];

type Row = {
  id: string;
  source: string;
  store: 'current' | 'archive';
  url: string | null;
  application_url: string | null;
  raw_text: string | null;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  job_title: string | null;
  department: string | null;
  hours: string | null;
  salary_range: string | null;
  location: string | null;
  union_name: string | null;
  availability: string | null;
  duration: string | null;
  academic_course: string | null;
  academic_schedule: string | null;
  academic_term: string | null;
  academic_workload: string | null;
  academic_office_hours: string | null;
  education_requirements: string | null;
  required_skills: string | null;
  software_requirements: string | null;
  responsibility_tags: string | null;
  qualification_tags: string | null;
  closing_date: string | null;
  parsed_at: string | null;
};

const SAMPLE_QUERY = `
  SELECT j.id, j.source, j.url, raw.application_url, raw.raw_text,
    raw.pending_closing_date, raw.pending_closing_date_status,
    d.job_title, d.department, d.hours, d.salary_range, d.location,
    d.union_name, d.availability, d.duration, d.academic_course,
    d.academic_schedule, d.academic_term, d.academic_workload,
    d.academic_office_hours, d.education_requirements, d.required_skills,
    d.software_requirements, d.responsibility_tags, d.qualification_tags,
    d.closing_date,
    raw.parsed_at
  FROM jobs j
  JOIN job_details d ON d.id = j.id
  LEFT JOIN raw_jobs raw ON raw.id = j.id
  WHERE j.source = ANY($1::text[])
  ORDER BY md5(j.id)
`;

function asString(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function evaluate(row: Row): QualityEvaluation {
  return evaluateJobQuality({
    source: row.source,
    title: row.job_title,
    rawText: row.raw_text,
    url: row.url,
    applicationUrl: row.application_url,
    closingDate: row.closing_date || row.pending_closing_date,
    closingDateStatus: row.pending_closing_date_status,
    detailTitle: row.job_title,
    department: row.department,
    hours: row.hours,
    salary: row.salary_range,
    location: row.location,
    unionName: row.union_name,
    availability: row.availability,
    duration: row.duration,
    academicCourse: row.academic_course,
    academicSchedule: row.academic_schedule,
    academicTerm: row.academic_term,
    academicWorkload: row.academic_workload,
    academicOfficeHours: row.academic_office_hours,
    educationRequirements: row.education_requirements,
    requiredSkills: row.required_skills,
    softwareRequirements: row.software_requirements,
    responsibilityTags: row.responsibility_tags,
    qualificationTags: row.qualification_tags,
    hasDetails: true,
    parsedAt: row.parsed_at,
  });
}

function normalizeRows(rows: any[], store: Row['store']): Row[] {
  return rows.map(row => ({
    ...row,
    id: String(row.id),
    source: String(row.source ?? ''),
    store,
  })) as Row[];
}

async function main() {
  const db = await initDb() as any;
  const archive = db as { executeArchive?: (statement: unknown) => Promise<{ rows: any[] }> };

  const countQuery = `
    SELECT source, COUNT(*)::int AS count
    FROM jobs
    GROUP BY source
    ORDER BY count DESC, source
  `;
  const counts = (await db.execute(countQuery)).rows as Array<{ source: string; count: number }>;
  const selectedSources = requestedSources.length > 0
    ? requestedSources
    : counts.filter(row => row.count >= limit).slice(0, 10).map(row => row.source);

  if (selectedSources.length === 0) {
    console.log(JSON.stringify({ readOnly: true, sources: [], rows: 0, message: 'No source has enough rows for the requested sample.' }, null, 2));
    return;
  }

  const current = normalizeRows((await db.execute({ sql: SAMPLE_QUERY.replace('ANY($1::text[])', 'ANY(?)'), args: [selectedSources] })).rows, 'current');
  const archived = archive.executeArchive
    ? normalizeRows((await archive.executeArchive({ sql: SAMPLE_QUERY.replace('ANY($1::text[])', 'ANY(?)'), args: [selectedSources] })).rows, 'archive')
    : [];

  const selected = selectedSources.flatMap(source => [
    ...current.filter(row => row.source === source).slice(0, limit),
    ...archived.filter(row => row.source === source).slice(0, limit),
  ]);
  const failures = selected.map(row => ({ row, evaluation: evaluate(row) })).filter(item => item.evaluation.reasons.length > 0);
  const byReason = failures.reduce<Record<string, number>>((result, item) => {
    for (const reason of item.evaluation.reasons) result[reason] = (result[reason] ?? 0) + 1;
    return result;
  }, {});

  console.log(JSON.stringify({
    readOnly: true,
    paidAiCalls: 0,
    sources: selectedSources,
    rows: selected.length,
    rowsByStore: {
      current: selected.filter(row => row.store === 'current').length,
      archive: selected.filter(row => row.store === 'archive').length,
    },
    failures: failures.length,
    failuresByReason: byReason,
    examples: failures.slice(0, 50).map(({ row, evaluation }) => ({
      store: row.store,
      source: row.source,
      id: row.id,
      title: row.job_title,
      status: evaluation.status,
      reasons: evaluation.reasons,
    })),
  }, null, 2));
}

main().catch(error => {
  console.error('[Parser regression audit] Failed:', error);
  process.exitCode = 1;
});
