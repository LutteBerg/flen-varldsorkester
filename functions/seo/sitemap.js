import { resolveSeoPage } from './routes.js';
import {
  filterArchiveEvents,
  groupEventsByLocation,
  indexableEvents,
  stockholmDateKey,
} from '../../src/lib/eventArchives.js';

export function collectSitemapEntries(snapshot, origin, options = {}) {
  const paths = ['/', '/about', '/contact'];
  const today = options.today || stockholmDateKey();

  for (const section of snapshot?.sections || []) {
    const sectionPath = `/${section.slug}`;
    paths.push(
      sectionPath,
      `${sectionPath}/evenemang`,
      `${sectionPath}/nyheter`,
      `${sectionPath}/galleri`,
    );

    for (const child of section.childPages || []) {
      const childPath = `${sectionPath}/${child.slug}`;
      paths.push(childPath, `${childPath}/evenemang`);
    }
  }

  const events = indexableEvents(snapshot);
  for (const event of events) {
    paths.push(event.detailPath);
  }

  if (events.length) {
    paths.push('/events');
  }
  if (filterArchiveEvents(snapshot, 'upcoming', today).length) {
    paths.push('/events/upcoming');
  }
  if (filterArchiveEvents(snapshot, 'past', today).length) {
    paths.push('/events/past');
  }

  const locations = groupEventsByLocation(snapshot);
  if (locations.length) {
    paths.push('/locations');
    paths.push(...locations.map((location) => `/locations/${location.slug}`));
  }

  return [...new Set(paths)].map((path) => {
    const page = resolveSeoPage(path, snapshot, origin, { today });
    return {
      loc: page.canonicalUrl,
      lastmod: page.lastModified,
    };
  });
}

export function renderSitemapXml(snapshot, origin, options = {}) {
  const entries = collectSitemapEntries(snapshot, origin, options);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => [
      '<url>',
      `<loc>${escapeXml(entry.loc)}</loc>`,
      entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
      '</url>',
    ].join('')),
    '</urlset>',
  ].join('');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
