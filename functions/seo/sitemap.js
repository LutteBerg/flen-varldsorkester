import { resolveSeoPage } from './routes.js';

export function collectSitemapEntries(snapshot, origin) {
  const paths = ['/', '/about', '/contact'];

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

  for (const event of snapshot?.events || []) {
    const section = (snapshot.sections || [])
      .find((item) => item.id === event.sectionId);
    if (section) {
      paths.push(`/${section.slug}/evenemang/${encodeURIComponent(event.id)}`);
    }
  }

  return [...new Set(paths)].map((path) => {
    const page = resolveSeoPage(path, snapshot, origin);
    return {
      loc: page.canonicalUrl,
      lastmod: page.lastModified,
    };
  });
}

export function renderSitemapXml(snapshot, origin) {
  const entries = collectSitemapEntries(snapshot, origin);
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
