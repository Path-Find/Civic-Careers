import assert from 'node:assert/strict';
import test from 'node:test';
import type { ParsedJob } from '../ai_parser';
import { buildParsedCandidate, type ParserRawJob } from '../parser-pipeline';

const raw: ParserRawJob = {
  id: 'pipeline-test-1',
  url: 'https://example.test/jobs/1',
  application_url: 'https://example.test/jobs/1',
  source: 'Government of Canada',
  raw_text: 'Client Support Centre Agent\nDepartment: Service Canada\nLocation: Ottawa, ON\nClosing date: December 31, 2099\nResponsibilities: Supports clients and resolves requests.\nQualifications: Experience supporting clients.',
  title: 'PM-01 Client Support Centre Agent (#25689)',
  first_seen_at: '2026-08-24T00:00:00.000Z',
  posted_at: '2026-08-20',
};

const aiResult: ParsedJob = {
  job_title: 'PM-01 Client Support Centre Agent (#25689)',
  department: 'Service Canada',
  location: 'Ottawa, ON',
  workplace_address: '',
  salary_min: 60000,
  salary_max: 70000,
  salary_period: 'yearly',
  closing_date: '2099-12-31',
  work_model: 'On-site',
  employment_type: 'Full-time',
  duration: '',
  hours: 'Full-time',
  availability: 'Until filled',
  academic_role_type: null,
  academic_course: '',
  academic_workload: '',
  academic_office_hours: '',
  academic_supervisor: '',
  academic_appointment_type: '',
  is_unionized: false,
  union_name: '',
  is_student: false,
  is_inventory: false,
  benefits: [],
  required_skills: ['Client service'],
  experience_requirements: ['Experience supporting clients'],
  education_requirements: [],
  license_requirements: [],
  vehicle_required: null,
  language_requirements: [],
  security_check_required: null,
  certification_requirements: [],
  software_requirements: [],
  medical_requirements: [],
  responsibility_tags: [],
  qualification_tags: [],
  clean_description: 'Supports clients and resolves requests.',
};

test('builds a candidate without writing to the database and records applied rules', () => {
  const candidate = buildParsedCandidate(raw, aiResult);

  assert.equal(candidate.job_title, 'Client Support Centre Agent');
  assert.equal(candidate.quality.status, 'soft_parsed');
  assert.ok(candidate.appliedRuleIds.includes('source.title.normalize-source-metadata'));
  assert.equal(candidate.parser_rule_ids, JSON.stringify(candidate.appliedRuleIds));
});

test('keeps source-title fallback behavior for unusable captured titles', () => {
  const candidate = buildParsedCandidate({ ...raw, title: 'View Job Details' }, aiResult);
  assert.equal(candidate.job_title, 'Client Support Centre Agent');
});

test('uses the shared quality gate before a candidate can be published', () => {
  const candidate = buildParsedCandidate({
    ...raw,
    id: 'pipeline-test-duplicate',
    source: 'Unlisted Employer',
    title: 'General Application Pool',
  }, {
    ...aiResult,
    job_title: 'General Application Pool',
  });

  assert.equal(candidate.quality.status, 'hidden');
  assert.match(candidate.quality.reasons.join('; '), /title/);
});
