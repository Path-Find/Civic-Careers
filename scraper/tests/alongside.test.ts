import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAlongsideJobs } from '../engines/alongside';

test('extracts CareerBeacon detail, apply, title, location, and category from an Alongside widget', () => {
  const script = String.raw`htmlNode.innerHTML = "<table><tbody><tr>
    <td><strong><a class=\"block showVisited\" href=\"https:\/\/jobs.careerbeacon.com\/details\/sample-role\/12345?utm_source=widget\">Sample Role<\/a><\/strong><\/td>
    <td data-headline=\"Location\">Fredericton, NB<\/td>
    <td data-headline=\"Category\"><div>Administrative<\/div><\/td>
    <td><a href=\"https:\/\/jobs.careerbeacon.com\/apply\/12345\">Apply Now<\/a><\/td>
  <\/tr><\/tbody><\/table>";`;

  assert.deepEqual(extractAlongsideJobs(script), [{
    id: 'careerbeacon_12345',
    title: 'Sample Role',
    url: 'https://www.careerbeacon.com/en/job/12345',
    applicationUrl: 'https://www.careerbeacon.com/en/apply/12345',
    location: 'Fredericton, NB',
    category: 'Administrative',
  }]);
});

test('deduplicates the same CareerBeacon job across widget feeds', () => {
  const script = String.raw`htmlNode.innerHTML = "<tr><td><a class=\"block showVisited\" href=\"https:\/\/jobs.careerbeacon.com\/details\/same-job\/99\">Same Job<\/a><\/td><td data-headline=\"Location\">Remote<\/td><\/tr>";`;
  assert.equal(extractAlongsideJobs(script).length, 1);
});
