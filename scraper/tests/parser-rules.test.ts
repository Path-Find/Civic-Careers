import assert from 'node:assert/strict';
import test from 'node:test';
import { applyParserTitleRules, parserContext, resolveParserRules, sourceEngine } from '../parser-rules';

test('uses the narrowest matching scope and keeps unknown sources global-only', () => {
  const ottawaRules = resolveParserRules(parserContext('University of Ottawa'));
  assert.deepEqual(ottawaRules.map(rule => rule.scope), ['source', 'global']);
  assert.equal(resolveParserRules(parserContext('Unlisted Employer')).length, 1);
});

test('does not claim an engine rule for a source without one', () => {
  assert.equal(sourceEngine('University of Ottawa'), 'workday');
  assert.equal(sourceEngine('Unlisted Employer'), null);
  assert.deepEqual(resolveParserRules({ source: 'Unlisted Employer', engine: 'workday' }).map(rule => rule.id), ['global.title.normalize']);
});

test('applies source title cleanup only to the source that owns the rule', () => {
  const ottawa = applyParserTitleRules(parserContext('University of Ottawa'), 'APTPUO---Winter-2027---API5135D_JR37962');
  assert.equal(ottawa.title, 'Course Instructor');
  assert.ok(ottawa.ruleIds.includes('source.title.normalize-source-metadata'));

  const other = applyParserTitleRules(parserContext('Unlisted Employer'), 'APTPUO---Winter-2027---API5135D_JR37962');
  assert.equal(other.title, 'APTPUO - Winter-2027 - API5135D_JR37962');
  assert.deepEqual(other.ruleIds, ['global.title.normalize']);
});

test('raw-title normalization is traceable without changing the raw capture', () => {
  const result = applyParserTitleRules(
    parserContext('Government of Canada'),
    'PM-01 Client Support Centre Agent (#25689)',
    'PM-01 Client Support Centre Agent (#25689)',
  );
  assert.equal(result.title, 'Client Support Centre Agent');
  assert.ok(result.ruleIds.includes('source.title.normalize-source-metadata'));
});
