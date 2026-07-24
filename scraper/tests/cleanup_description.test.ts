import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanOverviewBoilerplate } from '../cleanup_description';

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
