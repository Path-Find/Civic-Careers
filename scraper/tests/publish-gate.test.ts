import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublishBlockReason } from '../publish-gate';
import { evaluateJobQuality } from '../quality-pipeline';

test('rejects a department field that swallowed unrelated fields (University of Ottawa case)', () => {
  const reason = getPublishBlockReason({
    title: 'Senior Officer, Academic Administration',
    department: 'Academic Services, OperationsCampus:Main CampusUnion Affiliation:SSUODate Posted (YYYY/MM/DD):2026/08/20Applications must be received BEFORE (YYYY/MM/DD):2026/08/31Hours per week:35Salary Grade:SSUO Grade 08Salary Range:$68 149,00',
  });
  assert.equal(reason, 'corrupted field: department');
});

test('does not flag a legitimate colon in an academic department name', () => {
  // Found live in the archive DB: department was in the colon-reject set
  // originally, which flagged real "CAMPUS: Department" / "Program: Subtitle"
  // academic naming as corrupted. The one genuine corruption case that
  // happens to contain a colon (above) is still caught via length alone, so
  // dropping department from the colon check lost no real detection.
  assert.equal(getPublishBlockReason({ title: 'Sessional Lecturer', department: 'UTM: Anthropology' }), null);
  assert.equal(getPublishBlockReason({ title: 'Sessional Instructional Assistant', department: 'UTM:Institute of Forensic Sciences' }), null);
  assert.equal(
    getPublishBlockReason({ title: 'Research Assistant', department: "Master's in Development Practice: Indigenous Development" }),
    null,
  );
});

test('rejects a title that swallowed the rest of the posting (City of Hamilton case)', () => {
  const reason = getPublishBlockReason({
    title: 'Financial Coordinator (3 vacancies-1 permanent 2 temporary)Corporate Services - Hamilton, Ontario (Hybrid)Contribute to the City of Hamilton, one of Canada’s largest cities - home to a diverse and strong economy, an active and inclusive community, a robust cultural and dining scene, hundreds of kilometers of hiking trails and natural beauty just minutes from the downtown core, and so much more.',
  });
  assert.equal(reason, 'corrupted field: title');
});

test('rejects pipeline and multiplicity annotations left in titles', () => {
  assert.equal(getPublishBlockReason({ title: 'Project Coordinator - PIPELINE POSTING ONLY' }), 'flagged word in title');
  assert.equal(getPublishBlockReason({ title: 'Clinical Practice Nurse Clinician x 20' }), 'flagged word in title');
  assert.equal(getPublishBlockReason({ title: 'Transit Operator - POOL' }), 'flagged word in title');
});

test('rejects an education field that swallowed its source label', () => {
  assert.equal(
    getPublishBlockReason({
      title: 'Civil Engineering Technologist',
      educationRequirements: '["Education Do I Need?A college diploma in Civil Engineering Technology"]',
    }),
    'corrupted field: educationRequirements',
  );
});

test('rejects a portal CTA label captured as the title', () => {
  assert.equal(getPublishBlockReason({ title: 'View Job Details' }), 'unusable title');
  assert.equal(getPublishBlockReason({ title: 'View the Job Posting [PDF]' }), 'unusable title');
});

test('rejects a portal alert setting captured as the title', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Workload n (in days) to receive an alert:' }),
    'unusable title',
  );
});

test('rejects a portal alert setting captured as hours', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Site Operations Coordinator', hours: 'n (in days) to receive an alert:' }),
    'corrupted field: hours',
  );
});

test('rejects labour-relations prose captured as availability', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Course Instructor', availability: 'r the ratification' }),
    'corrupted field: availability',
  );
});

test('rejects application-document prose captured as availability', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Payroll Specialist', availability: 'r you add each document' }),
    'corrupted field: availability',
  );
});

