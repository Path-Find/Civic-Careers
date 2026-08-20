import assert from 'node:assert/strict';
import test from 'node:test';
import { getPublishBlockReason } from '../publish-gate';

test('rejects a department field that swallowed unrelated fields (University of Ottawa case)', () => {
  const reason = getPublishBlockReason({
    title: 'Senior Officer, Academic Administration',
    department: 'Academic Services, OperationsCampus:Main CampusUnion Affiliation:SSUODate Posted (YYYY/MM/DD):2026/08/20Applications must be received BEFORE (YYYY/MM/DD):2026/08/31Hours per week:35Salary Grade:SSUO Grade 08Salary Range:$68 149,00',
  });
  assert.equal(reason, 'corrupted field: department');
});

test('rejects a title that swallowed the rest of the posting (City of Hamilton case)', () => {
  const reason = getPublishBlockReason({
    title: 'Financial Coordinator (3 vacancies-1 permanent 2 temporary)Corporate Services - Hamilton, Ontario (Hybrid)Contribute to the City of Hamilton, one of Canada’s largest cities - home to a diverse and strong economy, an active and inclusive community, a robust cultural and dining scene, hundreds of kilometers of hiking trails and natural beauty just minutes from the downtown core, and so much more.',
  });
  assert.equal(reason, 'corrupted field: title');
});

test('rejects a portal CTA label captured as the title', () => {
  assert.equal(getPublishBlockReason({ title: 'View Job Details' }), 'unusable title');
  assert.equal(getPublishBlockReason({ title: 'View the Job Posting [PDF]' }), 'unusable title');
});

test('rejects a cookie-banner capture used as the title', () => {
  const reason = getPublishBlockReason({
    title: 'We value your privacyWe use cookies to enhance your browsing experience, serve personalised ads or content, and analyse our traffic.',
  });
  // Caught by the squished-sentence-join check before the flagged-word check
  // even runs — either way, the job correctly does not get published.
  assert.equal(reason, 'corrupted field: title');
});

test('rejects employment-status words in the title', () => {
  assert.equal(getPublishBlockReason({ title: 'Clerk A-Customer Service (FT Temporary)' }), 'employment-status words in title');
  assert.equal(getPublishBlockReason({ title: 'Skate Patrol (Part-time, 15 vacancies)' }), 'employment-status words in title');
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
    salary: '$55,000 - $65,000',
    location: 'Hamilton, ON',
  });
  assert.equal(reason, null);
});

test('passes a legitimately long academic course-code title under the length cap', () => {
  const reason = getPublishBlockReason({
    title: 'CUPE - Fall 2026 & Winter 2027 - MUS3903 A 1&2: Production d’opéra / Opera Production (Pianist)',
  });
  assert.equal(reason, null);
});
