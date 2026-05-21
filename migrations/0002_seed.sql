-- Seed migration: mirrors the current src/data/seedContent.json contents.
--
-- All statements use INSERT OR IGNORE so re-running the migration after
-- the admin has edited content is a no-op (does not overwrite edits).
-- Timestamps are baked in at migration-write time.
--
-- YouTube URLs were normalized at write time:
--   raw url -> { videoId, embedUrl: 'https://www.youtube.com/embed/<id>' }
-- The original (raw) URL is preserved in media_items.url; the normalized
-- form is in media_items.video_id and media_items.embed_url.

-- ── site_settings ────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES (
  'global',
  '{"siteTitle":"Kulturföreningen Flen Världsorkester","homeIntro":"Musik, konst och kreativa mötesplatser i Amazon, Flen.","aboutText":"Kulturföreningen Flen Världsorkester driver flera verksamheter i Amazon, Flen. Det är en plats där kultur, musik, konst och textilhantverk möts. Vi är ett hem för kreativa själar, initierat av lokala eldsjälar för att skapa en inkluderande och tillgänglig mötesplats för alla.","contactInfo":{"address":"Amazon, Flen","email":"kontakt@amazonflen.se","phone":"Aktuell information uppdateras löpande."},"socialLinks":[{"platform":"Facebook","url":"https://www.facebook.com/profile.php?id=100063526774421"}]}',
  '2026-05-21T00:00:00Z'
);

-- ── sections ─────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO sections (
  id, slug, title, short_description, full_description,
  hero_media_type, cover_image, practical_info,
  sort_order, status, data, created_at, updated_at
) VALUES
  (
    '1', 'flen-varldsorkester', 'Flen Världsorkester',
    'En levande orkester som förenar musiker från hela världen.',
    'Flen Världsorkester är hjärtat av vår musikaliska gemenskap. Vi spelar musik över alla gränser och bjuder in musiker från olika bakgrunder att delta och skapa magi tillsammans. Vår orkester är öppen för alla åldrar och erfarenhetsnivåer, och vi strävar efter hög konstnärlig kvalitet och djupt lokalt engagemang.',
    'video', '/assets/fvo/alma-orkester.JPG',
    'Repetitionstider och scheman publiceras löpande. Kontakta oss gärna för att spela med!',
    0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'
  ),
  (
    '2', 'jazz-world-music-club', 'Jazz & World Music Club',
    'Din lokala scen för fantastisk jazz och världsmusik.',
    'Ett initiativ som startar våren 2025 tillsammans med Kulturföreningen Flen Världsorkester.

Vårt uppdrag är att skapa en inkluderande, tillgänglig kulturell mötesplats med hög konstnärlig kvalitet och starkt lokalt engagemang. Vi erbjuder en scen med återkommande fredagskonserter i en intim miljö med alkoholfritt utbud och ett kafé med hembakat.

För att alla ska kunna delta har vi låga entréavgifter: 100 kr för vuxna, och helt gratis entré för minderåriga och Kulturskolans elever.

Projektet genomförs i samarbete med Sparbanken, Flen kommun, Hotell Malmköping, Kulturskolan, ABF och lokala aktörer.',
    'image', '/assets/jazz/Logo.jpg',
    'Inträde:
Vuxna: 100 kr
Minderåriga & Kulturskolans elever: Gratis

Kafé med hembakat finns på plats. Alkoholfritt.
Återkommande konserter på fredagar.',
    1, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'
  ),
  (
    '3', 'malarateljen', 'Målarateljen',
    'Kursverksamhet och målarateljé med Mikael Eriksson – en plats för färg, form och eget skapande.',
    'Målarateljén erbjuder en kreativ miljö för måleri, kurser och konstnärligt utforskande. Här kan deltagare utveckla sitt bildspråk, arbeta med färg och form och ta del av Mikael Erikssons erfarenhet som konstnär och handledare. Vi inspirerar till skaparglädje och möten genom konst.',
    'image', '/assets/malarateljen/130 x 200.jpeg',
    'Kurser och öppettider uppdateras löpande. Välkommen till vår ateljé i Amazon.',
    2, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'
  ),
  (
    '4', 'textilverkstad', 'Textilverkstad',
    'En kreativ verkstad för textilt hantverk, vävning, stickning och skapande med händerna.',
    'Textilverkstaden är en plats för textilt skapande där deltagare kan arbeta med vävning, mattor, stickning och andra hantverkstekniker. Här finns möjlighet att lära sig, prova på och utveckla egna textila projekt i en varm och praktisk miljö tillsammans med andra.',
    'image', '/assets/textilverkstad/klipper.JPG',
    'Information om aktuella workshops, vävstolar och öppettider publiceras inom kort.',
    3, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'
  );

-- ── child_pages ──────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO child_pages (
  id, section_id, slug, title, short_description, body, cover_image,
  sort_order, status, data, created_at, updated_at
) VALUES (
  'cp-musaik-projektet', '1', 'musaik-projektet', 'Musaik Projektet',
  'Ett projekt inom Flen Världsorkester med fokus på skapande, gemenskap och musikaliska uttryck.',
  'Musaik Projektet är en del av Flen Världsorkesters arbete med musik, möten och lokalt engagemang. Här samlas människor genom skapande, gemenskap och musikaliska uttryck för att bygga broar.',
  NULL,
  0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'
);

