// ApiAdapter — talks to Pages Functions over /api/*.
//
// Reads:
//   GET /api/content              public, published only
//   GET /api/admin/content        all incl. drafts (requires cookie)
//
// Writes: all under /api/admin/* with credentials:'include' so the
// HttpOnly session cookie is sent.

// How long a public snapshot is trusted before a route mount refetches it.
//
// Background: the snapshot used to be cached in memory for the whole
// lifetime of the tab. An editor who published something in the admin and
// then clicked "Tillbaka till webbplatsen" (a client-side route change —
// no page reload) kept seeing the content from when the tab was first
// opened, sometimes hours old, and concluded that publishing was broken.
// With a short TTL, any navigation after the TTL re-fetches /api/content,
// so freshly published items appear within a minute.
const PUBLIC_SNAPSHOT_TTL_MS = 60_000;

// How old an embedded bootstrap may be before we distrust it entirely.
//
// The PWA service worker precaches index.html — including the
// __PUBLIC_CONTENT__ script the middleware injected at SW-install time —
// and then serves that frozen shell for every navigation until the next
// deploy. So "the bootstrap was injected server-side" does NOT mean "the
// bootstrap is fresh". The middleware stamps the payload with
// __bootstrappedAt (see functions/seo/render.js); if the stamp is older
// than the server-side snapshot cache TTL (300 s) — or missing, as in any
// pre-stamp cached shell — the bootstrap is only used as a placeholder
// and the first content read refetches /api/content (which the SW never
// caches).
const BOOTSTRAP_MAX_AGE_MS = 300_000;

export class ApiAdapter {
  constructor() {
    this.isReadOnly = false;
    const bootstrap = readPublicContentBootstrap();
    this._fetchedAt = bootstrapFetchedAt(bootstrap);
    if (bootstrap) delete bootstrap.__bootstrappedAt;
    this._publicSnapshot = bootstrap;
    this._publicPromise = null;
  }

  _isStale() {
    return (Date.now() - this._fetchedAt) > PUBLIC_SNAPSHOT_TTL_MS;
  }

  async _public() {
    if (this._publicSnapshot && !this._isStale()) return this._publicSnapshot;
    if (!this._publicPromise) {
      this._publicPromise = fetch('/api/content', { credentials: 'same-origin' })
        .then(async (r) => {
          if (!r.ok) throw new Error(`/api/content returned ${r.status}`);
          this._publicSnapshot = await r.json();
          this._fetchedAt = Date.now();
          return this._publicSnapshot;
        })
        .catch((err) => {
          // Refresh failed (offline, server hiccup). If we still hold an
          // older snapshot, serve that instead of breaking the page; the
          // next navigation will try again since _fetchedAt is unchanged.
          if (this._publicSnapshot) return this._publicSnapshot;
          throw err;
        })
        .finally(() => { this._publicPromise = null; });
    }
    return this._publicPromise;
  }

  _invalidate() {
    this._publicSnapshot = null;
    this._fetchedAt = 0;
    this._publicPromise = null;
  }

  async getContent() { return this._public(); }

  async getAdminContent() {
    const r = await fetch('/api/admin/content', { credentials: 'include' });
    if (r.status === 401) throw new UnauthorizedError();
    if (!r.ok) throw new Error(`/api/admin/content returned ${r.status}`);
    return r.json();
  }

  async getGlobalContent() { return (await this._public()).global; }
  async getSections()      { return (await this._public()).sections; }
  peekContent()             { return this._publicSnapshot; }
  peekGlobalContent()       { return this._publicSnapshot?.global || null; }
  peekSections()            { return this._publicSnapshot?.sections || null; }
  async getSectionBySlug(slug) {
    return (await this._public()).sections.find(s => s.slug === slug);
  }
  async getNews()   { return (await this._public()).news; }
  async getEvents() { return (await this._public()).events; }

  async updateGlobalContent(content) {
    const out = await adminFetch('/api/admin/site-settings', { method: 'PUT', body: JSON.stringify(content) });
    this._invalidate();
    return out.value;
  }

