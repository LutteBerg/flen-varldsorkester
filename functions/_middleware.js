// Auth gate for /api/admin/* routes.
//
// Public endpoints (no auth required):
//   POST   /api/admin/login
//   POST   /api/admin/logout
//   GET    /api/admin/session   (used by frontend to detect if cookie is still valid)
//
// All other /api/admin/* paths require a valid HttpOnly signed session cookie.
//
// Anything outside /api/admin/* passes through untouched.

import { readSessionCookie, verifySessionToken } from './lib/auth.js';

const PUBLIC_ADMIN_PATHS = new Set([
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/session',
]);

export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (!url.pathname.startsWith('/api/admin/')) {
    return ctx.next();
  }
  if (PUBLIC_ADMIN_PATHS.has(url.pathname)) {
    return ctx.next();
  }

  if (!ctx.env.ADMIN_PASSWORD_HASH || !ctx.env.SESSION_SECRET) {
    return new Response(JSON.stringify({ error: 'Server misconfigured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const token = readSessionCookie(ctx.request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const payload = await verifySessionToken(token, ctx.env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Session expired or invalid' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return ctx.next();
};
