// POST /api/admin/news — create a news item.

import { json, error } from '../../lib/response.js';
import { requireDb, nowIso, newId, wrap } from '../../lib/db.js';

export const onRequestPost = wrap(async ({ request, env }) => {
  const db = requireDb(env);
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const title = stringOr(body.title, null);
  const date = stringOr(body.date, null);
  if (!title || !date) return error(400, 'title and date are required');

  const section_id = body.sectionId ? String(body.sectionId) : null;
  if (section_id) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(section_id).first();
    if (!s) return error(400, 'Section not found');
  }

  const id = `news-${newId()}`;
  const ts = nowIso();
  const status = ['published', 'draft'].includes(body.status) ? body.status : 'draft';

  await db.prepare(
    `INSERT INTO news (id, section_id, title, date, excerpt, body, image, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(
    id, section_id, title, date,
    stringOr(body.excerpt, ''), stringOr(body.body, ''),
    stringOr(body.image, ''), status, ts, ts
  ).run();

  const row = await db.prepare(`SELECT * FROM news WHERE id = ?1`).bind(id).first();
  return json({ ok: true, news: row });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
