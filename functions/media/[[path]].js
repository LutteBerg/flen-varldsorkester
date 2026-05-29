// GET /media/<key> — streams an object from the MEDIA_BUCKET R2 bucket.
//
// Why this route exists:
//   The R2 bucket is private (we never enabled public r2.dev access for it
//   and there is no custom-domain binding). Uploaded images therefore have to
//   travel through a Worker. This file is that Worker.
//
// Why a [[path]].js catch-all:
//   Object keys look like "uploads/2026/05/abc-foo.jpg" — i.e. they contain
//   path separators. A single-segment [key].js would only match
//   /media/<one-thing>. Pages' double-bracket catch-all collects all remaining
//   segments into params.path as an array.
//
// Cache strategy:
//   Objects are random-keyed by the upload endpoint and immutable. We forward
//   the Cache-Control we set at upload time (`public, max-age=31536000,
//   immutable`) so Cloudflare's edge cache + browser cache both keep the file.
//
// Auth: none. These are public images by intent — the route is in /media/*
// which is excluded from the /api/admin auth gate in functions/_middleware.js
// (the middleware only intercepts /api/admin/*).

export const onRequestGet = async ({ params, env, request }) => {
  if (!env.MEDIA_BUCKET) {
    return new Response('R2 binding MEDIA_BUCKET not configured', { status: 500 });
  }

  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  if (parts.length === 0) {
    return new Response('Not found', { status: 404 });
  }
  // Rejoin into the original key. params.path is already URL-decoded by
  // the Pages runtime, so we don't decodeURIComponent again.
  const key = parts.join('/');

  // Defense in depth: prevent directory traversal in the key.
  if (key.includes('..') || key.startsWith('/')) {
    return new Response('Bad key', { status: 400 });
  }

  // Respect If-None-Match for 304s. R2's HEAD/GET supports onlyIf.
  const ifNoneMatch = request.headers.get('If-None-Match') || undefined;
  const obj = await env.MEDIA_BUCKET.get(key, ifNoneMatch ? { onlyIf: { etagDoesNotMatch: ifNoneMatch } } : undefined);

  if (obj === null) {
    return new Response('Not found', { status: 404 });
  }
  // If onlyIf short-circuited, R2 returns a non-streaming object with no body.
  // We detect that by absence of `.body` and respond 304.
  if (!obj.body) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': obj.httpEtag,
      },
    });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers); // sets Content-Type, Cache-Control from upload-time httpMetadata
  headers.set('ETag', obj.httpEtag);
  // Defense-in-depth: even if a file slipped through as text/html, we don't
  // let it be rendered as HTML in the same origin as the admin.
  headers.set('X-Content-Type-Options', 'nosniff');
  // Belt and braces — if Cache-Control wasn't set at upload time (legacy
  // objects), apply a reasonable default. The newer upload endpoint always
  // sets it, so this is mostly future-proofing.
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return new Response(obj.body, { headers });
};
