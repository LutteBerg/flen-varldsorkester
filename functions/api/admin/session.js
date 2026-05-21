// GET /api/admin/session — returns 200 if the cookie is still valid, else 401.
// Used by the AdminLayout on mount to decide whether to render the panel
// or redirect to /admin/login.

import { json } from '../../lib/response.js';
import { wrap } from '../../lib/db.js';
import { readSessionCookie, verifySessionToken } from '../../lib/auth.js';

export const onRequestGet = wrap(async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET) {
    return new Response(JSON.stringify({ error: 'Server misconfigured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const token = readSessionCookie(request);
  if (!token) return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  const payload = await verifySessionToken(token, env);
  if (!payload) return new Response(JSON.stringify({ authenticated: false }), { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  return json({ authenticated: true, exp: payload.exp });
});
