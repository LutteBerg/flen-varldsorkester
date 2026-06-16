import test from 'node:test';
import assert from 'node:assert/strict';
import { clearCoverReferences } from '../functions/api/admin/media/[id].js';

test('deleting section media clears a matching section cover image', async () => {
  const calls = [];
  const db = statementRecorder(calls);

  await clearCoverReferences(db, {
    url: '/media/uploads/fvo.jpg',
    section_id: 's1',
    child_page_id: null,
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /UPDATE sections SET cover_image = ''/);
  assert.deepEqual(calls[0].bindings.slice(1), ['s1', '/media/uploads/fvo.jpg']);
});

test('deleting child page media clears a matching child page cover image', async () => {
  const calls = [];
  const db = statementRecorder(calls);

  await clearCoverReferences(db, {
    url: '/media/uploads/musaik.jpg',
    section_id: null,
    child_page_id: 'cp1',
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /UPDATE child_pages SET cover_image = ''/);
  assert.deepEqual(calls[0].bindings.slice(1), ['cp1', '/media/uploads/musaik.jpg']);
});

test('deleting ordinary media without a URL does not update covers', async () => {
  const calls = [];
  const db = statementRecorder(calls);

  await clearCoverReferences(db, {
    url: '',
    section_id: 's1',
    child_page_id: null,
  });

  assert.equal(calls.length, 0);
});

function statementRecorder(calls) {
  return {
    prepare(sql) {
      return {
        bind(...bindings) {
          calls.push({ sql, bindings });
          return {
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  };
}
