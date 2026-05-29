// POST /api/admin/upload — admin-gated R2 image upload.
//
// This endpoint does TWO things atomically:
//   1. Streams the uploaded image file into the MEDIA_BUCKET R2 bucket
//      under a randomly-keyed path: uploads/YYYY/MM/<randhex>-<safe-name>.<ext>
//   2. Inserts a media_items row pointing at it, so the file is immediately
//      attached to a section or child page just like a YouTube link would be.
//
// Why combined: the only reason to upload a bare file to this site is to use
// it as a CMS image. Forcing two round-trips (upload → create row) would only
// add a window where the R2 object exists with no DB row and no UI handle on
// it. The endpoint accepts the same metadata the admin UI already collects
// for `createMedia` (title, caption, alt, pinned, sectionId/childPageId).
//
// Request: multipart/form-data with fields:
//   file          — the image File (required)
//   sectionId     — UUID of parent section (XOR with childPageId)
//   childPageId   — UUID of parent child page (XOR with sectionId)
//   title         — optional
//   caption       — optional
//   alt           — optional alt text
//   pinned        — "true"|"false" (default false)
//   status        — "published"|"draft" (default "published")
//
// Response 200: { ok: true, media: <full media_items row including url, object_key, content_type, size> }
// Response 4xx: { error: "..." } — the admin UI surfaces this verbatim to the user
//
// Limits and validation:
//   - Allowed MIME types: image/jpeg, image/png, image/webp (NOT image/svg+xml).
//   - Max size MAX_UPLOAD_BYTES (10 MB).
//   - File extension is derived from MIME, not filename, so a "shell.png" with
//     PHP bytes still gets stored under .png — but R2 sets Content-Type from
//     what we tell it, which is the validated MIME, so the browser will never
//     execute it. We do not parse the file body.
//
// Auth: handled upstream by functions/_middleware.js. By the time this runs,
// the session cookie has been validated.

import { json, error } from '../../lib/response.js';
import { requireDb, nowIso, newId, wrap } from '../../lib/db.js';

// Keep in sync with the UI's pre-upload size check in MediaAssignmentSection.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png',  'png'],
  ['image/webp', 'webp'],
]);

