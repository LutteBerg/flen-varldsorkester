// PUT /api/admin/events/:id  — update an event
// DELETE /api/admin/events/:id  — delete an event

import { json, error, noContent } from '../../../lib/response.js';
import { requireDb, nowIso, wrap } from '../../../lib/db.js';

export const onRequestPut = wrap(async ({ params, request, env }) => {
  const db = requireDb(env);
  const id = params.id;
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const existing = await db.prepare(`SELECT id FROM events WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Event not found');

  let resolvedSectionId   = body.sectionId === null ? null : (body.sectionId ? String(body.sectionId) : undefined);
  let resolvedChildPageId = body.childPageId === null ? null : (body.childPageId ? String(body.childPageId) : undefined);
  if (resolvedChildPageId) {
    const cp = await db.prepare(`SELECT id, section_id FROM child_pages WHERE id = ?1`).bind(resolvedChildPageId).first();
    if (!cp) return error(400, 'Child page not found');
    resolvedSectionId = cp.section_id;
  } else if (resolvedSectionId) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(resolvedSectionId).first();
    if (!s) return error(400, 'Section not found');
  }

  const updates = {
    section_id:    resolvedSectionId,
    child_page_id: resolvedChildPageId,
    title:       stringOr(body.title, undefined),
    date:        stringOr(body.date, undefined),
    time:        stringOr(body.time, undefined),
    location:    stringOr(body.location, undefined),
    description: stringOr(body.description, undefined),
    image:       stringOr(body.image, undefined),
    status:      ['published', 'draft'].includes(body.status) ? body.status : undefined,
  };

  const setClauses = [];
  const bindings = [];
  let i = 1;
  for (const [col, val] of Object.entries(updates)) {
    if (val !== undefined) {
      setClauses.push(`${col} = ?${i++}`);
      bindings.push(val);
    }
  }
  if (setClauses.length === 0) return error(400, 'No valid fields to update');

  setClauses.push(`updated_at = ?${i++}`);
  bindings.push(nowIso());
  bindings.push(id);

  await db.prepare(`UPDATE events SET ${setClauses.join(', ')} WHERE id = ?${i}`).bind(...bindings).run();
  const row = await db.prepare(`SELECT * FROM events WHERE id = ?1`).bind(id).first();
  return json({ ok: true, event: row });
});

export const onRequestDelete = wrap(async ({ params, env }) => {
  const db = requireDb(env);
  const id = params.id;
  const existing = await db.prepare(`SELECT id FROM events WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Event not found');
  await db.prepare(`DELETE FROM events WHERE id = ?1`).bind(id).run();
  return noContent();
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
