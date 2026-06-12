import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePublicContentBootstrap } from '../src/lib/cms/adapters/apiAdapter.js';

test('API adapter parses the published snapshot embedded by middleware', () => {
  const snapshot = {
    global: { siteTitle: 'Kulturföreningen FlenVärldsOrkester' },
    sections: [{ id: 1, slug: 'flen-varldsorkester' }],
    news: [],
    events: [],
  };

  assert.deepEqual(
    parsePublicContentBootstrap(JSON.stringify(snapshot)),
    snapshot,
  );
});

test('API adapter ignores missing or malformed bootstrap JSON', () => {
  assert.equal(parsePublicContentBootstrap(''), null);
  assert.equal(parsePublicContentBootstrap('{broken'), null);
});
