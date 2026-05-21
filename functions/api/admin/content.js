// GET /api/admin/content — returns ALL content (incl. drafts) for the admin UI.
// Auth required (enforced by _middleware.js).

import { json } from '../../lib/response.js';
import { requireDb, wrap } from '../../lib/db.js';
import { buildContentSnapshot } from '../_lib/content.js';

export const onRequestGet = wrap(async ({ env }) => {
  const db = requireDb(env);
  const snapshot = await buildContentSnapshot(db, { publishedOnly: false });
  return json(snapshot);
});
