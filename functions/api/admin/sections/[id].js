// PUT /api/admin/sections/:id  — update an existing section (text + hero).
// Sections are not created/deleted via the API; the 4 sections are fixed by design.

import { json, error } from '../../../lib/response.js';
import { requireDb, nowIso, wrap } from '../../../lib/db.js';

export const onRequestPut = wrap(async ({ params, request, env }) => {
  const db = requireDb(env);
  const id = params.id;
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const existing = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Section not found');

  const updates = {
    title:             stringOr(body.title, null),
    short_description: stringOr(body.shortDescription, null),
    full_description:  stringOr(body.fullDescription, null),
    hero_media_type:   ['image', 'video'].includes(body.heroMediaType) ? body.heroMediaType : null,
    cover_image:       stringOr(body.coverImage, null),
    practical_info:    stringOr(body.practicalInfo, null),
    sort_order:        Number.isInteger(body.sortOrder) ? body.sortOrder : null,
    status:            ['published', 'draft'].includes(body.status) ? body.status : null,
  };

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

  await db.prepare(`UPDATE sections SET ${setClauses.join(', ')} WHERE id = ?${i}`).bind(...bindings).run();

  const row = await db.prepare(`SELECT * FROM sections WHERE id = ?1`).bind(id).first();
  return json({ ok: true, section: row });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
