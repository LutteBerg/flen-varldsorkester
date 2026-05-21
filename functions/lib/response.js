// Small response helpers for Pages Functions.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
}

export function error(status, message, extra = {}) {
  return json({ error: message, ...extra }, { status });
}

export function noContent() {
  return new Response(null, { status: 204 });
}
