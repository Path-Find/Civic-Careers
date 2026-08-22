/**
 * Read-only corpus audit for the shared quality pipeline.
 *
 *   npx tsx audit-quality.ts
 *
 * It intentionally never writes, re-scrapes, or restores rows.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { evaluateJobQuality } from './quality-pipeline';

dotenv.config({ quiet: true });

type Row = {
  id: string;
  source: string;
  is_active: number | null;
  publication_status: string | null;
  raw_url: string | null;
  application_url: string | null;
  raw_title: string | null;
  raw_text: string | null;
  parsed_at: string | null;
  detail_id: string | null;
  detail_title: string | null;
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
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  closing_date: string | null;
};

const QUERY = `
  SELECT j.id, j.source, j.is_active, j.publication_status,
    raw.url AS raw_url, raw.application_url, raw.title AS raw_title, raw.raw_text,
    raw.parsed_at, d.id AS detail_id, d.job_title AS detail_title, d.department,
    d.hours, d.salary_range, d.location, d.union_name,
    d.availability, d.duration, d.academic_course, d.academic_schedule, d.academic_term,
    d.academic_workload, d.academic_office_hours,
    d.education_requirements,
    raw.pending_closing_date, raw.pending_closing_date_status, d.closing_date
  FROM jobs j
  LEFT JOIN raw_jobs raw ON raw.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
`;

async function auditStore(
  label: string,
  execute: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }>,
) {
  const result = await execute(QUERY);
  const rows = result.rows as unknown as Row[];
  const counts = new Map<string, number>();
  const examples: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const evaluation = evaluateJobQuality({
      source: row.source,
      title: row.raw_title,
      detailTitle: row.detail_title,
      rawText: row.raw_text,
      url: row.raw_url,
      applicationUrl: row.application_url,
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
      closingDate: row.closing_date || row.pending_closing_date,
      closingDateStatus: row.pending_closing_date_status,
      hasDetails: Boolean(row.detail_id),
      parsedAt: row.parsed_at,
    });
    const key = evaluation.reasons[0] ?? `approved:${evaluation.status}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (evaluation.reasons.length > 0 && examples.length < 50) {
      examples.push({
        id: row.id,
        source: row.source,
        active: row.is_active,
        storedStatus: row.publication_status,
        title: row.detail_title || row.raw_title,
        normalizedTitle: evaluation.title,
        reasons: evaluation.reasons,
      });
    }
  }
  console.log(`[Quality audit:${label}] Checked ${rows.length} row(s).`);
  console.log(JSON.stringify(Object.fromEntries(counts), null, 2));
  if (examples.length > 0) console.log(JSON.stringify({ examples }, null, 2));
}

async function main() {
  const db = await initDb();
  await auditStore('current', statement => db.execute(statement));
  const archiveExecute = (db as unknown as { executeArchive?: (statement: string) => Promise<{ rows: Array<Record<string, unknown>> }> }).executeArchive;
  if (archiveExecute) await auditStore('archive', statement => archiveExecute.call(db, statement));
  console.log('[Quality audit] Read-only audit complete. No rows were changed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