export const onRequestPost = wrap(async ({ request, env }) => {
  if (!env.MEDIA_BUCKET) {
    return error(500, 'Server misconfigured: R2 binding MEDIA_BUCKET is missing.');
  }
  const db = requireDb(env);

  // Content-Type sniffing: must be multipart/form-data.
  const ct = request.headers.get('content-type') || '';
  if (!ct.toLowerCase().startsWith('multipart/form-data')) {
    return error(400, 'Förväntade multipart/form-data.');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return error(400, 'Kunde inte läsa formulärdata.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return error(400, 'Ingen fil bifogad.');
  }

  // File.type is the MIME the browser reported. We compare against the
  // allow-list. We don't parse the file body — this is a quick gate, not a
  // virus scan.
  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return error(415, 'Endast JPG, PNG och WebP stöds.');
  }

  if (file.size <= 0) {
    return error(400, 'Filen är tom.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return error(413, 'Filen är för stor.');
  }

  // Parent assignment (exactly one of sectionId or childPageId).
  const sectionId   = stringOrNull(form.get('sectionId'));
  const childPageId = stringOrNull(form.get('childPageId'));
  if (!sectionId === !childPageId) {
    return error(400, 'Ange exakt en av sectionId eller childPageId.');
  }
  if (sectionId) {
    const s = await db.prepare(`SELECT id FROM sections WHERE id = ?1`).bind(sectionId).first();
    if (!s) return error(400, 'Sektionen hittades inte.');
  }
  if (childPageId) {
    const c = await db.prepare(`SELECT id FROM child_pages WHERE id = ?1`).bind(childPageId).first();
    if (!c) return error(400, 'Undersidan hittades inte.');
  }

  // Metadata fields.
  const title   = stringOrEmpty(form.get('title'));
  const caption = stringOrEmpty(form.get('caption'));
  const alt     = stringOrEmpty(form.get('alt'));
  const pinned  = stringOrEmpty(form.get('pinned')) === 'true' ? 1 : 0;
  const statusRaw = stringOrEmpty(form.get('status'));
  const status  = ['published', 'draft'].includes(statusRaw) ? statusRaw : 'published';

  // Build a safe object key. Format: uploads/YYYY/MM/<8-hex>-<safe-stem>.<ext>
  const ext = ALLOWED_MIME.get(mime);
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm   = String(now.getUTCMonth() + 1).padStart(2, '0');
  const rand = randomHex(8);
  const stem = safeStem(file.name, ext);
  const objectKey = `uploads/${yyyy}/${mm}/${rand}-${stem}.${ext}`;

  // Upload to R2.
  // We pass the File body directly — Workers/Pages accept any BodyInit-compatible
  // value. R2 stores customMetadata as user-visible HTTP headers when served.
  try {
    await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: {
        uploadedAt: now.toISOString(),
        originalName: truncate(file.name || '', 200),
      },
    });
  } catch (err) {
    console.error('R2 put failed:', err);
    return error(502, 'Uppladdningen misslyckades. Försök igen.');
  }

  // The public URL we hand back is the in-app serving route. We keep this
  // app-relative so a future move to a custom domain only changes one place.
  const url = `/media/${objectKey}`;

  // Insert media_items row pointing at the freshly-uploaded R2 object.
  const id = `media-${newId()}`;
  const ts = nowIso();
  try {
    await db.prepare(
      `INSERT INTO media_items (
         id, section_id, child_page_id, type, url, video_id, embed_url,
         title, caption, alt, pinned, sort_order, status, context,
         object_key, content_type, size,
         created_at, updated_at
       ) VALUES (?1, ?2, ?3, 'image', ?4, NULL, NULL,
                 ?5, ?6, ?7, ?8, ?9, ?10, '',
                 ?11, ?12, ?13,
                 ?14, ?15)`
    ).bind(
      id, sectionId, childPageId, url,
      title, caption, alt, pinned, 0, status,
      objectKey, mime, file.size,
      ts, ts
    ).run();
  } catch (err) {
    // Best-effort: if the DB insert fails AFTER R2 put succeeded, clean up the
    // R2 object so we don't leak storage. Failure here is logged but the user
    // still gets a 500 — they can re-upload.
    try { await env.MEDIA_BUCKET.delete(objectKey); } catch { /* swallow */ }
    console.error('media_items insert failed after R2 put:', err);
    return error(500, 'Uppladdningen misslyckades. Försök igen.');
  }

  const row = await db.prepare(`SELECT * FROM media_items WHERE id = ?1`).bind(id).first();
  return json({
    ok: true,
    key: objectKey,
    url,
    contentType: mime,
    size: file.size,
    media: row,
  });
});

// ── helpers ─────────────────────────────────────────────────────────────────

function stringOrNull(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s : null;
}
function stringOrEmpty(v) {
  if (typeof v !== 'string') return '';
  return v.trim();
}
function truncate(s, n) {
  if (typeof s !== 'string') return '';
  return s.length <= n ? s : s.slice(0, n);
}

// Random hex used for the per-object key prefix. crypto.getRandomValues is
// available in the Workers runtime.
function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

// Slug-safe filename stem. Strips the original extension, lowercases, allows
// [a-z0-9-], collapses everything else to "-". Falls back to "image" if empty.
// Length-capped to keep the object key reasonable.
function safeStem(filename, fallbackExt) {
  let stem = String(filename || '').trim();
  // Drop existing extension(s) — match the last dot.
  stem = stem.replace(/\.[A-Za-z0-9]+$/, '');
  stem = stem.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); // strip accents
  stem = stem.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!stem) stem = `image-${fallbackExt}`;
  if (stem.length > 64) stem = stem.slice(0, 64).replace(/-+$/, '');
  return stem;
}
