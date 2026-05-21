// PUT /api/admin/media/:id  — update a media item
// DELETE /api/admin/media/:id  — delete a media item

import { json, error, noContent } from '../../../lib/response.js';
import { requireDb, nowIso, wrap } from '../../../lib/db.js';
import { normalizeYouTubeUrl, YOUTUBE_INVALID_MESSAGE } from '../../../lib/youtube.js';

export const onRequestPut = wrap(async ({ params, request, env }) => {
  const db = requireDb(env);
  const id = params.id;
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  const existing = await db.prepare(`SELECT * FROM media_items WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Media item not found');

  // If URL is being updated and type is youtube, re-normalize.
  let nextUrl = existing.url;
  let nextVideoId = existing.video_id;
  let nextEmbedUrl = existing.embed_url;
  const nextType = body.type === 'image' || body.type === 'youtube' ? body.type : existing.type;

  if (typeof body.url === 'string') {
    const raw = body.url.trim();
    if (!raw) return error(400, 'url cannot be empty');
    if (/[<>]/.test(raw)) return error(400, 'HTML markup is not allowed — paste just the URL.');
    nextUrl = raw;
  }

  if (nextType === 'youtube') {
    const norm = normalizeYouTubeUrl(nextUrl);
    if (!norm) return error(400, YOUTUBE_INVALID_MESSAGE);
    nextVideoId = norm.videoId;
    nextEmbedUrl = norm.embedUrl;
  } else if (nextType === 'image') {
    nextVideoId = null;
    nextEmbedUrl = null;
  }

  const updates = {
    type:       nextType !== existing.type ? nextType : undefined,
    url:        nextUrl !== existing.url ? nextUrl : undefined,
    video_id:   nextVideoId !== existing.video_id ? nextVideoId : undefined,
    embed_url:  nextEmbedUrl !== existing.embed_url ? nextEmbedUrl : undefined,
    title:      stringOr(body.title, undefined),
    caption:    stringOr(body.caption, undefined),
    pinned:     typeof body.pinned === 'boolean' ? (body.pinned ? 1 : 0) : undefined,
    sort_order: Number.isInteger(body.sortOrder) ? body.sortOrder : undefined,
    status:     ['published', 'draft'].includes(body.status) ? body.status : undefined,
    context:    stringOr(body.context, undefined),
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

  await db.prepare(`UPDATE media_items SET ${setClauses.join(', ')} WHERE id = ?${i}`).bind(...bindings).run();
  const row = await db.prepare(`SELECT * FROM media_items WHERE id = ?1`).bind(id).first();
  return json({ ok: true, media: row });
});

export const onRequestDelete = wrap(async ({ params, env }) => {
  const db = requireDb(env);
  const id = params.id;
  const existing = await db.prepare(`SELECT id FROM media_items WHERE id = ?1`).bind(id).first();
  if (!existing) return error(404, 'Media item not found');
  await db.prepare(`DELETE FROM media_items WHERE id = ?1`).bind(id).run();
  return noContent();
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
