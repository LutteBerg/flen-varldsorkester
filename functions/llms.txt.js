import { SITE_ORIGIN } from './seo/constants.js';
import { renderLlmsText } from './seo/llms.js';
import { getPublishedSnapshot } from './seo/snapshot-cache.js';

export const onRequestGet = async ({ env }) => {
  const snapshot = await getPublishedSnapshot(env);
  return new Response(renderLlmsText(snapshot, SITE_ORIGIN), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
