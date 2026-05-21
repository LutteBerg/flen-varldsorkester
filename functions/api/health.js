// GET /api/health
// Safe diagnostic endpoint. Returns booleans only — never secret values.
// Use this after deploy to confirm that the D1 binding and the four secrets
// are visible to Pages Functions.
//
// Public on purpose: a "yes the env vars exist" boolean cannot be abused
// (it doesn't reveal a value). If you'd rather not expose even that, delete
// this file after Lutte's setup is confirmed.

export const onRequestGet = async ({ env }) => {
  return new Response(JSON.stringify({
    ok: true,
    hasDB: Boolean(env.DB),
    hasAdminPasswordHash:       Boolean(env.ADMIN_PASSWORD_HASH),
    hasAdminPasswordSalt:       Boolean(env.ADMIN_PASSWORD_SALT),
    hasAdminPasswordIterations: Boolean(env.ADMIN_PASSWORD_ITERATIONS),
    hasSessionSecret:           Boolean(env.SESSION_SECRET),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
