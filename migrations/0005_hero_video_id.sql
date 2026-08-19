-- 0005 — explicit hero video per section / child page.
--
-- Until now the video at the TOP of a page was picked implicitly: any video
-- flagged `pinned` (a checkbox labelled "Fäst överst" in the media list) took
-- over the hero, and on child pages simply the FIRST video did. That made the
-- gallery and the top of the page share one control: adding a YouTube link to
-- the gallery silently replaced the header of the page.
--
-- After this migration the two are separate concerns:
--   sections.hero_video_id / child_pages.hero_video_id  -> the top of the page
--   media_items.pinned                                  -> "show first in the gallery"
--
-- ADD COLUMN is additive: existing rows get NULL and older code ignores it.

ALTER TABLE sections ADD COLUMN hero_video_id TEXT;
ALTER TABLE child_pages ADD COLUMN hero_video_id TEXT;

-- Backfill so nothing changes visually: record the video each page is showing
-- at the top RIGHT NOW, using the old implicit rule (pinned first, then the
-- lowest sort_order). Sections set to a photo hero intentionally stay NULL.
UPDATE sections
   SET hero_video_id = (
     SELECT m.id FROM media_items m
      WHERE m.section_id = sections.id
        AND m.type = 'youtube'
        AND m.status = 'published'
      ORDER BY m.pinned DESC, m.sort_order ASC, m.created_at DESC
      LIMIT 1
   )
 WHERE hero_media_type = 'video';

UPDATE child_pages
   SET hero_video_id = (
     SELECT m.id FROM media_items m
      WHERE m.child_page_id = child_pages.id
        AND m.type = 'youtube'
        AND m.status = 'published'
      ORDER BY m.pinned DESC, m.sort_order ASC, m.created_at DESC
      LIMIT 1
   );
