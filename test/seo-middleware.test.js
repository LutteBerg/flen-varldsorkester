import test from 'node:test';
import assert from 'node:assert/strict';
import {
  invalidateAfterContentMutation,
  isContentMutation,
} from '../functions/_middleware.js';

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