  async updateSection(id, updates) {
    const out = await adminFetch(`/api/admin/sections/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
    this._invalidate();
    return out.section;
  }

  async createChildPage(item) {
    const out = await adminFetch('/api/admin/child-pages', { method: 'POST', body: JSON.stringify(item) });
    this._invalidate();
    return out.childPage;
  }
  async updateChildPage(id, updates) {
    const out = await adminFetch(`/api/admin/child-pages/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
    this._invalidate();
    return out.childPage;
  }
  async deleteChildPage(id) {
    await adminFetch(`/api/admin/child-pages/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this._invalidate();
    return true;
  }

  async createNews(item) {
    const out = await adminFetch('/api/admin/news', { method: 'POST', body: JSON.stringify(item) });
    this._invalidate();
    return out.news;
  }
  async updateNews(id, updates) {
    const out = await adminFetch(`/api/admin/news/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
    this._invalidate();
    return out.news;
  }
  async deleteNews(id) {
    await adminFetch(`/api/admin/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this._invalidate();
    return true;
  }

  async createEvent(item) {
    const out = await adminFetch('/api/admin/events', { method: 'POST', body: JSON.stringify(item) });
    this._invalidate();
    return out.event;
  }
  async updateEvent(id, updates) {
    const out = await adminFetch(`/api/admin/events/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
    this._invalidate();
    return out.event;
  }
  async deleteEvent(id) {
    await adminFetch(`/api/admin/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this._invalidate();
    return true;
  }

  async createMedia(item) {
    const out = await adminFetch('/api/admin/media', { method: 'POST', body: JSON.stringify(item) });
    this._invalidate();
    return out.media;
  }
  async updateMedia(id, updates) {
    const out = await adminFetch(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(updates) });
    this._invalidate();
    return out.media;
  }
  async deleteMedia(id) {
    await adminFetch(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
    this._invalidate();
    return true;
  }

  // Upload an image file via multipart/form-data. The endpoint stores the
  // file in R2 and inserts a media_items row in one step.
  //   meta = { sectionId | childPageId, title?, caption?, alt?, pinned?, status?, onProgress? }
  // We use XMLHttpRequest instead of fetch because fetch lacks upload
  // progress events across all current browsers.
  async uploadMedia(file, meta = {}) {
    const fd = new FormData();
    fd.set('file', file, file.name);
    if (meta.sectionId)   fd.set('sectionId',   String(meta.sectionId));
    if (meta.childPageId) fd.set('childPageId', String(meta.childPageId));
    if (meta.title   != null) fd.set('title',   String(meta.title));
    if (meta.caption != null) fd.set('caption', String(meta.caption));
    if (meta.alt     != null) fd.set('alt',     String(meta.alt));
    if (meta.pinned)          fd.set('pinned',  'true');
    if (meta.status)          fd.set('status',  String(meta.status));

    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/upload');
      xhr.withCredentials = true;
      if (typeof meta.onProgress === 'function') {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && e.total > 0) {
            meta.onProgress(Math.min(1, e.loaded / e.total));
          }
        });
      }
      xhr.onerror = () => reject(new Error('Uppladdningen misslyckades. Försök igen.'));
      xhr.onload = () => {
        if (xhr.status === 401) {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
            window.location.assign('/admin/login');
          }
          reject(new UnauthorizedError());
          return;
        }
        let payload = null;
        try { payload = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload || {});
        } else {
          const msg = (payload && payload.error) ? payload.error : 'Uppladdningen misslyckades. Försök igen.';
          reject(new Error(msg));
        }
      };
      xhr.send(fd);
    });

    this._invalidate();
    return data;
  }
}

export function parsePublicContentBootstrap(value) {
  if (!value) return null;
  try {
    const snapshot = JSON.parse(value);
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
  } catch {
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor() { super('Not authenticated'); this.name = 'UnauthorizedError'; }
}

async function adminFetch(path, options = {}) {
  const r = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (r.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
      window.location.assign('/admin/login');
    }
    throw new UnauthorizedError();
  }
  if (r.status === 204) return {};
  let data = null;
  try { data = await r.json(); } catch { /* no body */ }
  if (!r.ok) {
    const msg = (data && data.error) ? data.error : `Request to ${path} failed (${r.status})`;
    if (typeof console !== 'undefined') console.error(`adminFetch ${path} ${r.status}`, data);
    throw new Error(msg);
  }
  return data || {};
}

function readPublicContentBootstrap() {
  if (typeof document === 'undefined') return null;
  return parsePublicContentBootstrap(
    document.getElementById('__PUBLIC_CONTENT__')?.textContent,
  );
}

// Decide what _fetchedAt a bootstrap snapshot deserves. Returns `now` when
// the middleware's __bootstrappedAt stamp is present and recent (a live
// server render), and 0 (= already stale, refetch on first read) when the
// stamp is missing or old — the signature of a service-worker-replayed
// shell. Exported for tests.
export function bootstrapFetchedAt(snapshot, now = Date.now()) {
  if (!snapshot) return 0;
  const stamp = Date.parse(snapshot.__bootstrappedAt || '');
  if (Number.isNaN(stamp)) return 0;
  return Math.abs(now - stamp) <= BOOTSTRAP_MAX_AGE_MS ? now : 0;
}
