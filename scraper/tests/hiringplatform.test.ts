import assert from 'node:assert/strict';
import test from 'node:test';
import { extractHiringPlatformJobs } from '../engines/hiringplatform';

test('extracts HiringPlatform process and application links', () => {
  const html = `<div class="vidcruiter-job-item"><h2><a href="/processes/abc-123?locale=en">Crossing Guard (Contract)</a></h2><a href="/245229-crossing-guard/1114638/en">Apply</a></div>
    <div class="vidcruiter-job-item"><h2><a href="/processes/abc-123?locale=en">Duplicate</a></h2><a href="/duplicate">Apply</a></div>
    <div class="vidcruiter-job-item"><h2><a href="/processes/def-456?locale=en">Sports Attendant</a></h2><a href="/245029-sports-attendant/1113677/en">Apply</a></div>`;

  assert.deepEqual(extractHiringPlatformJobs(html, 'https://orillia.hiringplatform.ca/list/careers'), [
    {
      id: 'hiringplatform_abc-123',
      title: 'Crossing Guard (Contract)',
      url: 'https://orillia.hiringplatform.ca/processes/abc-123?locale=en',
      applicationUrl: 'https://orillia.hiringplatform.ca/245229-crossing-guard/1114638/en',
    },
    {
      id: 'hiringplatform_def-456',
      title: 'Sports Attendant',
      url: 'https://orillia.hiringplatform.ca/processes/def-456?locale=en',
      applicationUrl: 'https://orillia.hiringplatform.ca/245029-sports-attendant/1113677/en',
    },
  ]);
});
