// PUT /api/admin/site-settings
// Body: the global content blob (siteTitle, homeIntro, aboutText, contactInfo, socialLinks)
// Persists as a single JSON row under key='global' in site_settings.

import { json, error } from '../../lib/response.js';
import { requireDb, nowIso, wrap } from '../../lib/db.js';

export const onRequestPut = wrap(async ({ request, env }) => {
  const db = requireDb(env);
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }

  // Whitelist fields rather than echoing everything the client sends.
  const clean = {
    siteTitle: stringOr(body.siteTitle, ''),
    homeIntro: stringOr(body.homeIntro, ''),
    aboutText: stringOr(body.aboutText, ''),
    contactInfo: {
      address: stringOr(body?.contactInfo?.address, ''),
      email:   stringOr(body?.contactInfo?.email,   ''),
      phone:   stringOr(body?.contactInfo?.phone,   ''),
    },
    socialLinks: Array.isArray(body.socialLinks)
      ? body.socialLinks
          .filter(l => l && typeof l.platform === 'string' && typeof l.url === 'string')
          .map(l => ({ platform: l.platform.trim(), url: l.url.trim() }))
      : [],
  };

  await db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('global', ?1, ?2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(JSON.stringify(clean), nowIso()).run();

  return json({ ok: true, value: clean });
});

function stringOr(v, fallback) {
  return typeof v === 'string' ? v : fallback;
}
