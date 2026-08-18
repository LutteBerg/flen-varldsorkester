import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapFetchedAt,
  parsePublicContentBootstrap,
} from '../src/lib/cms/adapters/apiAdapter.js';

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

test('bootstrap freshness: recent __bootstrappedAt stamp is trusted', () => {
  const now = Date.now();
  const snapshot = { news: [], __bootstrappedAt: new Date(now - 10_000).toISOString() };
  assert.equal(bootstrapFetchedAt(snapshot, now), now);
});

test('bootstrap freshness: old or missing stamp means stale (service-worker replay)', () => {
  const now = Date.now();
  // Stamp older than the server snapshot cache TTL — a frozen SW shell.
  const stale = { news: [], __bootstrappedAt: new Date(now - 3_600_000).toISOString() };
  assert.equal(bootstrapFetchedAt(stale, now), 0);
  // Pre-stamp HTML (deployed before this feature) has no stamp at all.
  assert.equal(bootstrapFetchedAt({ news: [] }, now), 0);
  assert.equal(bootstrapFetchedAt(null, now), 0);
});
