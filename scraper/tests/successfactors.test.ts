import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextNumberedSuccessFactorsPage } from '../engines/successfactors';

test('follows numbered SuccessFactors pages beyond page ten', () => {
  assert.equal(
    getNextNumberedSuccessFactorsPage(
      'Page 10',
      [{ title: 'Page 11', href: 'https://careers.example.test/search?startrow=250' }],
      'https://careers.example.test/search?startrow=225',
    ),
    'https://careers.example.test/search?startrow=250',
  );
});

test('stops numbered SuccessFactors pagination at the last page', () => {
  assert.equal(
    getNextNumberedSuccessFactorsPage(
      'Page 36',
      [{ title: 'Page 36', href: 'https://careers.example.test/search?startrow=875' }],
      'https://careers.example.test/search?startrow=875',
    ),
    null,
  );
});
