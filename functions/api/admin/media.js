// POST /api/admin/media — create a media item (image OR youtube).
//
// Required body:
//   type: 'image' | 'youtube'
//   url:  string (image path/URL, or YouTube watch/short/embed URL)
//   either sectionId OR childPageId (exactly one)
//
// YouTube normalization happens here. The raw URL is preserved in
// media_items.url; the normalized form goes into video_id + embed_url.

import { json, error } from '../../lib/response.js';
import { requireDb, nowIso, newId, wrap } from '../../lib/db.js';
import { normalizeYouTubeUrl, YOUTUBE_INVALID_MESSAGE } from '../../lib/youtube.js';

export const onRequestPost = wrap(async ({ request, env }) => {
  const db = requireDb(env);
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const type = body.type === 'image' || body.type === 'youtube' ? body.type : null;
  const url  = typeof body.url === 'string' ? body.url.trim() : '';
  if (!type) return error(400, 'type must be "image" or "youtube"');
  if (!url)  return error(400, 'url is required');
  if (/[<>]/.test(url)) return error(400, 'HTML markup is not allowed — paste just the URL.');

  const section_id    = body.sectionId    ? String(body.sectionId)    : null;
  const child_page_id = body.childPageId  ? String(body.childPageId)  : null;
  if (!section_id === !child_page_id) {
    return error(400, 'Provide exactly one of sectionId or childPageId');
  }

  if (section_id) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(section_id).first();
    if (!s) return error(400, 'Section not found');
  }
  if (child_page_id) {
    const c = await db.prepare(`SELECT id FROM child_pages WHERE id = ?1`).bind(child_page_id).first();
    if (!c) return error(400, 'Child page not found');
  }

  let video_id = null;
  let embed_url = null;
  if (type === 'youtube') {
    const norm = normalizeYouTubeUrl(url);
    if (!norm) return error(400, YOUTUBE_INVALID_MESSAGE);
    video_id  = norm.videoId;
    embed_url = norm.embedUrl;
  }

  const id = `media-${newId()}`;
  const ts = nowIso();
  const status = ['published', 'draft'].includes(body.status) ? body.status : 'published';

  await db.prepare(
    `INSERT INTO media_items (
       id, section_id, child_page_id, type, url, video_id, embed_url,
       title, caption, alt, pinned, sort_order, status, context, created_at, updated_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`
  ).bind(
    id, section_id, child_page_id, type, url, video_id, embed_url,
    stringOr(body.title, ''), stringOr(body.caption, ''), stringOr(body.alt, ''),
    body.pinned ? 1 : 0,
    Number.isInteger(body.sortOrder) ? body.sortOrder : 0,
    status, stringOr(body.context, ''),
    ts, ts
  ).run();

  const row = await db.prepare(`SELECT * FROM media_items WHERE id = ?1`).bind(id).first();
  return json({ ok: true, media: row });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
