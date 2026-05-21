// PBKDF2 password verification + HMAC-signed session cookies.
//
// All secrets are read from the env at call time:
//   ADMIN_PASSWORD_HASH        base64(32-byte PBKDF2-SHA256 derived key)
//   ADMIN_PASSWORD_SALT        base64(16-byte salt)
//   ADMIN_PASSWORD_ITERATIONS  decimal string, e.g. "100000"
//   SESSION_SECRET             base64(32-byte HMAC-SHA256 key)
//
// PBKDF2 iteration ceiling: keep <= MAX_PBKDF2_ITERATIONS. Cloudflare
// Workers/Pages Functions have a CPU budget per request (10ms on Free,
// 50ms default on Paid). 600k iterations of PBKDF2-SHA256 routinely
// exceeds this and throws "Script will never generate a response" /
// the request is terminated. 100k iterations completes in ~5-20ms and
// is the documented Cloudflare-friendly default.
//
// If any required env var is missing, the relevant helper throws a 500
// Response. Login never succeeds if the env is incomplete (fail closed).

export const SESSION_COOKIE_NAME = 'lb_admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Cloudflare Workers/Pages: PBKDF2 with > ~150k iterations risks exceeding the
// per-request CPU budget. We reject values above this ceiling so a stale env
// var configured with the old default (600k) fails LOUDLY with a clear error
// rather than vanishing into a "500 Internal server error".
export const MAX_PBKDF2_ITERATIONS = 150000;
export const MIN_PBKDF2_ITERATIONS = 1000;

// ── base64url helpers (URL-safe, no padding) ─────────────────────────────────

function bufferFromBase64(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function base64urlEncode(bytesOrString) {
  const bytes = typeof bytesOrString === 'string'
    ? new TextEncoder().encode(bytesOrString)
    : bytesOrString;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecodeToString(b64url) {
  const bytes = bufferFromBase64(b64url);
  return new TextDecoder().decode(bytes);
}

// ── PBKDF2 password verification ─────────────────────────────────────────────

function envOrThrow(env) {
  if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_SALT || !env.ADMIN_PASSWORD_ITERATIONS) {
    throw new Response(
      JSON.stringify({ error: 'Server misconfigured: admin password env vars missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
  if (!env.SESSION_SECRET) {
    throw new Response(
      JSON.stringify({ error: 'Server misconfigured: SESSION_SECRET missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}

function constantTimeEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export class PasswordConfigError extends Error {
  constructor(reason) { super(reason); this.name = 'PasswordConfigError'; }
}

export async function verifyPassword(password, env) {
  envOrThrow(env);
  if (typeof password !== 'string' || !password) return false;

  let salt, expected;
  try {
    salt = bufferFromBase64(env.ADMIN_PASSWORD_SALT);
    expected = bufferFromBase64(env.ADMIN_PASSWORD_HASH);
  } catch (e) {
    // atob() throws InvalidCharacterError on malformed base64
    throw new PasswordConfigError('ADMIN_PASSWORD_SALT or ADMIN_PASSWORD_HASH is not valid base64.');
  }
  if (salt.byteLength === 0 || expected.byteLength === 0) {
    throw new PasswordConfigError('ADMIN_PASSWORD_SALT or ADMIN_PASSWORD_HASH decoded to zero bytes.');
  }

  const iterations = parseInt(env.ADMIN_PASSWORD_ITERATIONS, 10);
  if (!iterations || iterations < MIN_PBKDF2_ITERATIONS) {
    throw new PasswordConfigError(`ADMIN_PASSWORD_ITERATIONS must be >= ${MIN_PBKDF2_ITERATIONS}.`);
  }
  if (iterations > MAX_PBKDF2_ITERATIONS) {
    // Cloudflare Workers will exceed its CPU budget before returning; we'd
    // otherwise fail with an opaque "Internal server error".
    throw new PasswordConfigError(
      `ADMIN_PASSWORD_ITERATIONS=${iterations} exceeds the Cloudflare Workers ceiling of ${MAX_PBKDF2_ITERATIONS}. ` +
      `Regenerate the hash with the current scripts/hash-password.mjs default and update the three ADMIN_PASSWORD_* secrets.`
    );
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    expected.byteLength * 8
  );
  return constantTimeEqual(new Uint8Array(bits), expected);
}

// ── Session cookie sign / verify (HMAC-SHA256, no JWT lib) ───────────────────

async function hmacKey(env) {
  envOrThrow(env);
  const raw = bufferFromBase64(env.SESSION_SECRET);
  return crypto.subtle.importKey(
    'raw', raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now, exp: now + SESSION_MAX_AGE_SECONDS };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const key = await hmacKey(env);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64)));
  return `${payloadB64}.${base64urlEncode(sig)}`;
}

export async function verifySessionToken(token, env) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  let key;
  try { key = await hmacKey(env); } catch { return null; }

  const expectedSig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64)));
  const providedSig = bufferFromBase64(sigB64);
  if (!constantTimeEqual(expectedSig, providedSig)) return null;

  let payload;
  try { payload = JSON.parse(base64urlDecodeToString(payloadB64)); } catch { return null; }
  if (typeof payload.exp !== 'number') return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ── Cookie helpers ───────────────────────────────────────────────────────────

export function sessionCookieHeader(token) {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  return attrs.join('; ');
}

export function clearSessionCookieHeader() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Max-Age=0',
  ].join('; ');
}

export function readSessionCookie(request) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) return rest.join('=');
  }
  return null;
}
