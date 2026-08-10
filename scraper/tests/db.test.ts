import assert from 'node:assert/strict';
import test from 'node:test';
import { deactivateExpiredJobs, promotePendingJobs, saveJob, saveJobDetails, saveRawJob } from '../db';

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

test('saveJobDetails refreshes every parsed field on conflict', async () => {
  const statements: string[] = [];
  const client = {
    execute: async (query: { sql: string }) => {
      statements.push(query.sql);
      return { rows: [] };
    },
  };

  await saveJobDetails(client as never, {
    id: 'job-1',
    job_title: 'Updated title',
    department: 'Updated department',
    location: 'Updated location',
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

  const upsert = statements.find((s) => /INSERT INTO job_details/i.test(s)) ?? '';
  for (const field of [
    'job_title', 'department', 'location', 'salary_range', 'description',
    'closing_date', 'is_inventory', 'listing_type', 'is_student', 'salary_min', 'salary_max',
    'salary_period', 'work_model', 'employment_type', 'duration',
    'experience_requirements',
    'is_unionized', 'union_name', 'benefits', 'required_skills',
    'education_requirements', 'license_requirements', 'vehicle_required',
    'language_requirements', 'security_check_required', 'certification_requirements',
    'software_requirements',
  ]) {
    assert.match(upsert, new RegExp(`${field} = excluded\\.${field}`));
  }
  // Full details rewrite clears human verification.
  assert.ok(statements.some((s) => /verified_at\s*=\s*NULL/i.test(s)));
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

  assert.equal(statements.length, 2);
  assert.match(statements[0].sql, /parsed_at/i);
  assert.match(statements[0].sql, /NULL/i);
  assert.match(statements[1].sql, /INSERT INTO jobs/i);
  assert.match(statements[1].sql, /ON CONFLICT\(id\) DO NOTHING/i);
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