test('rejects a cookie-banner capture used as the title', () => {
  const reason = getPublishBlockReason({
    title: 'We value your privacyWe use cookies to enhance your browsing experience, serve personalised ads or content, and analyse our traffic.',
  });
  // Caught by the flagged-word check ("We use/value cookies/your privacy").
  // The squished-join check no longer fires here ("privacyWe" has only one
  // lowercase letter after the "W") since it was tightened to require real
  // words on both sides of the join -- either way, this does not publish.
  assert.equal(reason, 'flagged word in title');
});

test('rejects employment-status words in the title', () => {
  assert.equal(getPublishBlockReason({ title: 'Clerk A-Customer Service (FT Temporary)' }), 'employment-status words in title');
  assert.equal(getPublishBlockReason({ title: 'Skate Patrol (Part-time, 15 vacancies)' }), 'employment-status words in title');
  assert.equal(getPublishBlockReason({ title: 'Float Care Coordinator, Temporary Full-Time, Ottawa Civic Hospital' }), 'employment-status words in title');
  assert.equal(getPublishBlockReason({ title: 'Library Assistant - Temporary Part-Time' }), 'employment-status words in title');
  assert.equal(getPublishBlockReason({ title: 'Senior Library Technician (Temporary Contract)' }), 'employment-status words in title');
});

test('rejects duration phrases left in a soft-parsed title', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Gardener - 12-Month Contract with Possibility of Extension' }),
    'duration metadata in title',
  );
});

test('keeps a legitimate tiered position title', () => {
  assert.equal(getPublishBlockReason({ title: 'Canada Research Chair Tier 2 Position - Tenure Track Assistant Professor' }), null);
});

test('does not flag a real role name that happens to contain a status word (archive false-positive sweep)', () => {
  // A plain \b(word)\b version of this check matched 208 archive titles;
  // full-data validation found 164 of those were real role names, not status
  // clutter -- these are that false-positive set.
  assert.equal(getPublishBlockReason({ title: 'Contract Compliance Officer' }), null);
  assert.equal(getPublishBlockReason({ title: "Contract Academic Staff, Indigenous Studies IS-1016-006 (Winter)" }), null);
  assert.equal(getPublishBlockReason({ title: 'Contract Manager / Preventative Maintenance Inspector' }), null);
  assert.equal(getPublishBlockReason({ title: 'Procurement Contract Coordinator' }), null);
  assert.equal(getPublishBlockReason({ title: 'Team Leader, Contract Services' }), null);
  assert.equal(getPublishBlockReason({ title: 'Academic Teaching Staff Contract Lecturer' }), null);
});

test('rejects reposting/amended annotations in the title', () => {
  assert.equal(getPublishBlockReason({ title: 'Home Care Attendant Repost' }), 'flagged word in title');
  assert.equal(getPublishBlockReason({ title: 'Plumbing & Gas Inspector 1 - AMENDED AND REPOSTED' }), 'flagged word in title');
  assert.equal(getPublishBlockReason({ title: 'Academic Program Assistant REPOST' }), 'flagged word in title');
});

test('rejects "vacancy"/"vacancies" wording in the title', () => {
  assert.equal(getPublishBlockReason({ title: 'Senior Hospitality Worker (Non-Tips) - Beverage - 1 Vacancy' }), 'flagged word in title');
});

test('passes a clean, ordinary job', () => {
  const reason = getPublishBlockReason({
    title: 'Recreation Programmer',
    department: 'Parks and Recreation',
    hours: '35',
    salary: '$55,000-$65,000 year',
    location: 'Hamilton, ON',
  });
  assert.equal(reason, null);
});

test('the shared quality pipeline applies title rules to soft-parsed rows', () => {
  const quality = evaluateJobQuality({
    source: 'University of Ottawa',
    title: 'APTPUO---Winter-2027---API5135D_JR37962---Ethics and Moral Reasoning',
    closingDateStatus: 'open_until_filled',
  });
  assert.equal(quality.title, 'Ethics and Moral Reasoning');
  assert.equal(quality.status, 'soft_parsed');
  assert.deepEqual(quality.reasons, []);
});

test('the shared quality pipeline hides soft rows with no deadline signal', () => {
  const quality = evaluateJobQuality({
    source: 'Example source',
    title: 'Recreation Programmer',
  });
  assert.equal(quality.status, 'hidden');
  assert.deepEqual(quality.reasons, ['missing application closing metadata']);
});

