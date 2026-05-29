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

  // Either a section OR a child page (or neither — global news). When a
  // child page is supplied we also derive its parent section_id for
  // consistency, so sectionId always points at the top-level page even
  // when the row is scoped to a child.
  let section_id  = body.sectionId   ? String(body.sectionId)   : null;
  let child_page_id = body.childPageId ? String(body.childPageId) : null;
  if (child_page_id) {
    const cp = await db.prepare(`SELECT id, section_id FROM child_pages WHERE id = ?1`).bind(child_page_id).first();
    if (!cp) return error(400, 'Child page not found');
    section_id = cp.section_id; // override — child page authoritative
  } else if (section_id) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(section_id).first();
    if (!s) return error(400, 'Section not found');
  }

  const id = `news-${newId()}`;
  const ts = nowIso();
  const status = ['published', 'draft'].includes(body.status) ? body.status : 'draft';

  await db.prepare(
    `INSERT INTO news (id, section_id, child_page_id, title, date, excerpt, body, image, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(
    id, section_id, child_page_id, title, date,
    stringOr(body.excerpt, ''), stringOr(body.body, ''),
    stringOr(body.image, ''), status, ts, ts
  ).run();

  const row = await db.prepare(`SELECT * FROM news WHERE id = ?1`).bind(id).first();
  return json({ ok: true, news: row });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
