// POST /api/admin/logout — clears the session cookie.

import { wrap } from '../../lib/db.js';
import { clearSessionCookieHeader } from '../../lib/auth.js';

export const onRequestPost = wrap(async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': clearSessionCookieHeader(),
    },
  });
});
