// Shared bulk-fetch builder used by both the public and admin content endpoints.
//
// publishedOnly=true (public)  -> excludes draft sections, child pages, news, events,
//                                 and draft media items.
// publishedOnly=false (admin)  -> returns everything.

export async function buildContentSnapshot(db, { publishedOnly }) {
  const statusFilter = publishedOnly ? "status = 'published'" : "1=1";

  const [
    settingsRes,
    sectionsRes,
    childPagesRes,
    mediaRes,
    newsRes,
    eventsRes,
  ] = await Promise.all([
    db.prepare(`SELECT key, value FROM site_settings WHERE key = 'global' LIMIT 1`).all(),
    db.prepare(`SELECT * FROM sections WHERE ${statusFilter} ORDER BY sort_order ASC, created_at ASC`).all(),
    db.prepare(`SELECT * FROM child_pages WHERE ${statusFilter} ORDER BY sort_order ASC, created_at ASC`).all(),
    db.prepare(`SELECT * FROM media_items WHERE ${statusFilter} ORDER BY pinned DESC, sort_order ASC, created_at DESC`).all(),
    db.prepare(`SELECT * FROM news ${publishedOnly ? `WHERE status = 'published'` : ''} ORDER BY date DESC, created_at DESC`).all(),
    db.prepare(`SELECT * FROM events ${publishedOnly ? `WHERE status = 'published'` : ''} ORDER BY date ASC, time ASC`).all(),
  ]);

  let global = {
    siteTitle: '',
    homeIntro: '',
    aboutText: '',
    contactInfo: { address: '', email: '', phone: '' },
    socialLinks: [],
  };
  if (settingsRes.results && settingsRes.results.length > 0) {
    try {
      global = { ...global, ...JSON.parse(settingsRes.results[0].value) };
    } catch (_) { /* keep defaults */ }
  }

  const mediaForSection = (sectionId, type) =>
    (mediaRes.results || []).filter(m => m.section_id === sectionId && m.type === type);
  const mediaForChild = (childId, type) =>
    (mediaRes.results || []).filter(m => m.child_page_id === childId && m.type === type);

  const childPagesBySection = new Map();
  for (const cp of (childPagesRes.results || [])) {
    const list = childPagesBySection.get(cp.section_id) || [];
    list.push({
      id: cp.id,
      sectionId: cp.section_id,
      slug: cp.slug,
      title: cp.title,
      shortDescription: cp.short_description || '',
      body: cp.body || '',
      coverImage: cp.cover_image || '',
      sortOrder: cp.sort_order,
      status: cp.status,
      galleryImages: mediaForChild(cp.id, 'image').map(toGalleryImage),
      videos: mediaForChild(cp.id, 'youtube').map(toVideo),
    });
    childPagesBySection.set(cp.section_id, list);
  }

  const sections = (sectionsRes.results || []).map(s => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    shortDescription: s.short_description || '',
    fullDescription: s.full_description || '',
    heroMediaType: s.hero_media_type || 'image',
    coverImage: s.cover_image || '',
    practicalInfo: s.practical_info || '',
    sortOrder: s.sort_order,
    status: s.status,
    galleryImages: mediaForSection(s.id, 'image').map(toGalleryImage),
    videos: mediaForSection(s.id, 'youtube').map(toVideo),
    childPages: childPagesBySection.get(s.id) || [],
  }));

  const news = (newsRes.results || []).map(n => ({
    id: n.id,
    title: n.title,
    date: n.date,
    sectionId: n.section_id,
    // Migration 0004 adds child_page_id to news/events. When this column
    // is populated the row "belongs to" that child page and not the
    // section directly. The public site filters accordingly.
    childPageId: n.child_page_id || null,
    excerpt: n.excerpt || '',
    body: n.body || '',
    image: n.image || '',
    status: n.status,
  }));

  const events = (eventsRes.results || []).map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    time: e.time || '',
    location: e.location || '',
    description: e.description || '',
    sectionId: e.section_id,
    childPageId: e.child_page_id || null,
    image: e.image || '',
    status: e.status,
  }));

  return { global, sections, news, events };
}

function toGalleryImage(m) {
  return {
    id: m.id,
    src: m.url,
    caption: m.caption || '',
    title: m.title || '',
    alt: m.alt || '',
    pinned: !!m.pinned,
    sortOrder: m.sort_order,
    status: m.status,
    // R2-upload metadata (NULL for legacy /assets/... images).
    objectKey: m.object_key || null,
    contentType: m.content_type || null,
    size: typeof m.size === 'number' ? m.size : null,
  };
}

function toVideo(m) {
  return {
    id: m.id,
    url: m.url,
    videoId: m.video_id,
    embedUrl: m.embed_url,
    title: m.title || '',
    caption: m.caption || '',
    alt: m.alt || '',
    pinned: !!m.pinned,
    sortOrder: m.sort_order,
    status: m.status,
    context: m.context || '',
  };
}
