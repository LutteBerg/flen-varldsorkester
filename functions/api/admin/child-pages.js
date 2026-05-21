// POST /api/admin/child-pages  — create a new child page under a section.

import { json, error } from '../../lib/response.js';
import { requireDb, nowIso, newId, wrap } from '../../lib/db.js';

export const onRequestPost = wrap(async ({ request, env }) => {
  const db = requireDb(env);
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const section_id = stringOr(body.sectionId, null);
  const slug = slugOr(body.slug, null);
  const title = stringOr(body.title, null);
  if (!section_id || !slug || !title) {
    return error(400, 'sectionId, slug and title are required');
  }

  const section = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(section_id).first();
  if (!section) return error(400, 'Section not found');

  const dup = await db.prepare(
    `SELECT id FROM child_pages WHERE section_id = ?1 AND slug = ?2`
  ).bind(section_id, slug).first();
  if (dup) return error(409, 'A child page with that slug already exists in this section');

  const id = `cp-${newId()}`;
  const ts = nowIso();
  const status = ['published', 'draft'].includes(body.status) ? body.status : 'draft';

  await db.prepare(
    `INSERT INTO child_pages (
       id, section_id, slug, title, short_description, body, cover_image,
       sort_order, status, data, created_at, updated_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, ?11)`
  ).bind(
    id, section_id, slug, title,
    stringOr(body.shortDescription, ''),
    stringOr(body.body, ''),
    stringOr(body.coverImage, ''),
    Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
    status, ts, ts
  ).run();

  const row = await db.prepare(`SELECT * FROM child_pages WHERE id = ?1`).bind(id).first();
  return json({ ok: true, childPage: row });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
function slugOr(v, fallback) {
  if (typeof v !== 'string') return fallback;
  const s = v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || fallback;
}
