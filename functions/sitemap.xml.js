import { SITE_ORIGIN } from './seo/constants.js';
import { getPublishedSnapshot } from './seo/snapshot-cache.js';
import { renderSitemapXml } from './seo/sitemap.js';

export const onRequestGet = async ({ env }) => {
  const snapshot = await getPublishedSnapshot(env);
  return new Response(renderSitemapXml(snapshot, SITE_ORIGIN), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
