import test from 'node:test';
import assert from 'node:assert/strict';
import {
  invalidateAfterContentMutation,
  isContentMutation,
  onRequest,
} from '../functions/_middleware.js';
import {
  getPublishedSnapshot,
  invalidatePublishedSnapshot,
} from '../functions/seo/snapshot-cache.js';
import { seoFixture } from './seo-fixture.js';

test('recognizes only content-changing admin requests', () => {
  assert.equal(
    isContentMutation(new Request('https://example.test/api/admin/sections/1', {
      method: 'PUT',
    })),
    true,
  );
  assert.equal(
    isContentMutation(new Request('https://example.test/api/admin/upload', {
      method: 'POST',
    })),
    true,
  );
  assert.equal(
    isContentMutation(new Request('https://example.test/api/admin/login', {
      method: 'POST',
    })),
    false,
  );
  assert.equal(
    isContentMutation(new Request('https://example.test/api/admin/content')),
    false,
  );
});

test('invalidates after a successful content mutation', async () => {
  let calls = 0;
  const request = new Request('https://example.test/api/admin/events/1', {
    method: 'DELETE',
  });
  const response = new Response(null, { status: 204 });

  await invalidateAfterContentMutation(request, response, async () => {
    calls += 1;
  });

  assert.equal(calls, 1);
});

test('does not invalidate after a failed content mutation', async () => {
  let calls = 0;
  const request = new Request('https://example.test/api/admin/events/1', {
    method: 'DELETE',
  });
  const response = new Response('No', { status: 400 });

  await invalidateAfterContentMutation(request, response, async () => {
    calls += 1;
  });

  assert.equal(calls, 0);
});

test('serves Markdown only when a public HTML GET explicitly prefers it', async () => {
  await seedSnapshot();
  const response = await onRequest(createContext({
    accept: 'text/markdown, text/html;q=0.8',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      Vary: 'Accept-Encoding',
    },
  }));

  assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
  assert.equal(response.headers.get('Vary'), 'Accept-Encoding, Accept');
  assert.match(await response.text(), /^# FlenVärldsOrkester/m);
});

test('keeps the existing HTMLRewriter path for browser requests', async () => {
  await seedSnapshot();
  const previousRewriter = globalThis.HTMLRewriter;
  globalThis.HTMLRewriter = FakeHTMLRewriter;
  try {
    const response = await onRequest(createContext({
      accept: 'text/html,application/xhtml+xml',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));

    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('X-Test-HTMLRewriter'), 'used');
    assert.equal(await response.text(), '<!doctype html><title>Baseline</title><div id="root"></div>');
  } finally {
    globalThis.HTMLRewriter = previousRewriter;
  }
});

test('does not negotiate API, static, or non-GET responses', async () => {
  const api = await onRequest(createContext({
    pathname: '/api/content',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: '{"ok":true}',
  }));
  const image = await onRequest(createContext({
    pathname: '/assets/logo.png',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'image/png' },
    body: 'png',
  }));
  const post = await onRequest(createContext({
    pathname: '/flen-varldsorkester',
    method: 'POST',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  const apiHtmlError = await onRequest(createContext({
    pathname: '/api/missing',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: '<h1>API error</h1>',
  }));
  const staticHtmlError = await onRequest(createContext({
    pathname: '/assets/missing.png',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: '<h1>Static error</h1>',
  }));

  assert.equal(api.headers.get('Content-Type'), 'application/json; charset=utf-8');
  assert.equal(await api.text(), '{"ok":true}');
  assert.equal(image.headers.get('Content-Type'), 'image/png');
  assert.equal(await image.text(), 'png');
  assert.equal(post.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(apiHtmlError.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(await apiHtmlError.text(), '<h1>API error</h1>');
  assert.equal(staticHtmlError.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(await staticHtmlError.text(), '<h1>Static error</h1>');
});

test('returns empty noindex Markdown for admin and unknown routes', async () => {
  await seedSnapshot();
  const admin = await onRequest(createContext({
    pathname: '/admin/login',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  const unknown = await onRequest(createContext({
    pathname: '/missing',
    accept: 'text/markdown',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));

  for (const response of [admin, unknown]) {
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
    assert.equal(await response.text(), '');
  }
});

test('falls back to the untouched HTML response when the snapshot is unavailable', async () => {
  await invalidatePublishedSnapshot({ cache: null });
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await onRequest(createContext({
      accept: 'text/markdown',
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      env: {
        DB: {
          prepare() {
            throw new Error('D1 unavailable');
          },
        },
      },
    }));

    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(await response.text(), '<!doctype html><title>Baseline</title><div id="root"></div>');
  } finally {
    console.error = originalError;
  }
});

async function seedSnapshot() {
  await invalidatePublishedSnapshot({ cache: null });
  await getPublishedSnapshot({}, {
    cache: null,
    build: async () => structuredClone(seoFixture),
  });
}

function createContext({
  pathname = '/flen-varldsorkester',
  method = 'GET',
  accept,
  headers = { 'Content-Type': 'text/html; charset=utf-8' },
  body = '<!doctype html><title>Baseline</title><div id="root"></div>',
  env = {},
} = {}) {
  const requestHeaders = new Headers();
  if (accept !== undefined) requestHeaders.set('Accept', accept);
  return {
    request: new Request(`https://example.test${pathname}`, {
      method,
      headers: requestHeaders,
    }),
    env,
    next: async () => new Response(body, { headers }),
  };
}

class FakeHTMLRewriter {
  on() {
    return this;
  }

  transform(response) {
    const headers = new Headers(response.headers);
    headers.set('X-Test-HTMLRewriter', 'used');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
