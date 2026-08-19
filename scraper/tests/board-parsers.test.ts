import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHamilton,
  parseCityOfToronto,
  parseWorkday,
  parseOntarioHealthAtHome,
} from '../board-parsers';

test('parseHamilton extracts structured fields correctly', () => {
  const rawText = `
Job ID #32177: Senior Financial Analyst-Utility Billing
Union: Non-Union
Job Description ID #: A11884
Close date: Interested applicants please submit your application online by 4:00 p.m. on August 26, 2026
Duration:  Up to 12 months
Vacancy type: This posting is for an existing vacancy 
SUMMARY OF DUTIES
  `;
  const result = parseHamilton(rawText);
  assert.equal(result.isUnionized, 0);
  assert.equal(result.unionName, null);
  assert.equal(result.closingDate, '2026-08-26');
  assert.equal(result.duration, 'Up to 12 months');
  assert.equal(result.employmentType, 'Contract');
});

test('parseCityOfToronto extracts structured fields correctly', () => {
  const rawText = `
Job ID: 66491
Division & Section: Corporate Real Estate Management, Fire & Life Safety Program Office
Work Location: 35 Spadina Road
Job Type & Duration: Full-time, 1 Permanent Vacancy
Salary Range: $89,337.00 - $132,880.00, TM1451 and PTM2
Shift Information: Monday to Friday, 35 hours per week per week
Affiliation: Non-Union
Posting Period: 17-AUG-2026 to 18-SEP-2026 
  `;
  const result = parseCityOfToronto(rawText);
  assert.equal(result.department, 'Corporate Real Estate Management, Fire & Life Safety Program Office');
  assert.equal(result.location, '35 Spadina Road');
  assert.equal(result.employmentType, 'Permanent');
  assert.equal(result.duration, 'Permanent');
  assert.equal(result.salary, '$89,337.00 - $132,880.00, TM1451 and PTM2');
  assert.equal(result.salaryMin, 89337);
  assert.equal(result.salaryMax, 132880);
  assert.equal(result.salaryPeriod, 'yearly');
  assert.equal(result.hours, 'Monday to Friday, 35 hours per week per week');
  assert.equal(result.isUnionized, 0);
  assert.equal(result.closingDate, '2026-09-18');
});

test('parseWorkday extracts structured fields correctly', () => {
  const rawText = `
Skip to main contentCurriculum Developer page is loadedCurriculum DeveloperApplylocationsOttawa Campustime typePart timeposted onPosted 30+ Days Agojob requisition idR174413
Department:Mechanical & Transportation Technology
Position Type:Part-Time
Salary Range:$25.00-$100.00-Hourly
Scheduled Weekly Hours:8
Length of Contract:3 months
Posting Closing Date:September 18, 2026
  `;
  const result = parseWorkday(rawText);
  assert.equal(result.location, 'Ottawa Campus');
  assert.equal(result.employmentType, 'Contract');
  assert.equal(result.department, 'Mechanical & Transportation Technology');
  assert.equal(result.salary, '$25.00-$100.00-Hourly');
  assert.equal(result.salaryMin, 25.00);
  assert.equal(result.salaryMax, 100.00);
  assert.equal(result.salaryPeriod, 'hourly');
  assert.equal(result.hours, '8');
  assert.equal(result.duration, '3 months');
  assert.equal(result.closingDate, '2026-09-18');
});

test('parseOntarioHealthAtHome extracts structured fields correctly', () => {
  const rawText = `
Status: Full-Time or Part-Time
Location: Sudbury, Sault Ste. Marie
Hourly wage of $43.23 to $50.00 as per the OPSEU Collective Agreement
  `;
  const result = parseOntarioHealthAtHome(rawText);
  assert.equal(result.employmentType, 'Part-time');
  assert.equal(result.location, 'Sudbury, Sault Ste. Marie');
  assert.equal(result.salaryMin, 43.23);
  assert.equal(result.salaryMax, 50.00);
  assert.equal(result.isUnionized, 1);
  assert.equal(result.unionName, 'OPSEU');
});
