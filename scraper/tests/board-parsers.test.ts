import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseHamilton,
  parseCityOfToronto,
  parseWorkday,
  parseOntarioHealthAtHome,
  parseADP,
  parseDayforce,
  parseNjoyn,
  parseTaleo,
  parseSuccessFactors,
  parseTechnomedia,
  parseJobs2Web,
  parseGovernmentOfCanada,
  parsePeopleSoft,
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

test('parseADP extracts structured fields correctly', () => {
  const rawText = `
Theatre Technician - FLATO Markham TheatreTemporary Part Time Markham, ON, CA20 days agoRequisition ID: 4816Apply
Salary Range: $23.22 To $43.23 Hourly 
Department and Commission: Economic Growth, Culture and Entrepreneurship, Development Services
Vacancy Type: Temporary 
Application Deadline: August 31, 2026 
  `;
  const result = parseADP(rawText);
  assert.equal(result.salary, '$23.22 To $43.23 Hourly');
  assert.equal(result.salaryMin, 23.22);
  assert.equal(result.salaryMax, 43.23);
  assert.equal(result.salaryPeriod, 'hourly');
  assert.equal(result.department, 'Economic Growth, Culture and Entrepreneurship, Development Services');
  assert.equal(result.employmentType, 'Contract');
  assert.equal(result.duration, 'Contract');
  assert.equal(result.closingDate, '2026-08-31');
});

test('parseDayforce extracts structured fields correctly', () => {
  const rawText = `
Technologist, EnvironmentalReq #1968Woodbridge, Ontario, Canada
Position Details: 
Vacancies: 1
Current Rate of Pay: Min = $43.94/hr  Max = $50.92/hr
Employment type: Temporary Contract
Duration of employment: 1 year
Hours of work: 35 hrs/week 
Work location: Restoration Services Centre
Division: Restoration & Infrastructure
  `;
  const result = parseDayforce(rawText);
  assert.equal(result.salaryMin, 43.94);
  assert.equal(result.salaryMax, 50.92);
  assert.equal(result.employmentType, 'Contract');
  assert.equal(result.duration, '1 year');
  assert.equal(result.hours, '35 hrs/week');
  assert.equal(result.location, 'Restoration Services Centre');
  assert.equal(result.department, 'Restoration & Infrastructure');
});

test('parseNjoyn extracts structured fields correctly', () => {
  const rawText = `
School Crossing Guard
JD#:
Contract
Job Title:
School Crossing Guard
Job Type:
Seasonal
Salary:
$18.80/Hour
Hours of work:
15 hours per week
Union:
Non-union
Vacancy Type:
Future
  `;
  const result = parseNjoyn(rawText);
  assert.equal(result.salaryMin, 18.80);
  assert.equal(result.salaryMax, 18.80);
  assert.equal(result.salaryPeriod, 'hourly');
  assert.equal(result.employmentType, 'Seasonal');
  assert.equal(result.hours, '15 hours per week');
  assert.equal(result.isUnionized, 0);
  assert.equal(result.unionName, null);
  assert.equal(result.duration, 'Contract');
});

test('parseTaleo extracts structured fields correctly', () => {
  const rawText = `
Waterfit Instructor
Department
Recreation and Culture
Pay Range
Starting at $35.90 per hour
Apply Now
 Job DetailsPart-Time
Closing Date
Applications for this position must be received at oakville.ca by no later than 11:59 pm on December 31, 2026.
  `;
  const result = parseTaleo(rawText);
  assert.equal(result.department, 'Recreation and Culture');
  assert.equal(result.salary, 'Starting at $35.90 per hour');
  assert.equal(result.salaryMin, 35.90);
  assert.equal(result.salaryMax, 35.90);
  assert.equal(result.salaryPeriod, 'hourly');
  assert.equal(result.employmentType, 'Part-time');
  assert.equal(result.closingDate, '2026-12-31');
});

