// POST /api/admin/login
// Body: { password: string }
// Sets HttpOnly session cookie on success.

import { error } from '../../lib/response.js';
import { wrap } from '../../lib/db.js';
import {
  verifyPassword,
  createSessionToken,
  sessionCookieHeader,
} from '../../lib/auth.js';

export const onRequestPost = wrap(async ({ request, env }) => {
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }
  const password = body && body.password;
  if (typeof password !== 'string' || !password) {
    return error(400, 'Password required');
  }

  const ok = await verifyPassword(password, env);
  if (!ok) return error(401, 'Fel lösenord');

  const token = await createSessionToken(env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': sessionCookieHeader(token),
    },
  });
});
