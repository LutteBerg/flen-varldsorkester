// Content repository — the public face of the CMS for React code.
//
// Adapter selection:
//   - import.meta.env.PROD === true  -> ApiAdapter (calls /api/content + /api/admin/*)
//   - import.meta.env.VITE_USE_API === 'true' -> ApiAdapter (full-stack local dev via `wrangler pages dev`)
//   - otherwise (dev default)        -> SeedAdapter (reads src/data/seedContent.json, read-only)
//
// SeedAdapter mutations throw — dev mode is intentionally read-only. To test
// the real backend locally, build then run:
//   npm run build && npx wrangler pages dev dist --d1 DB=lutte-berg-cms-local
//
// All write operations target /api/admin/* and require a valid HttpOnly
// session cookie set by /api/admin/login (auth lives in functions/_middleware.js).

import { ApiAdapter } from './adapters/apiAdapter';
import { SeedAdapter } from './adapters/seedAdapter';

const useApi = import.meta.env.PROD || import.meta.env.VITE_USE_API === 'true';
const adapter = useApi ? new ApiAdapter() : new SeedAdapter();

export const contentRepository = {
  // Bulk
  getContent:       () => adapter.getContent(),
  getAdminContent:  () => adapter.getAdminContent(),

  // Global
  getGlobalContent:    () => adapter.getGlobalContent(),
  updateGlobalContent: (content) => adapter.updateGlobalContent(content),

  // Sections
  getSections:       () => adapter.getSections(),
  getSectionBySlug:  (slug) => adapter.getSectionBySlug(slug),
  updateSection:     (id, updates) => adapter.updateSection(id, updates),

  // Child pages
  createChildPage: (item) => adapter.createChildPage(item),
  updateChildPage: (id, updates) => adapter.updateChildPage(id, updates),
  deleteChildPage: (id) => adapter.deleteChildPage(id),

  // News
  getNews:    () => adapter.getNews(),
  createNews: (item) => adapter.createNews(item),
  updateNews: (id, updates) => adapter.updateNews(id, updates),
  deleteNews: (id) => adapter.deleteNews(id),

  // Events
  getEvents:    () => adapter.getEvents(),
  createEvent:  (item) => adapter.createEvent(item),
  updateEvent:  (id, updates) => adapter.updateEvent(id, updates),
  deleteEvent:  (id) => adapter.deleteEvent(id),

  // Media (images + youtube)
  createMedia: (item) => adapter.createMedia(item),
  updateMedia: (id, updates) => adapter.updateMedia(id, updates),
  deleteMedia: (id) => adapter.deleteMedia(id),

  // Section-scoped helpers (used by Section/NewsList/EventList pages)
  getNewsBySection: async (sectionId) => {
    const all = await adapter.getNews();
    return all.filter(n => n.sectionId === sectionId || n.sectionId === null);
  },
  getEventsBySection: async (sectionId) => {
    const all = await adapter.getEvents();
    return all.filter(e => e.sectionId === sectionId || e.sectionId === null);
  },

  // Mode flag for UI banners ("Sparar lokalt — read-only" in dev)
  isReadOnly: () => adapter.isReadOnly === true,
};
