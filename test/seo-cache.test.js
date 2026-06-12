import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublishedSnapshot,
  invalidatePublishedSnapshot,
} from '../functions/seo/snapshot-cache.js';

class FakeCache {
  constructor() {
    this.values = new Map();
  }

  async match(request) {
    return this.values.get(request.url)?.clone();
  }

  async put(request, response) {
    this.values.set(request.url, response.clone());
  }

  async delete(request) {
    return this.values.delete(request.url);
  }
}

test('reuses a cached published snapshot', async () => {
  const cache = new FakeCache();
  let buildCalls = 0;
  const build = async () => {
    buildCalls += 1;
    return { version: buildCalls };
  };

  const first = await getPublishedSnapshot({ DB: {} }, { cache, build });
  const second = await getPublishedSnapshot({ DB: {} }, { cache, build });

  assert.deepEqual(first, { version: 1 });
  assert.deepEqual(second, first);
  assert.equal(buildCalls, 1);
});

test('invalidation forces the next request to rebuild', async () => {
  const cache = new FakeCache();
  let buildCalls = 0;
  const build = async () => ({ version: ++buildCalls });

  await getPublishedSnapshot({ DB: {} }, { cache, build });
  await invalidatePublishedSnapshot({ cache });
  const rebuilt = await getPublishedSnapshot({ DB: {} }, { cache, build });

  assert.deepEqual(rebuilt, { version: 2 });
  assert.equal(buildCalls, 2);
});

test('a failed D1 build is not cached', async () => {
  const cache = new FakeCache();
  let buildCalls = 0;
  const build = async () => {
    buildCalls += 1;
    if (buildCalls === 1) throw new Error('D1 unavailable');
    return { ok: true };
  };

  await assert.rejects(
    getPublishedSnapshot({ DB: {} }, { cache, build }),
    /D1 unavailable/,
  );
  const snapshot = await getPublishedSnapshot({ DB: {} }, { cache, build });

  assert.deepEqual(snapshot, { ok: true });
  assert.equal(buildCalls, 2);
});

test('falls back to an isolate cache when the Cache API is unavailable', async () => {
  let buildCalls = 0;
  const build = async () => ({ version: ++buildCalls });

  const first = await getPublishedSnapshot(
    { DB: {} },
    { cache: null, build, cacheNamespace: 'memory-test' },
  );
  const second = await getPublishedSnapshot(
    { DB: {} },
    { cache: null, build, cacheNamespace: 'memory-test' },
  );

  assert.deepEqual(first, second);
  assert.equal(buildCalls, 1);

  await invalidatePublishedSnapshot({
    cache: null,
    cacheNamespace: 'memory-test',
  });
});

test('falls back to isolate memory when Cache API writes fail', async () => {
  const cache = new FakeCache();
  cache.put = async () => {
    throw new Error('cache write denied');
  };
  let buildCalls = 0;
  const build = async () => ({ version: ++buildCalls });
  const options = { cache, build, cacheNamespace: 'write-failure-test' };

  const first = await getPublishedSnapshot({ DB: {} }, options);
  const second = await getPublishedSnapshot({ DB: {} }, options);

  assert.deepEqual(first, second);
  assert.equal(buildCalls, 1);

  await invalidatePublishedSnapshot({
    cache,
    cacheNamespace: 'write-failure-test',
  });
});
