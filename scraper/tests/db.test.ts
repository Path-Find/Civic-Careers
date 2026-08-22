import assert from 'node:assert/strict';
import test from 'node:test';
import { deactivateExpiredJobs, promotePendingJobs, saveJob, saveJobDetails, savePendingJob, saveRawJob } from '../db';

test('deactivateExpiredJobs updates active jobs before the supplied date', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    execute: async (query: { sql: string; args?: unknown[] }) => {
      statements.push(query);
      return { rowsAffected: 3, rows: [] };
    },
  };

  const updated = await deactivateExpiredJobs(client as never, '2026-08-05');

  assert.equal(updated, 3);
  assert.match(statements[0].sql, /SET is_active = 0/i);
  assert.match(statements[0].sql, /closing_date/i);
  assert.deepEqual(statements[0].args, ['2026-08-05']);
});

test('saveJobDetails refreshes parsed fields but preserves academic context on blank reparse', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    execute: async (query: { sql: string; args?: unknown[] }) => {
      statements.push(query);
      return { rows: [] };
    },
  };

  await saveJobDetails(client as never, {
    id: 'job-1',
    job_title: 'Updated title',
    department: 'Updated department',
    location: 'Updated location',
    workplace_address: '123 Example Street, Toronto, ON',
    salary_range: '$80K',
    description: 'Updated description',
    closing_date: '2026-08-15',
    is_inventory: 0,
    listing_type: 'regular',
    is_student: 0,
    salary_min: 80000,
    salary_max: null,
    salary_period: 'yearly',
    work_model: 'Remote',
    employment_type: 'Full-time',
    duration: '',
    hours: '35 hours per week',
    availability: '',
    academic_role_type: 'faculty',
    academic_course: '',
    academic_workload: '0.5 FTE',
    academic_office_hours: '',
    academic_supervisor: '',
    academic_appointment_type: 'Tenure-track',
    academic_schedule: 'Monday 18:00-21:00',
    experience_requirements: '["3 years of experience"]',
    is_unionized: 0,
    union_name: '',
    benefits: '[]',
    required_skills: '[]',
    education_requirements: '[]',
    license_requirements: '[]',
    vehicle_required: 1,
    language_requirements: '[]',
    security_check_required: null,
    certification_requirements: '[]',
    software_requirements: '["Excel"]',
  });

  const upsertStatement = statements.find((s) => /INSERT INTO job_details/i.test(s.sql));
  const upsert = upsertStatement?.sql ?? '';
  // Keep the INSERT values aligned with the column list. This catches silent
  // field shifts that still produce syntactically valid rows.
  assert.equal(upsertStatement?.args?.[18], 0); // is_unionized
  assert.equal(upsertStatement?.args?.[22], '35 hours per week'); // hours
  assert.equal(upsertStatement?.args?.[24], 'faculty'); // academic_role_type
  assert.equal(upsertStatement?.args?.[26], '0.5 FTE'); // academic_workload
  for (const field of [
    'job_title', 'department', 'location', 'workplace_address', 'salary_range', 'description',
    'closing_date', 'is_inventory', 'listing_type', 'is_student', 'salary_min', 'salary_max',
    'salary_period', 'work_model', 'employment_type', 'duration',
    'hours', 'availability', 'academic_role_type', 'academic_course', 'academic_workload',
    'academic_office_hours', 'academic_supervisor', 'academic_appointment_type',
    'academic_schedule',
    'experience_requirements',
    'is_unionized', 'union_name', 'benefits', 'required_skills',
    'education_requirements', 'license_requirements', 'vehicle_required',
    'language_requirements', 'security_check_required', 'certification_requirements',
    'software_requirements',
    'career_stage',
  ]) {
    if (['hours', 'availability', 'academic_role_type', 'academic_course', 'academic_workload', 'academic_office_hours', 'academic_supervisor', 'academic_appointment_type', 'academic_schedule'].includes(field)) {
      assert.match(upsert, new RegExp(`${field} = COALESCE\\(NULLIF\\(excluded\\.${field}, ''\\), job_details\\.${field}\\)`));
    } else {
      assert.match(upsert, new RegExp(`${field} = excluded\\.${field}`));
    }
  }
  // Full details rewrite clears human verification.
  assert.ok(statements.some((s) => /verified_at\s*=\s*NULL/i.test(s.sql)));
});

