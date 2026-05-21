// PUT /api/admin/child-pages/:id  — update a child page
// DELETE /api/admin/child-pages/:id  — delete a child page (cascades media)

import { json, error, noContent } from '../../../lib/response.js';
import { requireDb, nowIso, wrap } from '../../../lib/db.js';

export const onRequestPut = wrap(async ({ params, request, env }) => {
  const db = requireDb(env);
  const id = params.id;
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const existing = await db.prepare(`SELECT * FROM child_pages WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Child page not found');

  const updates = {
    section_id:        stringOr(body.sectionId, null),
    slug:              slugOr(body.slug, null),
    title:             stringOr(body.title, null),
    short_description: stringOr(body.shortDescription, null),
    body:              stringOr(body.body, null),
    cover_image:       stringOr(body.coverImage, null),
    sort_order:        Number.isInteger(body.sortOrder) ? body.sortOrder : null,
    status:            ['published', 'draft'].includes(body.status) ? body.status : null,
  };

  // If section_id changes, verify it exists
  if (updates.section_id && updates.section_id !== existing.section_id) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(updates.section_id).first();
    if (!s) return error(400, 'Target section not found');
  }
  // Check slug uniqueness within the (possibly new) section
  if (updates.slug || updates.section_id) {
    const targetSection = updates.section_id || existing.section_id;
    const targetSlug = updates.slug || existing.slug;
    const dup = await db.prepare(
      `SELECT id FROM child_pages WHERE section_id = ?1 AND slug = ?2 AND id != ?3`
    ).bind(targetSection, targetSlug, id).first();
    if (dup) return error(409, 'A child page with that slug already exists in this section');
  }

  const setClauses = [];
  const bindings = [];
  let i = 1;
  for (const [col, val] of Object.entries(updates)) {
    if (val !== null) {
      setClauses.push(`${col} = ?${i++}`);
      bindings.push(val);
    }
  }
  if (setClauses.length === 0) return error(400, 'No valid fields to update');

  setClauses.push(`updated_at = ?${i++}`);
  bindings.push(nowIso());
  bindings.push(id);

  await db.prepare(`UPDATE child_pages SET ${setClauses.join(', ')} WHERE id = ?${i}`).bind(...bindings).run();
  const row = await db.prepare(`SELECT * FROM child_pages WHERE id = ?1`).bind(id).first();
  return json({ ok: true, childPage: row });
});

export const onRequestDelete = wrap(async ({ params, env }) => {
  const db = requireDb(env);
  const id = params.id;
  const existing = await db.prepare(`SELECT id FROM child_pages WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Child page not found');
  await db.prepare(`DELETE FROM child_pages WHERE id = ?1`).bind(id).run();
  return noContent();
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
function slugOr(v, fallback) {
  if (typeof v !== 'string') return fallback;
  const s = v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || fallback;
}
