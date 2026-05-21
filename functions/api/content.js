// Public bulk-content endpoint.
//
// GET /api/content
// Returns the shape the React app expects:
//   { global, sections: [{ ..., galleryImages, videos, childPages }], news, events }
//
// PUBLISHED CONTENT ONLY. Drafts are excluded at the SQL level via
// `WHERE status = 'published'`. This is the public/draft boundary —
// the frontend does NOT need to filter again.

import { json, error } from '../lib/response.js';
import { requireDb, wrap } from '../lib/db.js';
import { buildContentSnapshot } from './_lib/content.js';

export const onRequestGet = wrap(async ({ env }) => {
  const db = requireDb(env);
  const snapshot = await buildContentSnapshot(db, { publishedOnly: true });
  return json(snapshot);
});
