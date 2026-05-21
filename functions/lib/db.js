// D1 helpers and ID/timestamp utilities.

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix = '') {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}

export function requireDb(env) {
  if (!env || !env.DB) {
    throw new Response(JSON.stringify({ error: 'Server misconfigured: D1 binding DB is missing.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return env.DB;
}

// Wraps a handler so any thrown Response propagates as the actual response.
export function wrap(handler) {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (err) {
      if (err instanceof Response) return err;
      console.error('Unhandled error in Function:', err);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  };
}
