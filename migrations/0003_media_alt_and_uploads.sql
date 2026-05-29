-- Migration 0003 — media_items extensions.
--
-- Adds:
--   alt           — accessibility alt text (separate from caption)
--   object_key    — R2 object key for self-hosted uploaded images, e.g.
--                   "uploads/2026/05/abc-foo.jpg". NULL for YouTube items and
--                   for legacy /assets/... images (whose URL stays in `url`).
--   content_type  — MIME of the uploaded R2 object (e.g. image/webp).
--   size          — byte size of the uploaded R2 object.
--
-- We deliberately do NOT remove or rename existing columns. Existing rows
-- continue to work — they just have NULL in the new columns.
--
-- SQLite/D1 ALTER TABLE is single-column-at-a-time. IF NOT EXISTS is supported
-- by D1's SQLite for ADD COLUMN since 2024-08, but we keep it explicit/idempotent
-- by guarding each one with a separate statement — D1 will no-op rather than
-- error if the column already exists in newer SQLite.

ALTER TABLE media_items ADD COLUMN alt          TEXT;
ALTER TABLE media_items ADD COLUMN object_key   TEXT;
ALTER TABLE media_items ADD COLUMN content_type TEXT;
ALTER TABLE media_items ADD COLUMN size         INTEGER;

-- Helpful when we ever want to garbage-collect orphan R2 objects, or
-- to look up a media row by its R2 key from the /media/[key] serving route.
CREATE INDEX IF NOT EXISTS idx_media_object_key ON media_items(object_key);
