import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentSnapshot } from '../functions/api/_lib/content.js';

test('content snapshot preserves source timestamps for SEO lastmod', async () => {
  const rows = {
    site_settings: [{
      key: 'global',
      value: JSON.stringify({ siteTitle: 'FVO' }),
      updated_at: '2026-06-01T00:00:00.000Z',
    }],
    sections: [{
      id: 's1',
      slug: 'fvo',
      title: 'FVO',
      status: 'published',
      sort_order: 0,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
    }],
    child_pages: [{
      id: 'c1',
      section_id: 's1',
      slug: 'child',
      title: 'Child',
      status: 'published',
      sort_order: 0,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-06-03T00:00:00.000Z',
    }],
    media_items: [{
      id: 'm1',
      section_id: 's1',
      child_page_id: null,
      type: 'image',
      url: '/image.jpg',
      status: 'published',
      pinned: 0,
      sort_order: 0,
      created_at: '2026-05-03T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
    }],
    news: [{
      id: 'n1',
      section_id: 's1',
      child_page_id: null,
      title: 'News',
      date: '2026-06-05',
      status: 'published',
      created_at: '2026-05-04T00:00:00.000Z',
      updated_at: '2026-06-05T00:00:00.000Z',
    }],
    events: [{
      id: 'e1',
      section_id: 's1',
      child_page_id: null,
      title: 'Event',
      date: '2026-06-06',
      status: 'published',
      created_at: '2026-05-05T00:00:00.000Z',
      updated_at: '2026-06-06T00:00:00.000Z',
    }],
  };
  const db = {
    prepare(sql) {
      const table = Object.keys(rows).find((name) => sql.includes(`FROM ${name}`));
      return {
        async all() {
          return { results: rows[table] || [] };
        },
      };
    },
  };

  const snapshot = await buildContentSnapshot(db, { publishedOnly: true });

  assert.equal(snapshot.global.updatedAt, '2026-06-01T00:00:00.000Z');
  assert.equal(snapshot.sections[0].createdAt, '2026-05-01T00:00:00.000Z');
  assert.equal(snapshot.sections[0].updatedAt, '2026-06-02T00:00:00.000Z');
  assert.equal(snapshot.sections[0].childPages[0].updatedAt, '2026-06-03T00:00:00.000Z');
  assert.equal(snapshot.sections[0].galleryImages[0].updatedAt, '2026-06-04T00:00:00.000Z');
  assert.equal(snapshot.news[0].updatedAt, '2026-06-05T00:00:00.000Z');
  assert.equal(snapshot.events[0].updatedAt, '2026-06-06T00:00:00.000Z');
});
