/**
 * Export every captured University of Ottawa row for source-specific review.
 * Read-only: this never scrapes or writes to the database.
 *
 *   npx tsx report-university-of-ottawa.ts --out ../reports/uottawa-audit.json
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { initDb } from './db';

dotenv.config({ quiet: true });

type Row = Record<string, unknown> & { store: 'current' | 'archive' };

const QUERY = `
  SELECT j.id, j.public_id, j.is_active, j.publication_status, j.verified_at,
    raw.source, raw.url, raw.application_url, raw.title AS raw_title, raw.raw_text,
    raw.parsed_at, raw.pending_closing_date, raw.pending_closing_date_status,
    d.job_title, d.department, d.location, d.workplace_address, d.salary_range,
    d.salary_min, d.salary_max, d.salary_period, d.description, d.closing_date,
    d.is_inventory, d.listing_type, d.is_student, d.work_model, d.employment_type,
    d.duration, d.hours, d.availability, d.academic_role_type, d.academic_course,
    d.academic_workload, d.academic_office_hours, d.academic_supervisor,
    d.academic_appointment_type, d.academic_schedule, d.academic_term,
    d.is_unionized, d.union_name, d.benefits, d.required_skills,
    d.experience_requirements, d.education_requirements, d.license_requirements,
    d.vehicle_required, d.language_requirements, d.security_check_required,
    d.certification_requirements, d.software_requirements, d.medical_requirements,
    d.responsibility_tags, d.qualification_tags, d.posted_at, d.career_stage
  FROM jobs j
  LEFT JOIN raw_jobs raw ON raw.id = j.id
  LEFT JOIN job_details d ON d.id = j.id
  WHERE j.source = 'University of Ottawa'
  ORDER BY j.is_active DESC, j.id
`;

const FIELDS = [
  'department', 'location', 'workplace_address', 'salary_range', 'description',
  'duration', 'hours', 'availability', 'academic_course', 'academic_workload',
  'academic_office_hours', 'academic_supervisor', 'academic_appointment_type',
  'academic_schedule', 'academic_term', 'benefits', 'required_skills',
  'experience_requirements', 'education_requirements', 'license_requirements',
  'language_requirements', 'certification_requirements', 'software_requirements',
  'medical_requirements', 'responsibility_tags', 'qualification_tags',
] as const;

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function jsonList(value: unknown): string[] {
  const raw = text(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
  } catch { /* scalar fields are not lists */ }
  return [];
}

function flags(row: Row): string[] {
  const result: string[] = [];
  const title = text(row.job_title || row.raw_title);
  const rawTitle = text(row.raw_title);
  const titleMetadata = /\b(?:fall|winter|spring|summer|automne|hiver|printemps|\bF\/?W\s*\d{2}(?:\/\d{2})?|\d{4}[- ]?\d{2,4}|\d+\s+(?:role|roles|position|positions)|\b(?:pool|pipeline|posting|job posting|APTPUO|JR\d{4,})\b)/i;
  if (titleMetadata.test(title)) result.push('title_contains_metadata');
  if (rawTitle && title && rawTitle !== title) result.push('raw_title_differs_from_parsed_title');
  for (const field of FIELDS) {
    const value = text(row[field]);
    if (value.length > 500) result.push(`${field}_over_500_chars`);
    if (value.length > 1000) result.push(`${field}_over_1000_chars`);
  }
  const duplicateFields: string[] = [];
  for (let i = 0; i < FIELDS.length; i += 1) {
    const left = text(row[FIELDS[i]]);
    if (!left || left.length < 20) continue;
    for (let j = i + 1; j < FIELDS.length; j += 1) {
      if (left === text(row[FIELDS[j]])) duplicateFields.push(`${FIELDS[i]}=${FIELDS[j]}`);
    }
  }
  if (duplicateFields.length) result.push(`exact_duplicate_fields:${duplicateFields.join(',')}`);
  if (/^(?:yes|true|1)$/i.test(text(row.is_student)) && !/\b(?:student|undergraduate|graduate|TA|teaching assistant)\b/i.test(text(row.raw_text))) {
    result.push('student_flag_without_obvious_source_signal');
  }
  const salary = text(row.salary_range);
  if (salary && !/\b(?:hour|daily|day|week|weekly|biweekly|month|monthly|year|yearly|flat)\b/i.test(salary)) result.push('salary_missing_period');
  if (salary && /\b(?:grade|step)\s*\d+/i.test(salary)) result.push('salary_contains_grade_or_step');
  if (/^\s*(?:term|term|schedule|workload|availability|licen[cs]es?)\s*$/i.test(title)) result.push('placeholder_title');
  if (/^(?:teaching_assistant|course_instructor|academic_expert)$/i.test(text(row.academic_role_type))
    && !text(row.academic_course) && !text(row.academic_term)) result.push('academic_role_without_course_or_term');
  return result;
}

function csvCell(value: unknown): string {
  const raw = Array.isArray(value) ? JSON.stringify(value) : value == null ? '' : String(value);
  return `"${raw.replaceAll('"', '""').replaceAll('\n', '\\n').replaceAll('\r', '\\r')}"`;
}

async function main() {
  const outArg = process.argv.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
    ?? (process.argv[process.argv.indexOf('--out') + 1] || 'uottawa-audit.json');
  const db = await initDb() as unknown as {
    execute: (statement: string) => Promise<{ rows: Record<string, unknown>[] }>;
    executeArchive?: (statement: string) => Promise<{ rows: Record<string, unknown>[] }>;
  };
  const current = (await db.execute(QUERY)).rows.map(row => ({ ...row, store: 'current' as const }));
  const archive = db.executeArchive ? (await db.executeArchive(QUERY)).rows.map(row => ({ ...row, store: 'archive' as const })) : [];
  const rows = [...current, ...archive].map(row => ({ ...row, quality_flags: flags(row as Row) }));
  const summary = {
    generated_at: new Date().toISOString(),
    source: 'University of Ottawa',
    read_only: true,
    current_rows: current.length,
    archive_rows: archive.length,
    flagged_rows: rows.filter(row => row.quality_flags.length > 0).length,
    flag_counts: Object.fromEntries([...new Set(rows.flatMap(row => row.quality_flags))].sort().map(flag => [flag, rows.filter(row => row.quality_flags.includes(flag)).length])),
  };
  const report = { summary, rows };
  const output = path.resolve(process.cwd(), outArg);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
  const csvOutput = output.replace(/\.json$/i, '.csv');
  const columns = ['store', 'id', 'public_id', 'is_active', 'publication_status', 'raw_title', 'job_title', 'url', 'application_url', ...FIELDS, 'quality_flags'];
  const csv = [columns.join(','), ...rows.map(row => columns.map(column => csvCell(column === 'quality_flags' ? row.quality_flags : row[column])).join(','))].join('\n') + '\n';
  await fs.writeFile(csvOutput, csv);
  console.log(JSON.stringify({ ...summary, json: output, csv: csvOutput }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
