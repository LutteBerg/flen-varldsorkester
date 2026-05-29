// SeedAdapter — dev-only, read-only fallback.
//
// Loads src/data/seedContent.json synchronously (Vite tree-shakes the import
// out of production bundles since `useApi` is true in PROD and this adapter
// is never instantiated).
//
// Every mutation throws so devs immediately see the read-only nature of
// dev mode. To test mutations locally, run the full stack via
// `npx wrangler pages dev dist` after `npm run build`, with VITE_USE_API=true.

import seedContent from '../../../data/seedContent.json';

function readOnlyError() {
  return new Error(
    'Dev mode (SeedAdapter) is read-only. To test admin writes locally, ' +
    'run `npm run build && npx wrangler pages dev dist --d1 DB=lutte-berg-cms-local` ' +
    'with VITE_USE_API=true.'
  );
}

// Adapt the seed JSON shape (which still has nested galleryImages/videos) into
// the same flat structure the ApiAdapter returns, so React code doesn't care
// which adapter is behind it.
function buildSnapshot() {
  const sections = (seedContent.sections || []).map(s => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    shortDescription: s.shortDescription || '',
    fullDescription: s.fullDescription || '',
    heroMediaType: s.heroMediaType || 'image',
    coverImage: s.coverImage || '',
    practicalInfo: s.practicalInfo || '',
    galleryImages: (s.galleryImages || []).map((img, idx) => ({
      id: `seed-${s.id}-img-${idx}`,
      src: img.src,
      caption: img.caption || '',
      pinned: false,
      sortOrder: idx,
      status: 'published',
    })),
    videos: (s.videos || []).map((v, idx) => {
      // Match the API-side normalization: store the raw URL as `url` and the
      // CANONICAL `https://www.youtube.com/embed/<id>` as `embedUrl`. The seed
      // JSON contains URLs like `embed/<id>?si=...` and `youtu.be/<id>?si=...`;
      // if we passed `v.url` straight through as `embedUrl`, downstream code
      // that concatenated `?autoplay=1` would produce a `?si=...?autoplay=1`
      // double-`?` and YouTube would silently drop autoplay/mute. Dev parity
      // with prod = same canonical form here as `functions/lib/youtube.js`.
      const vid = extractVideoId(v.url);
      return {
        id: `seed-${s.id}-vid-${idx}`,
        url: v.url,
        videoId: vid,
        embedUrl: vid ? `https://www.youtube.com/embed/${vid}` : v.url,
        title: v.title || '',
        pinned: !!v.pinned,
        sortOrder: idx,
        status: 'published',
        context: v.context || '',
      };
    }),
    childPages: (s.childPages || []).map((c, ci) => ({
      id: `seed-${s.id}-child-${ci}`,
      sectionId: s.id,
      slug: c.slug,
      title: c.title,
      shortDescription: c.shortDescription || '',
      body: c.body || '',
      coverImage: '',
      sortOrder: ci,
      status: 'published',
      galleryImages: (c.galleryImages || []).map((img, idx) => ({
        id: `seed-${s.id}-child-${ci}-img-${idx}`,
        src: img.src,
        caption: img.caption || '',
        pinned: false,
        sortOrder: idx,
        status: 'published',
      })),
      videos: (c.videos || []).map((v, idx) => {
        // See note on parent .videos above — same canonical normalization.
        const vid = extractVideoId(v.url);
        return {
          id: `seed-${s.id}-child-${ci}-vid-${idx}`,
          url: v.url,
          videoId: vid,
          embedUrl: vid ? `https://www.youtube.com/embed/${vid}` : v.url,
          title: v.title || '',
          pinned: !!v.pinned,
          sortOrder: idx,
          status: 'published',
          context: v.context || '',
        };
      }),
    })),
    status: 'published',
  }));

  return {
    global: { ...seedContent.global },
    sections,
    news:   (seedContent.news   || []),
    events: (seedContent.events || []),
  };
}

function extractVideoId(url) {
  if (typeof url !== 'string') return null;
  let m = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

export class SeedAdapter {
  constructor() {
    this.isReadOnly = true;
    this._snapshot = buildSnapshot();
  }

  async getContent() { return this._snapshot; }
  async getAdminContent() { return this._snapshot; }

  async getGlobalContent() { return this._snapshot.global; }
  async getSections()      { return this._snapshot.sections; }
  async getSectionBySlug(slug) { return this._snapshot.sections.find(s => s.slug === slug); }
  async getNews()   { return this._snapshot.news; }
  async getEvents() { return this._snapshot.events; }

  // All mutations are no-ops that throw.
  async updateGlobalContent() { throw readOnlyError(); }
  async updateSection()       { throw readOnlyError(); }
  async createChildPage()     { throw readOnlyError(); }
  async updateChildPage()     { throw readOnlyError(); }
  async deleteChildPage()     { throw readOnlyError(); }
  async createNews()          { throw readOnlyError(); }
  async updateNews()          { throw readOnlyError(); }
  async deleteNews()          { throw readOnlyError(); }
  async createEvent()         { throw readOnlyError(); }
  async updateEvent()         { throw readOnlyError(); }
  async deleteEvent()         { throw readOnlyError(); }
  async createMedia()         { throw readOnlyError(); }
  async updateMedia()         { throw readOnlyError(); }
  async deleteMedia()         { throw readOnlyError(); }
}
