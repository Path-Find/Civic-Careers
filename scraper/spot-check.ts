/**
 * Select a deterministic, non-overlapping batch for the public data spot check.
 *
 *   npx tsx spot-check.ts --batch=1 --seed=20260823
 *   npx tsx spot-check.ts --batch=2 --seed=20260823
 *
 * Read-only with respect to job data: it reads the current Neon database and writes a local report
 * under reports/spot-check/ for review notes.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

const BATCH_SIZE = 50;
const MAX_BATCHES = 20;
const batch = Number(process.argv.find(argument => argument.startsWith('--batch='))?.slice('--batch='.length) ?? 1);
const seed = process.argv.find(argument => argument.startsWith('--seed='))?.slice('--seed='.length) ?? '20260823';

if (!Number.isInteger(batch) || batch < 1 || batch > MAX_BATCHES) {
  throw new Error(`--batch must be an integer from 1 to ${MAX_BATCHES}`);
}

type Row = Record<string, unknown>;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function text(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const db = await initDb();
  const result = await db.execute(`
    SELECT
      j.id, j.public_id, j.source, j.url, j.is_active, j.publication_status,
      j.verified_at, j.first_seen_at, j.scraped_at,
      r.url AS raw_url, r.application_url, r.title AS raw_title,
      r.raw_text, r.parsed_at, r.pending_closing_date,
      r.pending_closing_date_status,
      d.job_title, d.department, d.location, d.workplace_address,
      d.salary_range, d.description, d.closing_date, d.is_inventory,
      d.listing_type, d.is_student, d.salary_min, d.salary_max,
      d.salary_period, d.work_model, d.employment_type, d.duration,
      d.hours, d.availability, d.academic_role_type, d.academic_course,
      d.academic_workload, d.academic_office_hours, d.academic_supervisor,
      d.academic_appointment_type, d.academic_schedule, d.academic_term,
      d.is_unionized, d.union_name, d.benefits, d.required_skills,
      d.experience_requirements, d.education_requirements,
      d.license_requirements, d.vehicle_required, d.language_requirements,
      d.security_check_required, d.certification_requirements,
      d.software_requirements, d.medical_requirements,
      d.responsibility_tags, d.qualification_tags, d.posted_at,
      d.start_date, d.career_stage, d.parser_version
    FROM jobs j
    LEFT JOIN raw_jobs r ON r.id = j.id
    LEFT JOIN job_details d ON d.id = j.id
    WHERE j.is_active = 1
      AND j.publication_status IN ('soft_parsed', 'fully_parsed')
    ORDER BY j.id
  `);

  const ordered = [...result.rows].sort((left, right) =>
    stableHash(`${seed}:${text(left.id)}`) - stableHash(`${seed}:${text(right.id)}`)
      || text(left.id).localeCompare(text(right.id))
  );
  const start = (batch - 1) * BATCH_SIZE;
  const selected = ordered.slice(start, start + BATCH_SIZE);
  if (selected.length < BATCH_SIZE) {
    throw new Error(`Only ${selected.length} public jobs remain for batch ${batch}; need ${BATCH_SIZE}.`);
  }

  const report = {
    goal: 'public-job-spot-check',
    batch,
    batchSize: BATCH_SIZE,
    maxBatches: MAX_BATCHES,
    seed,
    readOnly: true,
    scope: 'current public jobs across all employers',
    selectedAt: new Date().toISOString(),
    reviewedJobs: selected.map(row => ({
      id: text(row.id),
      publicId: row.public_id == null ? null : Number(row.public_id),
      source: text(row.source),
      title: text(row.job_title || row.raw_title),
      url: text(row.url || row.application_url || row.raw_url),
      publicationStatus: text(row.publication_status),
      verifiedAt: row.verified_at ?? null,
      fields: Object.fromEntries(Object.entries(row).filter(([key]) => !['raw_text', 'description'].includes(key))),
      description: text(row.description),
      rawText: text(row.raw_text),
      findings: [],
    })),
    summary: {
      confirmedErrorJobs: null,
      fieldErrors: null,
      unresolvedJobs: null,
      status: 'not_reviewed',
    },
  };

  const directory = join(process.cwd(), '..', 'reports', 'spot-check');
  mkdirSync(directory, { recursive: true });
  const filename = `batch-${batch}-${seed}.json`;
  writeFileSync(join(directory, filename), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    readOnly: true,
    batch,
    seed,
    candidates: ordered.length,
    report: join('reports', 'spot-check', filename),
    jobs: selected.map(row => ({ id: text(row.id), source: text(row.source), title: text(row.job_title || row.raw_title) })),
  }, null, 2));
}

main().catch(error => {
  console.error('[Spot check] Failed:', error);
  process.exitCode = 1;
});
