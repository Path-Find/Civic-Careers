import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanJobDescription, cleanOverviewBoilerplate } from '../cleanup_description';
import { cleanSourceDescriptionBoilerplate } from '../source-description-cleanup';

test('removes preceding employer copy at paragraph boundaries', () => {
  const result = cleanOverviewBoilerplate(
    'The university is a leading research institution.\n\nThe Research Associate will coordinate studies and analyze results.',
    'Research Associate'
  );
  assert.equal(result, 'The Research Associate will coordinate studies and analyze results.');
});

test('keeps the complete role paragraph when a person name precedes the title', () => {
  const result = cleanOverviewBoilerplate(
    'The lab studies health outcomes across Canada.\n\nReporting to Monica Aggarwal, the Research Associate will manage recruitment and data analysis.',
    'Research Associate'
  );
  assert.equal(result, 'Reporting to Monica Aggarwal, the Research Associate will manage recruitment and data analysis.');
});

test('does not change an overview without a distinct boilerplate paragraph', () => {
  const overview = 'The Program Administrator coordinates scheduling and supports applicants.';
  assert.equal(cleanOverviewBoilerplate(overview, 'Program Administrator'), overview);
});

test('removes sentence-level employer copy without cutting the role sentence', () => {
  assert.equal(
    cleanOverviewBoilerplate(
      'The university is a leading research institution. The Research Associate will coordinate studies and analyze results.',
      'Research Associate'
    ),
    'The Research Associate will coordinate studies and analyze results.'
  );
});

test('removes an inline marketing label before the role summary', () => {
  assert.equal(
    cleanOverviewBoilerplate(
      'The university is a leading research institution.\n\nYour opportunity: Reporting to the DSI Academic Director, the Executive Director, DSI leads the program.',
      'Executive Director, DSI'
    ),
    'Reporting to the DSI Academic Director, the Executive Director, DSI leads the program.'
  );
});

test('removes standalone social and generic equity boilerplate without deleting duties', () => {
  const result = cleanJobDescription(`## Responsibilities
- Coordinate student services.

Learn more about the employer on Instagram.

We are an equal opportunity employer and strive to meet the accommodation needs of persons with disabilities.`, 'Coordinator');
  assert.equal(result, '## Responsibilities\n- Coordinate student services.');
});

test('deduplicates repeated bullets inside a section', () => {
  const result = cleanJobDescription(`## Qualifications
- Valid Class G licence.
- Valid Class G licence.
- Three years of experience.`, 'Operator');
  assert.equal(result, '## Qualifications\n- Valid Class G licence.\n- Three years of experience.');
});

test('removes the reviewed Metrolinx administrative suffix', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Qualifications
- Degree in planning.

**Don’t Meet Every Requirement?**
If you are excited about working with Metrolinx, we encourage you to apply.

Application Process:
All applicants must be legally entitled to work in Canada.

We thank all applicants for their interest.`);
  assert.equal(result, '## Qualifications\n- Degree in planning.');
});

test('removes repeated Metrolinx introduction paragraphs without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `**Contract Role**

Metrolinx is connecting communities across the Greater Golden Horseshoe. Metrolinx operates GO Transit and UP Express, as well as the PRESTO fare payment system. Metrolinx is an agency of the Government of Ontario.

At Metrolinx, equity, diversity and inclusion are essential to living our values of serving with passion, thinking forward and playing as a team.

Reporting to the manager, the advisor will deliver communications.`);
  assert.equal(result, '**Contract Role**\n\nReporting to the manager, the advisor will deliver communications.');
});

test('removes the reviewed Brock employer introduction without deleting role content', () => {
  const result = cleanSourceDescriptionBoilerplate('Brock University', `## Overview
Brock University is located on the traditional territory of the Haudenosaunee and Anishinaabe peoples, many of whom continue to live and work here today. This territory is covered by the Upper Canada Treaties and is within the land protected by the Dish with One Spoon Wampum Agreement. We are one of Canada's outstanding comprehensive universities, where excellence and innovation thrives! Brock has been recognized as a Top Employer in Hamilton-Niagara for seven consecutive years. Break through at Brock.

Reporting to the Associate Vice-President, the Director will lead technology operations and service delivery.`);
  assert.equal(result, '## Overview\n\nReporting to the Associate Vice-President, the Director will lead technology operations and service delivery.');
});

test('does not cut role content between Metrolinx boilerplate sentences', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `Metrolinx is connecting communities across the Greater Golden Horseshoe. Our Capital Projects Group is hiring a Manager to deliver safety programs. Metrolinx is an agency of the Government of Ontario.

- Manage system safety documentation and approvals.

**Additional Information**
- Accommodation available upon request.`);
  assert.match(result, /Our Capital Projects Group is hiring a Manager/);
  assert.match(result, /Manage system safety documentation/);
  assert.doesNotMatch(result, /Accommodation available upon request/);
});

test('removes empty Metrolinx footer bullets and headings', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', `## Qualifications
- Valid licence.

**Additional Information**
- We are committed to equity, diversity and inclusion.
- Accommodation available upon request.
- All applicants must be legally entitled to work in Canada.`);
  assert.equal(result, '## Qualifications\n- Valid licence.');
});

test('keeps bold metadata that is not a heading', () => {
  const result = cleanSourceDescriptionBoilerplate('Metrolinx', '**Start Rate (Non-Negotiable) - $29.46**');
  assert.equal(result, '**Start Rate (Non-Negotiable) - $29.46**');
});

test('does not remove a role paragraph that merely mentions Metrolinx', () => {
  const description = '## Overview\nThe manager will improve Metrolinx service reliability.';
  assert.equal(cleanSourceDescriptionBoilerplate('Metrolinx', description), description);
});