test('saveRawJob creates a shell listing without marking it parsed', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    batch: async (queries: Array<{ sql: string; args?: unknown[] }>) => {
      statements.push(...queries);
      return [];
    },
  };

  await saveRawJob(client as never, {
    id: 'job-raw-1',
    url: 'https://example.com/job-raw-1',
    application_url: 'https://example.com/apply/job-raw-1',
    source: 'Example Employer',
    raw_text: 'A rendered posting body',
    title: 'Pending role',
    posted_at: '2026-08-10',
  });

  assert.equal(statements.length, 3);
  assert.match(statements[0].sql, /parsed_at/i);
  assert.match(statements[0].sql, /pending_closing_date_status/i);
  assert.match(statements[0].sql, /pending_closing_date = COALESCE\(NULLIF\(TRIM\(excluded\.pending_closing_date\), ''\), raw_jobs\.pending_closing_date\)/i);
  assert.match(statements[0].sql, /excluded\.pending_closing_date_status = 'open_until_filled'/i);
  assert.match(statements[0].sql, /'blocked'/i);
  assert.match(statements[0].sql, /NULL/i);
  assert.equal(statements[0].args?.[11], 'open_until_filled');
  assert.equal(statements[0].args?.[8], null);
  assert.match(statements[1].sql, /INSERT INTO jobs/i);
  assert.match(statements[1].sql, /ON CONFLICT\(id\) DO UPDATE/i);
  assert.match(statements[2].sql, /publication_status/i);
  assert.equal(statements[2].args?.[0], 'soft_parsed');
});

test('saveRawJob recovers a source title when the scraper did not provide one', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    batch: async (queries: Array<{ sql: string; args?: unknown[] }>) => {
      statements.push(...queries);
      return [];
    },
  };

  await saveRawJob(client as never, {
    id: 'job-raw-title-fallback',
    url: 'https://example.com/job-title-fallback',
    source: 'Western University',
    raw_text: 'Job TitleAdministrative Assistant V\nNext JobApply for JobJob ID44107',
  });

  assert.equal(statements[0].args?.[5], 'Administrative Assistant V');
});

test('savePendingJob publishes a PDF link without queueing it for parsing', async () => {
  const statements: Array<{ sql: string; args?: unknown[] }> = [];
  const client = {
    batch: async (queries: Array<{ sql: string; args?: unknown[] }>) => {
      statements.push(...queries);
      return [];
    },
  };

  await savePendingJob(client as never, {
    id: 'job-pdf-1',
    url: 'https://example.com/posting.pdf',
    application_url: 'https://example.com/apply/job-pdf-1',
    source: 'Example Employer',
    title: 'PDF role',
    closing_date: '2026-08-20',
  });

  assert.equal(statements.length, 3);
  assert.match(statements[0].sql, /raw_text/i);
  assert.match(statements[0].sql, /CURRENT_TIMESTAMP/i);
  assert.deepEqual(statements[0].args?.slice(0, 5), [
    'job-pdf-1',
    'https://example.com/posting.pdf',
    'https://example.com/apply/job-pdf-1',
    'Example Employer',
    'PDF role',
  ]);
  assert.equal(statements[0].args?.[9], 'known');
  assert.match(statements[1].sql, /ON CONFLICT\(id\) DO UPDATE/i);
  assert.match(statements[2].sql, /publication_status/i);
  assert.equal(statements[2].args?.[0], 'job-pdf-1');
});

test('promotePendingJobs inserts only raw rows that are still unparsed and have no shell', async () => {
  const statements: string[] = [];
  const client = {
    execute: async (query: string | { sql: string }) => {
      statements.push(typeof query === 'string' ? query : query.sql);
      return { rowsAffected: 653, rows: [] };
    },
  };

  const promoted = await promotePendingJobs(client as never);

  assert.equal(promoted, 653);
  assert.match(statements[0], /r\.parsed_at IS NULL/i);
  assert.match(statements[0], /j\.id IS NULL/i);
  assert.match(statements[0], /COALESCE\(r\.application_url, r\.url\)/i);
});