-- ── media_items ──────────────────────────────────────────────────────────────

-- FVO (section "1") gallery images
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-fvo-g-1', '1', NULL, 'image', '/assets/fvo/alma-stora kören.JPG', NULL, NULL, NULL, 'Stora kören',         0, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-fvo-g-2', '1', NULL, 'image', '/assets/fvo/fvo 1_9.jpg',          NULL, NULL, NULL, 'Flen Världsorkester', 0, 1, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-fvo-g-3', '1', NULL, 'image', '/assets/fvo/fvo 20240218.jpg',     NULL, NULL, NULL, 'Uppträdande 2024',    0, 2, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- FVO (section "1") videos — pinned first
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-fvo-v-1', '1', NULL, 'youtube', 'https://www.youtube.com/embed/ZVrUFPsHRkE?si=RN8psEBjMgTFzMEx', 'ZVrUFPsHRkE', 'https://www.youtube.com/embed/ZVrUFPsHRkE', 'Flen Världsorkester - Framträdande', NULL, 1, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-fvo-v-2', '1', NULL, 'youtube', 'https://www.youtube.com/embed/Ox_E-DrKktw',                    'Ox_E-DrKktw', 'https://www.youtube.com/embed/Ox_E-DrKktw', 'Tidigare framträdande 1',           NULL, 0, 1, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-fvo-v-3', '1', NULL, 'youtube', 'https://www.youtube.com/embed/c3TGboknZU4',                    'c3TGboknZU4', 'https://www.youtube.com/embed/c3TGboknZU4', 'Tidigare framträdande 2',           NULL, 0, 2, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- Musaik child page media
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-musaik-v-1', NULL, 'cp-musaik-projektet', 'youtube', 'https://www.youtube.com/embed/BKRG0QnnBLM?si=a0dr6DGTFQ0jI8k1', 'BKRG0QnnBLM', 'https://www.youtube.com/embed/BKRG0QnnBLM', 'Musaik Projektet', NULL, 1, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-musaik-g-1', NULL, 'cp-musaik-projektet', 'image',   '/assets/musaik/fvo f&k publik.jpeg',                              NULL,           NULL,                                          NULL,               'Publikbild',           0, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-musaik-g-2', NULL, 'cp-musaik-projektet', 'image',   '/assets/musaik/MUSAIK-stränger.jpg',                              NULL,           NULL,                                          NULL,               'Musaik Stränger',      0, 1, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-musaik-g-3', NULL, 'cp-musaik-projektet', 'image',   '/assets/musaik/lutte-orkester.JPG',                               NULL,           NULL,                                          NULL,               'Lutte med orkestern',  0, 2, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- Jazz (section "2") gallery
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-jazz-g-1', '2', NULL, 'image', '/assets/jazz/Affisch 10 april.jpg', NULL, NULL, NULL, 'Affisch 10 april', 0, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- Målarateljen (section "3") gallery + video
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-mal-g-1', '3', NULL, 'image',   '/assets/malarateljen/135x200.jpeg', NULL,          NULL,                                          NULL,           'Tavla', 0, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-mal-g-2', '3', NULL, 'image',   '/assets/malarateljen/81x67.jpeg',   NULL,          NULL,                                          NULL,           'Tavla', 0, 1, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-mal-g-3', '3', NULL, 'image',   '/assets/malarateljen/140x200.jpeg', NULL,          NULL,                                          NULL,           'Tavla', 0, 2, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z'),
  ('m-mal-v-1', '3', NULL, 'youtube', 'https://youtu.be/ZVrUFPsHRkE?si=-U9iLR30h_GKTaVH', 'ZVrUFPsHRkE', 'https://www.youtube.com/embed/ZVrUFPsHRkE', 'Målarateljen', NULL, 1, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- Textilverkstad (section "4") gallery
INSERT OR IGNORE INTO media_items (id, section_id, child_page_id, type, url, video_id, embed_url, title, caption, pinned, sort_order, status, context, created_at, updated_at) VALUES
  ('m-tex-g-1', '4', NULL, 'image', '/assets/textilverkstad/Gruppbild.JPG', NULL, NULL, NULL, 'Deltagare', 0, 0, 'published', NULL, '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z');

-- ── news ─────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO news (id, section_id, title, date, excerpt, body, image, status, created_at, updated_at) VALUES (
  'news-1', '2',
  'Jazz & World Music Club öppnar våren 2025',
  '2025-01-15',
  'Vi förbereder för fullt inför premiären av vår nya klubbscen i Amazon.',
  'Till våren 2025 slår vi upp portarna för Jazz & World Music Club. Det blir återkommande fredagskonserter, hembakat fika och fantastisk musik till väldigt låga priser (och gratis för unga!). Håll utkik här för det fullständiga programmet.',
  '',
  'published',
  '2025-01-15T00:00:00Z', '2025-01-15T00:00:00Z'
);

-- ── events ───────────────────────────────────────────────────────────────────
-- (none in seed)
