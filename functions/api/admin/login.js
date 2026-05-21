// POST /api/admin/login
// Body: { password: string }
// Sets HttpOnly session cookie on success.

import { error } from '../../lib/response.js';
import { wrap } from '../../lib/db.js';
import {
  verifyPassword,
  createSessionToken,
  sessionCookieHeader,
  PasswordConfigError,
} from '../../lib/auth.js';

export const onRequestPost = wrap(async ({ request, env }) => {
  let body;
  try { body = await request.json(); } catch { return error(400, 'Invalid JSON'); }
  const password = body && body.password;
  if (typeof password !== 'string' || !password) {
    return error(400, 'Password required');
  }

  // Surface configuration errors as 500 with a specific (non-secret) reason
  // rather than letting wrap() bury them as "Internal server error".
  let ok;
  try {
    ok = await verifyPassword(password, env);
  } catch (err) {
    // Log structured context (no secret VALUES — only existence booleans + message)
    console.error('admin/login: verifyPassword threw', {
      hasHash:       Boolean(env.ADMIN_PASSWORD_HASH),
      hasSalt:       Boolean(env.ADMIN_PASSWORD_SALT),
      hasIterations: Boolean(env.ADMIN_PASSWORD_ITERATIONS),
      hasSessionSecret: Boolean(env.SESSION_SECRET),
      hasDB:         Boolean(env.DB),
      iterations:    env.ADMIN_PASSWORD_ITERATIONS,  // OK to log: NOT a secret value
      errorName:     err && err.name,
      errorMessage:  err && err.message,
      errorStack:    err && err.stack,
    });
    if (err instanceof PasswordConfigError) {
      return error(500, 'Server configuration error', { reason: err.message });
    }
    // Re-throw so wrap() turns it into the generic 500
    throw err;
  }

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
