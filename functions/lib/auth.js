// PBKDF2 password verification + HMAC-signed session cookies.
//
// All secrets are read from the env at call time:
//   ADMIN_PASSWORD_HASH        base64(32-byte PBKDF2-SHA256 derived key)
//   ADMIN_PASSWORD_SALT        base64(16-byte salt)
//   ADMIN_PASSWORD_ITERATIONS  decimal string, e.g. "600000"
//   SESSION_SECRET             base64(32-byte HMAC-SHA256 key)
//
// If any are missing, the relevant helper throws a 500 Response.
// Login never succeeds if the env is incomplete (fail closed).

export const SESSION_COOKIE_NAME = 'lb_admin_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

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

export async function verifyPassword(password, env) {
  envOrThrow(env);
  if (typeof password !== 'string' || !password) return false;

  const salt = bufferFromBase64(env.ADMIN_PASSWORD_SALT);
  const iterations = parseInt(env.ADMIN_PASSWORD_ITERATIONS, 10);
  const expected = bufferFromBase64(env.ADMIN_PASSWORD_HASH);
  if (!iterations || iterations < 1000) return false;

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
