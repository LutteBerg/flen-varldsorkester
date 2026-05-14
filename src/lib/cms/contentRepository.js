// src/lib/cms/contentRepository.js
import { LocalStorageAdapter } from './adapters/localStorageAdapter';
// import { CloudflareAdapter } from './adapters/cloudflareAdapter';

// Use local storage adapter for now.
// Later, this can be swapped based on environment variables.
// const isProd = import.meta.env.PROD;
// const adapter = isProd ? new CloudflareAdapter('/api') : new LocalStorageAdapter();

const adapter = new LocalStorageAdapter();

export const contentRepository = {
  // Global
  getGlobalContent: () => adapter.getGlobalContent(),
  updateGlobalContent: (content) => adapter.updateGlobalContent(content),

  // Sections
  getSections: () => adapter.getSections(),
  getSectionBySlug: (slug) => adapter.getSectionBySlug(slug),
  updateSection: (id, updates) => adapter.updateSection(id, updates),

  // News
  getNews: () => adapter.getNews(),
  createNews: (item) => adapter.createNews(item),
  updateNews: (id, updates) => adapter.updateNews(id, updates),
  deleteNews: (id) => adapter.deleteNews(id),

  // Events
  getEvents: () => adapter.getEvents(),
  createEvent: (item) => adapter.createEvent(item),
  updateEvent: (id, updates) => adapter.updateEvent(id, updates),
  deleteEvent: (id) => adapter.deleteEvent(id),
  
  // Helpers
  resetToSeed: async () => {
    if (adapter.resetToSeed) {
      await adapter.resetToSeed();
    }
  },

  getNewsBySection: async (sectionId) => {
    const all = await adapter.getNews();
    return all.filter(n => n.sectionId === sectionId || n.sectionId === null);
  },
  
  getEventsBySection: async (sectionId) => {
    const all = await adapter.getEvents();
    return all.filter(e => e.sectionId === sectionId || e.sectionId === null);
  }
};
