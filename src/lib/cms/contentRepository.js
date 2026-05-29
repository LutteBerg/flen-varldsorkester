// Content repository — the public face of the CMS for React code.
//
// Adapter selection:
//   - import.meta.env.PROD === true            -> ApiAdapter
//   - import.meta.env.VITE_USE_API === 'true'  -> ApiAdapter (full-stack local dev)
//   - otherwise (dev default)                  -> SeedAdapter (read-only)
//
// SeedAdapter mutations throw — dev mode is intentionally read-only.

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
  // uploadMedia is only present on ApiAdapter (SeedAdapter has no R2). We
  // throw a clear message instead of letting the call silently no-op.
  uploadMedia: (file, meta) => {
    if (typeof adapter.uploadMedia !== 'function') {
      return Promise.reject(new Error('Uppladdning är endast tillgänglig i produktion (eller `wrangler pages dev`).'));
    }
    return adapter.uploadMedia(file, meta);
  },

  // Section-scoped helpers (used by Section/NewsList/EventList pages).
  getNewsBySection: async (sectionId) => {
    const all = await adapter.getNews();
    return all.filter(n => n.sectionId === sectionId || n.sectionId === null);
  },
  getEventsBySection: async (sectionId) => {
    const all = await adapter.getEvents();
    return all.filter(e => e.sectionId === sectionId || e.sectionId === null);
  },

  // Mode flag for UI banners ("Sparar lokalt — read-only" in dev).
  isReadOnly: () => adapter.isReadOnly === true,
};
