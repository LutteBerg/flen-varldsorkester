-- Migration 0004 — let news + events belong to a child page, not just a
-- top-level section. Musaik is a child page under FVO; Lutte wants to be
-- able to publish news/events that show up specifically on Musaik, not
-- on the parent section page.
--
-- Backwards-compatible:
--   * `section_id` stays. Existing rows continue to work and render on
--     their section's page exactly as before.
--   * `child_page_id` is NEW, NULLABLE. When set, the row is "owned" by
--     that child page; the public API will show it on the child page
--     and exclude it from the parent section's news/events list.
--
-- The XOR rule (exactly one of section_id, child_page_id) is enforced
-- at the application layer, not via CHECK, because D1 can't easily add
-- a CHECK constraint via ALTER TABLE.

ALTER TABLE news   ADD COLUMN child_page_id TEXT REFERENCES child_pages(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN child_page_id TEXT REFERENCES child_pages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_news_child   ON news(child_page_id);
CREATE INDEX IF NOT EXISTS idx_events_child ON events(child_page_id);
