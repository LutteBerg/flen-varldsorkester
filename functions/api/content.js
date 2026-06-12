// Public bulk-content endpoint.
//
// GET /api/content
// Returns the shape the React app expects:
//   { global, sections: [{ ..., galleryImages, videos, childPages }], news, events }
//
// PUBLISHED CONTENT ONLY. Drafts are excluded at the SQL level via
// `WHERE status = 'published'`. This is the public/draft boundary —
// the frontend does NOT need to filter again.

import { json } from '../lib/response.js';
import { requireDb, wrap } from '../lib/db.js';
import { getPublishedSnapshot } from '../seo/snapshot-cache.js';

export const onRequestGet = wrap(async ({ env }) => {
  requireDb(env);
  const snapshot = await getPublishedSnapshot(env);
  return json(snapshot);
});
