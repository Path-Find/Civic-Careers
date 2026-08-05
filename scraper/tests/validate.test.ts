import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmploymentType,
  normalizeRequirementFlag,
  normalizeSalaryPeriod,
  normalizeUnionFields,
  normalizeUnionName,
  normalizeWorkModel,
  validateParsedJob,
} from '../validate';

const BASE = {
  job_title: 'Planner I',
  department: 'Planning',
  location: 'Toronto, ON',
  salary_min: 80000,
  salary_max: 100000,
  salary_period: 'yearly',
  closing_date: '2026-08-01',
  work_model: 'Hybrid',
  employment_type: 'Full-time',
  duration: '',
  is_unionized: true,
  union_name: 'CUPE',
  is_student: false,
  is_inventory: false,
  benefits: ['pension', 'health', 'dental'],
  experience_requirements: ['3 years of experience'],
  education_requirements: ['Bachelor\'s degree'],
  license_requirements: [],
  vehicle_required: null,
  language_requirements: [],
  security_check_required: null,
  certification_requirements: [],
  software_requirements: ['Excel'],
  clean_description: 'Great role.',
};

describe('validateParsedJob', () => {
  it('passes a valid object through unchanged', () => {
    const result = validateParsedJob(BASE);
    assert.ok(result);
    assert.equal(result.job_title, 'Planner I');
    assert.equal(result.salary_min, 80000);
    assert.equal(result.salary_period, 'yearly');
    assert.equal(result.work_model, 'Hybrid');
    assert.equal(result.employment_type, 'Full-time');
    assert.equal(result.closing_date, '2026-08-01');
    assert.deepEqual(result.benefits, ['pension', 'health', 'dental']);
  });

  it('returns null for non-object input', () => {
    assert.equal(validateParsedJob(null), null);
    assert.equal(validateParsedJob(undefined), null);
    assert.equal(validateParsedJob('string'), null);
    assert.equal(validateParsedJob(42), null);
    assert.equal(validateParsedJob([]), null);
  });

  it('returns null when job_title is missing or empty', () => {
    assert.equal(validateParsedJob({ ...BASE, job_title: '' }), null);
    assert.equal(validateParsedJob({ ...BASE, job_title: null }), null);
    assert.equal(validateParsedJob({ ...BASE, job_title: undefined }), null);
  });

  it('uses a trusted source title when AI omits job_title', () => {
    assert.equal(validateParsedJob({ ...BASE, job_title: '' }, 'Policy Analyst')?.job_title, 'Policy Analyst');
  });

  describe('department casing', () => {
    it('title-cases ALL CAPS multi-word departments', () => {
      assert.equal(
        validateParsedJob({ ...BASE, department: 'LEGISLATIVE SERVICES' })?.department,
        'Legislative Services',
      );
      assert.equal(
        validateParsedJob({ ...BASE, department: 'COMMUNITY SERVICES' })?.department,
        'Community Services',
      );
      assert.equal(
        validateParsedJob({ ...BASE, department: 'OFFICE OF THE CAO' })?.department,
        'Office of the CAO',
      );
    });

    it('keeps short department codes uppercase', () => {
      assert.equal(validateParsedJob({ ...BASE, department: 'EECS' })?.department, 'EECS');
      assert.equal(validateParsedJob({ ...BASE, department: 'CMHC' })?.department, 'CMHC');
      assert.equal(validateParsedJob({ ...BASE, department: 'HR_7701_2C' })?.department, 'HR_7701_2C');
    });

    it('title-cases longer single-word ALL CAPS labels', () => {
      assert.equal(validateParsedJob({ ...BASE, department: 'TRANSIT' })?.department, 'Transit');
    });

    it('leaves already mixed-case departments alone', () => {
      assert.equal(validateParsedJob({ ...BASE, department: 'Legislative Services' })?.department, 'Legislative Services');
    });
  });

  describe('salary normalization', () => {
    it('coerces salary from currency strings', () => {
      const result = validateParsedJob({ ...BASE, salary_min: '$80,000', salary_max: '$100,000.00' });
      assert.equal(result?.salary_min, 80000);
      assert.equal(result?.salary_max, 100000);
    });

    it('coerces salary from number strings', () => {
      const result = validateParsedJob({ ...BASE, salary_min: '96566', salary_max: '132880' });
      assert.equal(result?.salary_min, 96566);
      assert.equal(result?.salary_max, 132880);
    });

    it('returns null salary for null-like values', () => {
      const result = validateParsedJob({ ...BASE, salary_min: null, salary_max: 'N/A' });
      assert.equal(result?.salary_min, null);
      assert.equal(result?.salary_max, null);
    });

    it('normalizes salary_period: "annual" → "yearly"', () => {
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'annual' })?.salary_period, 'yearly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'Yearly' })?.salary_period, 'yearly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'per year' })?.salary_period, 'yearly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'per annum' })?.salary_period, 'yearly');
    });

    it('normalizes salary_period: hourly variants', () => {
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'hourly' })?.salary_period, 'hourly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'Hourly' })?.salary_period, 'hourly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'hr' })?.salary_period, 'hourly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'hrs' })?.salary_period, 'hourly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'per hour' })?.salary_period, 'hourly');
    });

    it('normalizes salary_period: monthly variants', () => {
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'monthly' })?.salary_period, 'monthly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'Monthly' })?.salary_period, 'monthly');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'per month' })?.salary_period, 'monthly');
    });

    it('normalizes salary_period: flat variants', () => {
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'flat' })?.salary_period, 'flat');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'lump sum' })?.salary_period, 'flat');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'per course' })?.salary_period, 'flat');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'stipend' })?.salary_period, 'flat');
      assert.equal(validateParsedJob({ ...BASE, salary_period: 'honorarium' })?.salary_period, 'flat');
    });

    it('maps salary_period synonyms via normalizeSalaryPeriod', () => {
      assert.equal(normalizeSalaryPeriod('yearly'), 'yearly');
      assert.equal(normalizeSalaryPeriod('hourly'), 'hourly');
      assert.equal(normalizeSalaryPeriod('monthly'), 'monthly');
      assert.equal(normalizeSalaryPeriod('flat'), 'flat');
      assert.equal(normalizeSalaryPeriod('Annual salary'), 'yearly');
      assert.equal(normalizeSalaryPeriod('per half course'), 'flat');
      assert.equal(normalizeSalaryPeriod(null), 'yearly');
      assert.equal(normalizeSalaryPeriod(''), 'yearly');
      assert.equal(normalizeSalaryPeriod('unknown'), 'yearly');
    });
  });

  describe('work_model normalization', () => {
    it('accepts exact values', () => {
      assert.equal(validateParsedJob({ ...BASE, work_model: 'Hybrid' })?.work_model, 'Hybrid');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'Remote' })?.work_model, 'Remote');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'On-site' })?.work_model, 'On-site');
    });

    it('normalizes casing and punctuation variants', () => {
      assert.equal(validateParsedJob({ ...BASE, work_model: 'hybrid' })?.work_model, 'Hybrid');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'REMOTE' })?.work_model, 'Remote');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'Onsite' })?.work_model, 'On-site');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'On Site' })?.work_model, 'On-site');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'In-person' })?.work_model, 'On-site');
      assert.equal(validateParsedJob({ ...BASE, work_model: 'In Office' })?.work_model, 'On-site');
    });

    it('maps remote and hybrid synonyms via normalizeWorkModel', () => {
      assert.equal(normalizeWorkModel('Work from home'), 'Remote');
      assert.equal(normalizeWorkModel('WFH'), 'Remote');
      assert.equal(normalizeWorkModel('Virtual'), 'Remote');
      assert.equal(normalizeWorkModel('Online'), 'Remote');
      assert.equal(normalizeWorkModel('Telework'), 'Remote');
      assert.equal(normalizeWorkModel('Blended'), 'Hybrid');
      assert.equal(normalizeWorkModel('Partially remote'), 'Hybrid');
      assert.equal(normalizeWorkModel('Flexible work'), 'Hybrid');
      assert.equal(normalizeWorkModel('In-person'), 'On-site');
      assert.equal(normalizeWorkModel('Office-based'), 'On-site');
      // Clean tokens pass through
      assert.equal(normalizeWorkModel('Hybrid'), 'Hybrid');
      assert.equal(normalizeWorkModel('Remote'), 'Remote');
      assert.equal(normalizeWorkModel('On-site'), 'On-site');
    });

    it('defaults unknown values to On-site', () => {
      assert.equal(validateParsedJob({ ...BASE, work_model: 'unknown' })?.work_model, 'On-site');
      assert.equal(validateParsedJob({ ...BASE, work_model: null })?.work_model, 'On-site');
    });

    it('falls back to the job title when the AI misses a delivery-format signal', () => {
      assert.equal(
        validateParsedJob({ ...BASE, job_title: 'Teaching Assistant - Machine Learning (Online)', work_model: 'On-site' })?.work_model,
        'Remote'
      );
      assert.equal(
        validateParsedJob({ ...BASE, job_title: 'Course XYZ (Virtual)', work_model: null })?.work_model,
        'Remote'
      );
      assert.equal(
        validateParsedJob({ ...BASE, job_title: 'Hybrid Coordinator', work_model: null })?.work_model,
        'Hybrid'
      );
      assert.equal(
        validateParsedJob({ ...BASE, job_title: 'Planner I', work_model: 'On-site' })?.work_model,
        'On-site'
      );
    });
  });

  describe('employment_type normalization', () => {
    it('accepts exact values', () => {
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Full-time' })?.employment_type, 'Full-time');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Part-time' })?.employment_type, 'Part-time');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Contract' })?.employment_type, 'Contract');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Permanent' })?.employment_type, 'Permanent');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Occasional' })?.employment_type, 'Occasional');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Seasonal' })?.employment_type, 'Seasonal');
    });

    it('normalizes common AI variants', () => {
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Full Time' })?.employment_type, 'Full-time');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'fulltime' })?.employment_type, 'Full-time');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Part Time' })?.employment_type, 'Part-time');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Temporary' })?.employment_type, 'Contract');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'temp' })?.employment_type, 'Contract');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Casual' })?.employment_type, 'Contract');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Occasional Teacher / Eligible to Hire' })?.employment_type, 'Occasional');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Seasonal' })?.employment_type, 'Seasonal');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Continuing' })?.employment_type, 'Permanent');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Indeterminate' })?.employment_type, 'Permanent');
      assert.equal(validateParsedJob({ ...BASE, employment_type: 'Term' })?.employment_type, 'Contract');
    });

    it('maps synonyms via normalizeEmploymentType', () => {
      assert.equal(normalizeEmploymentType('Full-time'), 'Full-time');
      assert.equal(normalizeEmploymentType('Part-time'), 'Part-time');
      assert.equal(normalizeEmploymentType('Seasonal'), 'Seasonal');
      assert.equal(normalizeEmploymentType('seasonal worker'), 'Seasonal');
      assert.equal(normalizeEmploymentType('Casual'), 'Contract');
      assert.equal(normalizeEmploymentType('Temporary'), 'Contract');
      assert.equal(normalizeEmploymentType('Fixed-term'), 'Contract');
      assert.equal(normalizeEmploymentType('Supply teacher'), 'Occasional');
      assert.equal(normalizeEmploymentType('On-call'), 'Occasional');
      assert.equal(normalizeEmploymentType(null), 'Full-time');
      assert.equal(normalizeEmploymentType(''), 'Full-time');
    });
  });

  describe('closing_date normalization', () => {
    it('passes through valid ISO dates', () => {
      assert.equal(validateParsedJob({ ...BASE, closing_date: '2026-08-15' })?.closing_date, '2026-08-15');
    });

    it('returns null for null-like values', () => {
      assert.equal(validateParsedJob({ ...BASE, closing_date: null })?.closing_date, null);
      assert.equal(validateParsedJob({ ...BASE, closing_date: 'null' })?.closing_date, null);
      assert.equal(validateParsedJob({ ...BASE, closing_date: 'N/A' })?.closing_date, null);
      assert.equal(validateParsedJob({ ...BASE, closing_date: '' })?.closing_date, null);
    });

    it('parses human-readable dates', () => {
      const result = validateParsedJob({ ...BASE, closing_date: 'August 15, 2026' });
      assert.equal(result?.closing_date, '2026-08-15');
    });
  });

  describe('boolean coercion', () => {
    it('coerces string booleans', () => {
      assert.equal(validateParsedJob({ ...BASE, is_unionized: 'true' })?.is_unionized, true);
      assert.equal(validateParsedJob({ ...BASE, is_unionized: 'false', union_name: '' })?.is_unionized, false);
      assert.equal(validateParsedJob({ ...BASE, is_student: 'true' })?.is_student, true);
    });

    it('never treats Non-Union as a union membership', () => {
      const result = validateParsedJob({ ...BASE, is_unionized: true, union_name: 'Non-Union?' });
      assert.equal(result?.is_unionized, false);
      assert.equal(result?.union_name, '');
    });

    it('normalizes union names lightly and clears non-union labels', () => {
      assert.equal(normalizeUnionName('C.U.P.E.'), 'CUPE');
      assert.equal(normalizeUnionName('C.U.P.E. Local 543'), 'CUPE Local 543');
      assert.equal(normalizeUnionName('Non-Union'), '');
      assert.equal(normalizeUnionName('Non-Affiliated'), '');
      assert.equal(normalizeUnionName('Collective Agreement'), '');
      assert.equal(normalizeUnionName('Non-Academic Staff Association (NASA)'), 'Non-Academic Staff Association (NASA)');
      assert.deepEqual(normalizeUnionFields('Non-Bargaining', true), { is_unionized: false, union_name: '' });
      assert.deepEqual(normalizeUnionFields('CUPE 2626', false), { is_unionized: true, union_name: 'CUPE 2626' });
      assert.deepEqual(normalizeUnionFields('Union', true), { is_unionized: true, union_name: '' });
    });

    it('coerces numeric booleans', () => {
      assert.equal(validateParsedJob({ ...BASE, is_inventory: 1 })?.is_inventory, true);
      assert.equal(validateParsedJob({ ...BASE, is_inventory: 0 })?.is_inventory, false);
    });
  });

  describe('benefits normalization', () => {
    it('passes through arrays', () => {
      const result = validateParsedJob({ ...BASE, benefits: ['pension', 'dental'] });
      assert.deepEqual(result?.benefits, ['pension', 'dental']);
    });

    it('splits comma-separated strings', () => {
      const result = validateParsedJob({ ...BASE, benefits: 'pension, health, dental' });
      assert.deepEqual(result?.benefits, ['pension', 'health', 'dental']);
    });

    it('returns empty array for null/missing', () => {
      assert.deepEqual(validateParsedJob({ ...BASE, benefits: null })?.benefits, []);
      assert.deepEqual(validateParsedJob({ ...BASE, benefits: undefined })?.benefits, []);
    });
  });

  describe('required_skills normalization', () => {
    it('passes through arrays', () => {
      const result = validateParsedJob({ ...BASE, required_skills: ['Excel', 'AutoCAD'] });
      assert.deepEqual(result?.required_skills, ['Excel', 'AutoCAD']);
    });

    it('splits comma-separated strings', () => {
      const result = validateParsedJob({ ...BASE, required_skills: 'Excel, SQL, AutoCAD' });
      assert.deepEqual(result?.required_skills, ['Excel', 'SQL', 'AutoCAD']);
    });

    it('returns empty array for null/missing', () => {
      assert.deepEqual(validateParsedJob({ ...BASE, required_skills: null })?.required_skills, []);
      assert.deepEqual(validateParsedJob({ ...BASE, required_skills: undefined })?.required_skills, []);
    });
  });

  describe('structured requirements normalization', () => {
    it('normalizes requirement lists', () => {
      const result = validateParsedJob({ ...BASE, license_requirements: 'P.Eng., Class G', software_requirements: ['Excel', 'Adobe Acrobat'] });
      assert.deepEqual(result?.license_requirements, ['P.Eng.']);
      assert.deepEqual(result?.software_requirements, ['Excel', 'Adobe Acrobat']);
      assert.deepEqual(validateParsedJob({ ...BASE, experience_requirements: ['Experience: analyzing complex information', 'Experience is defined as approximately two (2) years or more'] })?.experience_requirements, ['2+ years', 'Analyzing complex information']);
    });

    it('canonicalizes Microsoft Office aliases', () => {
      const result = validateParsedJob({ ...BASE, software_requirements: ['Microsoft Office Suite', 'MS Office', 'Office 365', 'Microsoft 365', 'Microsoft Word', 'MS PowerPoint', 'Excel'] });
      assert.deepEqual(result?.software_requirements, ['Microsoft Office', 'Microsoft 365', 'Word', 'PowerPoint', 'Excel']);
    });

    it('canonicalizes Adobe aliases', () => {
      const result = validateParsedJob({ ...BASE, software_requirements: ['Adobe Acrobat Pro', 'Adobe Pro', 'Adobe Creative Cloud', 'Adobe Photoshop', 'Illustrator', 'Adobe Captivate'] });
      assert.deepEqual(result?.software_requirements, ['Adobe Acrobat', 'Adobe Creative Cloud', 'Photoshop', 'Illustrator', 'Adobe Captivate']);
    });

    it('keeps vehicle and security checks unknown when not mentioned', () => {
      const result = validateParsedJob({ ...BASE, vehicle_required: undefined, security_check_required: 'unknown' });
      assert.equal(result?.vehicle_required, null);
      assert.equal(result?.security_check_required, null);
    });

    it('normalizes explicit requirement booleans', () => {
      const result = validateParsedJob({ ...BASE, vehicle_required: 'true', security_check_required: 0 });
      assert.equal(result?.vehicle_required, true);
      assert.equal(result?.security_check_required, false);
    });

    it('maps requirement flag synonyms via normalizeRequirementFlag', () => {
      assert.equal(normalizeRequirementFlag(true), true);
      assert.equal(normalizeRequirementFlag(false), false);
      assert.equal(normalizeRequirementFlag(1), true);
      assert.equal(normalizeRequirementFlag(0), false);
      assert.equal(normalizeRequirementFlag('yes'), true);
      assert.equal(normalizeRequirementFlag('no'), false);
      assert.equal(normalizeRequirementFlag('required'), true);
      assert.equal(normalizeRequirementFlag('not required'), false);
      assert.equal(normalizeRequirementFlag(null), null);
      assert.equal(normalizeRequirementFlag('unknown'), null);
      assert.equal(normalizeRequirementFlag('maybe'), null);
    });
  });

  describe('clean_description safety net', () => {
    it('drops sections whose body is a placeholder', () => {
      const result = validateParsedJob({
        ...BASE,
        clean_description: '## Qualifications\nMust have a degree.\n\n## Nice to Have\nNone\n\n## Compensation & Benefits\nPension included.',
      });
      assert.ok(!result?.clean_description.includes('Nice to Have'));
      assert.ok(result?.clean_description.includes('Qualifications'));
      assert.ok(result?.clean_description.includes('Compensation & Benefits'));
    });

    it('drops sections with an empty body', () => {
      const result = validateParsedJob({
        ...BASE,
        clean_description: '## Qualifications\nMust have a degree.\n\n## Nice to Have\n\n## Compensation & Benefits\nPension included.',
      });
      assert.ok(!result?.clean_description.includes('Nice to Have'));
    });

    it('drops bullet placeholder sections', () => {
      const result = validateParsedJob({
        ...BASE,
        clean_description: '## Qualifications\nMust have a degree.\n\n## Nice to Have\n- None\n\n## Compensation & Benefits\nPension included.',
      });
      assert.ok(!result?.clean_description.includes('Nice to Have'));
    });

    it('converts numbered lists to bullets', () => {
      const result = validateParsedJob({
        ...BASE,
        clean_description: '## Qualifications\n1. Degree required.\n2. Experience required.',
      });
      assert.ok(result?.clean_description.includes('- Degree required.'));
      assert.ok(result?.clean_description.includes('- Experience required.'));
      assert.ok(!result?.clean_description.includes('1. Degree'));
    });
  });
});
