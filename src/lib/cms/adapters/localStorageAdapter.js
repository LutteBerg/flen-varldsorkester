// src/lib/cms/adapters/localStorageAdapter.js
import seedContent from '../../../data/seedContent.json';

const STORAGE_KEY = 'lutte_berg_cms_data';

export class LocalStorageAdapter {
  constructor() {
    this.initialize();
  }

  async initialize() {
    const existing = localStorage.getItem(STORAGE_KEY);
    let shouldSeed = true;

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        // Only keep existing data if its contentVersion is >= seed's contentVersion
        const existingVersion = parsed.global?.contentVersion || 1;
        const seedVersion = seedContent.global?.contentVersion || 1;
        
        if (existingVersion >= seedVersion) {
          shouldSeed = false;
        }
      } catch (e) {
        console.error('Failed to parse existing localStorage data');
      }
    }

    if (shouldSeed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedContent));
    }
  }

  async resetToSeed() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedContent));
    return true;
  }

  getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : seedContent;
  }

  saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Global Content
  async getGlobalContent() {
    return this.getData().global;
  }

  async updateGlobalContent(content) {
    const data = this.getData();
    data.global = { ...data.global, ...content };
    this.saveData(data);
    return data.global;
  }

  // Sections
  async getSections() {
    return this.getData().sections;
  }

  async getSectionBySlug(slug) {
    return this.getData().sections.find(s => s.slug === slug);
  }

  async updateSection(id, updates) {
    const data = this.getData();
    const index = data.sections.findIndex(s => s.id === id);
    if (index !== -1) {
      data.sections[index] = { ...data.sections[index], ...updates };
      this.saveData(data);
      return data.sections[index];
    }
    throw new Error('Section not found');
  }

  // News
  async getNews() {
    return this.getData().news;
  }

  async createNews(newsItem) {
    const data = this.getData();
    const newItem = {
      ...newsItem,
      id: `news-${Date.now()}`
    };
    data.news.unshift(newItem);
    this.saveData(data);
    return newItem;
  }

  async updateNews(id, updates) {
    const data = this.getData();
    const index = data.news.findIndex(n => n.id === id);
    if (index !== -1) {
      data.news[index] = { ...data.news[index], ...updates };
      this.saveData(data);
      return data.news[index];
    }
    throw new Error('News not found');
  }

  async deleteNews(id) {
    const data = this.getData();
    data.news = data.news.filter(n => n.id !== id);
    this.saveData(data);
    return true;
  }

  // Events
  async getEvents() {
    return this.getData().events;
  }

  async createEvent(eventItem) {
    const data = this.getData();
    const newItem = {
      ...eventItem,
      id: `event-${Date.now()}`
    };
    data.events.push(newItem);
    // Sort events by date
    data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.saveData(data);
    return newItem;
  }

  async updateEvent(id, updates) {
    const data = this.getData();
    const index = data.events.findIndex(e => e.id === id);
    if (index !== -1) {
      data.events[index] = { ...data.events[index], ...updates };
      data.events.sort((a, b) => new Date(a.date) - new Date(b.date));
      this.saveData(data);
      return data.events[index];
    }
    throw new Error('Event not found');
  }

  async deleteEvent(id) {
    const data = this.getData();
    data.events = data.events.filter(e => e.id !== id);
    this.saveData(data);
    return true;
  }
}