test('the shared quality gate rejects an oversized schedule field', () => {
  assert.equal(getPublishBlockReason({ title: 'Professor', academicSchedule: 'x'.repeat(121) }), 'corrupted field: academicSchedule');
});

test('the shared quality gate flags verbatim workload duplication', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Professor', hours: '24 hours per week', academicWorkload: '24 hours per week' }),
    'duplicated fields: hours/academicWorkload',
  );
});

test('the shared quality gate flags duplicated academic metadata', () => {
  assert.equal(
    getPublishBlockReason({ title: 'Course Instructor', duration: 'Fall 2026', academicTerm: 'Fall 2026' }),
    'duplicated fields: duration/academicTerm',
  );
  assert.equal(
    getPublishBlockReason({ title: 'Course Instructor', academicSchedule: 'Winter 2027', academicTerm: 'Winter 2027' }),
    'duplicated fields: academicSchedule/academicTerm',
  );
});

test('the shared quality pipeline applies duplicate-field rules', () => {
  const quality = evaluateJobQuality({
    source: 'University of Ottawa',
    title: 'Course Instructor',
    duration: 'Fall 2026',
    academicTerm: 'Fall 2026',
    closingDateStatus: 'open_until_filled',
  });
  assert.equal(quality.status, 'hidden');
  assert.deepEqual(quality.reasons, ['duplicated fields: duration/academicTerm']);
});

test('passes a legitimately long academic course-code title under the length cap', () => {
  const reason = getPublishBlockReason({
    title: 'CUPE - Fall 2026 & Winter 2027 - MUS3903 A 1&2: Production d’opéra / Opera Production (Pianist)',
  });
  assert.equal(reason, null);
});

test('does not flag short camelCase brand names/acronyms as a squished-sentence join', () => {
  // Found live in the archive DB: all wrongly rejected before this heuristic
  // was tightened to require real words on both sides of the lowercase-to-
  // uppercase transition, not just any single letter pair. A first fix
  // (3+ letters before, 2+ after) still false-positived on ServiceNow /
  // PeopleSoft / GoodWorks -- the final (3, 5) threshold was picked by
  // testing candidates against both this list and the "must still catch"
  // list below, not by inspection alone.
  assert.equal(getPublishBlockReason({ title: 'Marketing Advisor', unionName: 'MoveUP' }), null);
  assert.equal(getPublishBlockReason({ title: 'Project Manager, Energy & Industrial IoT' }), null);
  assert.equal(getPublishBlockReason({ title: 'Business Analyst, HR Technology & ServiceNow' }), null);
  assert.equal(getPublishBlockReason({ title: 'Senior PeopleSoft Integration Developer' }), null);
  assert.equal(getPublishBlockReason({ title: 'Manager GoodWorks' }), null);
});

test('still catches a genuine glued department value with no colon (short, so length alone would miss it)', () => {
  const reason = getPublishBlockReason({
    title: 'Office Services Supervisor',
    department: 'Water,Land,ResourceStewardship',
  });
  assert.equal(reason, 'corrupted field: department');
});

test('rejects a union field that swallowed the rest of the posting (City of Calgary case)', () => {
  const reason = getPublishBlockReason({
    title: 'Project Coordinator',
    unionName: 'CUPE Local 38Position Type: 1 Temporary (up to 18 months)Compensation: Pay Grade 9 $41.49 - 55.51 per hourHours of work: Standard 35 hour work week.',
  });
  assert.equal(reason, 'corrupted field: unionName');
});

test('passes real long union names that happen to run long but have no colon', () => {
  assert.equal(getPublishBlockReason({
    title: 'Professor',
    unionName: 'Association of the Academic Staff of the University of Alberta (AASUA)',
  }), null);
  assert.equal(getPublishBlockReason({
    title: 'Steward',
    unionName: 'Manitoba Government & General Employees’ Union (MGEU – Local 911)',
  }), null);
});