test('parseSuccessFactors extracts structured fields correctly', () => {
  const rawText = `
Primary Care Paramedic
Requisition ID: 399867
Posting End Date: Open Until Filled
City: Thompson
Employer: Shared Health
Site: Shared Health - Thompson General Hospital
Department / Unit: Thompson - ERS
Union: MAHCP
FTE: 1.00
Work Arrangement: In Person
Salary: $32.588 - $51.165
  `;
  const result = parseSuccessFactors(rawText);
  assert.equal(result.department, 'Thompson');
  assert.equal(result.location, 'Shared Health - Thompson General Hospital');
  assert.equal(result.isUnionized, 1);
  assert.equal(result.unionName, 'MAHCP');
  assert.equal(result.closingDate, null);
  assert.equal(result.workModel, 'On-site');
  assert.equal(result.hours, 'FTE: 1.00');
  assert.equal(result.salary, '$32.588 - $51.165');
  assert.equal(result.salaryMin, 32.588);
  assert.equal(result.salaryMax, 51.165);
});

test('parseTechnomedia extracts York University fields correctly', () => {
  const rawText = `
Department/Faculty (BU)
Development, Division of Advancement

Affiliation *
Work Study

Job Details *
Casual

Job Start Date
09-08-2026

Job End Date
04-30-2027

Compensation *
Hourly Range:$17.60 - $18.00

Total Weekly Hours of Work
15

Job Location
Canada / Ontario / Keele Campus
  `;
  const result = parseTechnomedia(rawText);
  assert.equal(result.department, 'Development, Division of Advancement');
  assert.equal(result.isUnionized, 0);
  assert.equal(result.unionName, null);
  assert.equal(result.employmentType, 'Contract');
  assert.equal(result.duration, '04-30-2027');
  assert.equal(result.salary, 'Hourly Range:$17.60 - $18.00');
  assert.equal(result.salaryMin, 17.6);
  assert.equal(result.salaryMax, 18);
  assert.equal(result.hours, '15');
  assert.equal(result.location, 'Canada / Ontario / Keele Campus');
});

test('parseJobs2Web extracts Canada Post fields correctly', () => {
  const rawText = `
Salary: $20.51Job Closing Date (YYYY-MM-DD): 2026-08-24
Job Description
We are currently seeking an on-call Post Office Assistant...
  `;
  const result = parseJobs2Web(rawText);
  assert.equal(result.salary, '$20.51');
  assert.equal(result.salaryMin, 20.51);
  assert.equal(result.salaryMax, 20.51);
  assert.equal(result.closingDate, '2026-08-24');
});

test('parseGovernmentOfCanada extracts GC fields correctly', () => {
  const rawText = `
Transport Canada
- Marine Safety & Security

Closing date:
December 11, 2026 - 23:59, Pacific Time

Location
Kingston (Ontario),
North York (Ontario)

Salary
$112,823 to $131,504
  `;
  const result = parseGovernmentOfCanada(rawText);
  assert.equal(result.closingDate, '2026-12-11');
  assert.equal(result.salary, '$112,823 to $131,504');
  assert.equal(result.salaryMin, 112823);
  assert.equal(result.salaryMax, 131504);
  assert.equal(result.location, 'Kingston (Ontario), North York (Ontario)');
});

test('parsePeopleSoft extracts fields correctly', () => {
  const rawText = `
Department: Human Resources
Bargaining Unit: CUPE Local 123
Salary Range: $30.00 - $45.00
Closing Date: 2026-09-15
  `;
  const result = parsePeopleSoft(rawText);
  assert.equal(result.department, 'Human Resources');
  assert.equal(result.isUnionized, 1);
  assert.equal(result.unionName, 'CUPE Local 123');
  assert.equal(result.salary, '$30.00 - $45.00');
  assert.equal(result.salaryMin, 30);
  assert.equal(result.salaryMax, 45);
  assert.equal(result.closingDate, '2026-09-15');
});


