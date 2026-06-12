import { buildContentSnapshot } from '../api/_lib/content.js';

const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_ORIGIN = 'https://seo-cache.internal';
const DEFAULT_CACHE_NAMESPACE = 'published-content-v2';
const memorySnapshots = new Map();
const pendingBuilds = new Map();

export async function getPublishedSnapshot(env, options = {}) {
  const cacheNamespace = options.cacheNamespace || DEFAULT_CACHE_NAMESPACE;
  const cache = resolveCache(options);
  const build = options.build || (() => (
    buildContentSnapshot(env.DB, { publishedOnly: true })
  ));

  if (!cache) {
    return getMemorySnapshot(cacheNamespace, build);
  }

  const request = cacheRequest(cacheNamespace);
  try {
    const cached = await cache.match(request);
    if (cached) return await cached.json();
  } catch {
    return getMemorySnapshot(cacheNamespace, build);
  }

  const memoryEntry = memorySnapshots.get(cacheNamespace);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.snapshot;
  }

  if (!pendingBuilds.has(cacheNamespace)) {
    pendingBuilds.set(
      cacheNamespace,
      buildAndStore(cache, request, build, cacheNamespace),
    );
  }

  try {
    return await pendingBuilds.get(cacheNamespace);
  } finally {
    pendingBuilds.delete(cacheNamespace);
  }
}

export async function invalidatePublishedSnapshot(options = {}) {
  const cacheNamespace = options.cacheNamespace || DEFAULT_CACHE_NAMESPACE;
  const cache = resolveCache(options);
  memorySnapshots.delete(cacheNamespace);
  pendingBuilds.delete(cacheNamespace);

  if (!cache) return false;
  try {
    return await cache.delete(cacheRequest(cacheNamespace));
  } catch {
    return false;
  }
}

async function buildAndStore(cache, request, build, cacheNamespace) {
  const snapshot = await build();
  const response = new Response(JSON.stringify(snapshot), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  });
  try {
    await cache.put(request, response);
  } catch {
    memorySnapshots.set(cacheNamespace, {
      snapshot,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    });
  }
  return snapshot;
}

async function getMemorySnapshot(cacheNamespace, build) {
  const entry = memorySnapshots.get(cacheNamespace);
  if (entry && entry.expiresAt > Date.now()) return entry.snapshot;

  if (!pendingBuilds.has(cacheNamespace)) {
    pendingBuilds.set(cacheNamespace, (async () => {
      const snapshot = await build();
      memorySnapshots.set(cacheNamespace, {
        snapshot,
        expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
      });
      return snapshot;
    })());
  }

  try {
    return await pendingBuilds.get(cacheNamespace);
  } finally {
    pendingBuilds.delete(cacheNamespace);
  }
}

function resolveCache(options) {
  if (Object.hasOwn(options, 'cache')) return options.cache;
  return globalThis.caches?.default || null;
}

function cacheRequest(cacheNamespace) {
  return new Request(`${CACHE_KEY_ORIGIN}/${encodeURIComponent(cacheNamespace)}`);
}
