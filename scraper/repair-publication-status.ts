/**
 * Reconcile the public publication state from preserved raw data and current
 * parsed details.
 *
 *   npx tsx repair-publication-status.ts          # report only
 *   npx tsx repair-publication-status.ts --apply  # hide/promote rows safely
 *
 * This never deletes raw_jobs. A row that fails the quality gate is hidden so
 * the metadata backfill can rebuild it from the original source capture.
 */
import dotenv from 'dotenv';
import { initDb } from './db';
import { evaluateJobQuality } from './quality-pipeline';

dotenv.config({ quiet: true });

const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  source: string;
  is_active: number | null;
  publication_status: string | null;
  raw_title: string | null;
  raw_url: string | null;
  application_url: string | null;
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
  required_skills: string | null;
  software_requirements: string | null;
  responsibility_tags: string | null;
  qualification_tags: string | null;
  pending_closing_date: string | null;
  pending_closing_date_status: string | null;
  closing_date: string | null;
};

type Decision = {
  id: string;
  from: string;
  active: number | null;
  to: 'hidden' | 'soft_parsed' | 'fully_parsed';
  reason: string;
};

function classify(row: Row): Decision {
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
    requiredSkills: row.required_skills,
    softwareRequirements: row.software_requirements,
    responsibilityTags: row.responsibility_tags,
    qualificationTags: row.qualification_tags,
    closingDate: row.closing_date || row.pending_closing_date,
    closingDateStatus: row.pending_closing_date_status,
    hasDetails: Boolean(row.detail_id),
    parsedAt: row.parsed_at,
  });
  const reason = evaluation.reasons[0]
    || (evaluation.status === 'fully_parsed' ? 'parsed details and parsed_at present' : 'safe title/metadata available; details pending');
  return { id: row.id, from: row.publication_status ?? 'NULL', active: row.is_active, to: evaluation.status, reason };
}

async function main() {
  const db = await initDb();

  const query = `
    SELECT
      j.id,
      j.source,
      j.is_active,
      j.publication_status,
      raw.url AS raw_url,
      raw.application_url,
      raw.title AS raw_title,
      raw.raw_text,
      raw.parsed_at,
      d.id AS detail_id,
      d.job_title AS detail_title,
      d.department,
      d.hours,
      d.salary_range,
      d.location,
      d.union_name,
      d.availability,
      d.duration,
      d.academic_course,
      d.academic_schedule,
      d.academic_term,
      d.academic_workload,
      d.academic_office_hours,
      d.education_requirements, d.required_skills, d.software_requirements,
      d.responsibility_tags, d.qualification_tags,
      raw.pending_closing_date,
      raw.pending_closing_date_status,
      d.closing_date
    FROM jobs j
    LEFT JOIN raw_jobs raw ON raw.id = j.id
    LEFT JOIN job_details d ON d.id = j.id
  `;

  const repairStore = async (
    label: string,
    execute: (statement: string | { sql: string; args: string[] }) => Promise<{ rows: Array<Record<string, unknown>> }>,
    keepActive: boolean,
  ) => {
    const result = await execute(query);
    const decisions = (result.rows as unknown as Row[]).map(classify);
    const counts = new Map<string, number>();
    for (const decision of decisions) {
      const key = `${decision.to}: ${decision.reason}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const changed = decisions.filter(decision => decision.from !== decision.to
      || decision.active !== (keepActive ? (decision.to === 'hidden' ? 0 : 1) : 0));
    console.log(`[Publication status:${label}] Checked ${decisions.length} row(s). ${changed.length} status change(s) ${APPLY ? 'applying' : 'would apply'}.`);
    console.log(JSON.stringify(Object.fromEntries(counts), null, 2));

    if (!APPLY) return;

    // Keep the write bounded, but send one SQL update per chunk rather than
    // one transaction per row. This matters on Neon: thousands of individual
    // round-trips turn a safe repair into a multi-minute operation.
    for (let i = 0; i < changed.length; i += 500) {
      const chunk = changed.slice(i, i + 500);
      const args: string[] = [];
      const cases = chunk.map(decision => {
        args.push(decision.id, decision.to);
        return 'WHEN ? THEN ?';
      }).join(' ');
      const activeCases = chunk.map(decision => {
        args.push(decision.id);
        const active = keepActive ? (decision.to === 'hidden' ? 0 : 1) : 0;
        return `WHEN ? THEN ${active}`;
      }).join(' ');
      const activeSql = `, is_active = CASE id ${activeCases} ELSE is_active END`;
      await execute({
        sql: `UPDATE jobs
              SET publication_status = CASE id ${cases} END${activeSql}
              WHERE id IN (${chunk.map(() => '?').join(', ')})`,
        args: [...args, ...chunk.map(decision => decision.id)],
      });
    }
    console.log(`[Publication status:${label}] Updated ${changed.length} row(s).`);
  };

  await repairStore('current', statement => db.execute(statement), true);

  // Archived rows remain inactive, but they still need a real publication
  // status so a direct archived link does not expose a hidden/corrupt row and
  // a later restore starts from the same three-state model.
  const archiveExecute = (db as unknown as { executeArchive?: typeof db.execute }).executeArchive;
  if (archiveExecute) {
    await repairStore('archive', statement => archiveExecute.call(db, statement), false);
  }

  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to update jobs.publication_status and jobs.is_active.');
  } else {
    console.log('[Publication status] Raw jobs were not deleted.');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
