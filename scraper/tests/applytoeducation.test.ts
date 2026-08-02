import assert from 'node:assert/strict';
import test from 'node:test';
import { extractApplyToEducationFeedUrls, extractApplyToEducationJobs } from '../engines/applytoeducation';

test('extracts ApplyToEducation feeds and full job metadata', () => {
  const feed = 'https://network.applytoeducation.com/Applicant/attSearchexXML.aspx?jcid=abc&ep=def&lc=en&app_type=external';
  assert.deepEqual(extractApplyToEducationFeedUrls(`<script>"${feed.replaceAll('&', '\\u0026')}"</script>`), [feed]);

  const xml = `<?xml version="1.0"?><source><job><title><![CDATA[Data Science Specialist]]></title><date><![CDATA[Jul 23,2026]]></date><referencenumber><![CDATA[4052567]]></referencenumber><url><![CDATA[https://network.applytoeducation.com/Applicant/jobposting/jobdetails.aspx?JOB_POSTING_ID=abc]]></url><description><![CDATA[<p>Build data systems.</p><ul><li>Work with schools.</li></ul>]]></description></job><job><title><![CDATA[Duplicate]]></title><referencenumber><![CDATA[4052567]]></referencenumber><url><![CDATA[https://example.invalid]]></url><description><![CDATA[Duplicate]]></description></job></source>`;
  assert.deepEqual(extractApplyToEducationJobs(xml), [{
    id: 'ate_4052567',
    title: 'Data Science Specialist',
    url: 'https://network.applytoeducation.com/Applicant/jobposting/jobdetails.aspx?JOB_POSTING_ID=abc',
    applicationUrl: 'https://network.applytoeducation.com/Applicant/jobposting/jobdetails.aspx?JOB_POSTING_ID=abc',
    postedAt: 'Jul 23,2026',
    rawText: 'Data Science Specialist\n\nBuild data systems.\n- Work with schools.',
  }]);
});
