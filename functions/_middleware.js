/* global HTMLRewriter */

import { readSessionCookie, verifySessionToken } from './lib/auth.js';
import { ORGANIZATION_NAME, SITE_ORIGIN } from './seo/constants.js';
import { prefersMarkdown, renderMarkdown } from './seo/markdown.js';
import { createHtmlRewriterHandlers } from './seo/render.js';
import { resolveSeoPage } from './seo/routes.js';
import {
  getPublishedSnapshot,
  invalidatePublishedSnapshot,
} from './seo/snapshot-cache.js';

const PUBLIC_ADMIN_PATHS = new Set([
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/session',
]);

export const onRequest = async (ctx) => {
  const url = new URL(ctx.request.url);

  if (url.pathname.startsWith('/api/admin/')) {
    const authFailure = await authorizeAdminRequest(ctx, url.pathname);
    if (authFailure) return authFailure;

    const response = await ctx.next();
    await invalidateAfterContentMutation(
      ctx.request,
      response,
      invalidatePublishedSnapshot,
    );
    return response;
  }

  const response = await ctx.next();
  if (
    ctx.request.method !== 'GET'
    || !isPublicPagePath(url.pathname)
    || !response.headers.get('Content-Type')?.includes('text/html')
  ) return response;

  const markdownPreferred = prefersMarkdown(ctx.request.headers.get('Accept'));
  if (
    markdownPreferred
    && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
  ) {
    return markdownResponse(response, '', true);
  }

  let snapshot;
  try {
    snapshot = await getPublishedSnapshot(ctx.env);
  } catch (error) {
    console.error('SEO snapshot unavailable:', error instanceof Error ? error.message : 'unknown');
    if (markdownPreferred) return response;
    snapshot = fallbackSnapshot();
  }

  const page = resolveSeoPage(url.pathname, snapshot, SITE_ORIGIN);
  if (markdownPreferred) {
    return markdownResponse(
      response,
      page.noindex ? '' : renderMarkdown(page),
      page.noindex,
    );
  }

  const handlers = createHtmlRewriterHandlers(page);
  const headers = new Headers(response.headers);
  if (page.noindex) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  const htmlResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  return new HTMLRewriter()
    .on('meta[name="description"]', handlers.remove)
    .on('meta[name="robots"]', handlers.remove)
    .on('link[rel="canonical"]', handlers.remove)
    .on('script[type="application/ld+json"]', handlers.remove)
    .on('title', handlers.title)
    .on('head', handlers.head)
    .on('#root', handlers.root)
    .transform(htmlResponse);
};

function isPublicPagePath(pathname) {
  if (
    pathname === '/api'
    || pathname.startsWith('/api/')
    || pathname === '/assets'
    || pathname.startsWith('/assets/')
    || pathname === '/media'
    || pathname.startsWith('/media/')
  ) return false;

  const lastSegment = pathname.split('/').pop() || '';
  return !lastSegment.includes('.');
}

function markdownResponse(response, body, noindex = false) {
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  appendVary(headers, 'Accept');
  headers.delete('Content-Length');
  headers.delete('Content-Encoding');
  headers.delete('ETag');
  if (noindex) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function appendVary(headers, value) {
  const current = headers.get('Vary');
  if (!current) {
    headers.set('Vary', value);
    return;
  }

  const values = current.split(',').map((item) => item.trim());
  if (values.includes('*')) return;
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    headers.set('Vary', `${current}, ${value}`);
  }
}

export function isContentMutation(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/admin/')
    && !PUBLIC_ADMIN_PATHS.has(url.pathname)
    && !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
}

export async function invalidateAfterContentMutation(
  request,
  response,
  invalidate = invalidatePublishedSnapshot,
) {
  if (
    isContentMutation(request)
    && response.status >= 200
    && response.status < 300
  ) {
    await invalidate();
  }
}

async function authorizeAdminRequest(ctx, pathname) {
  if (PUBLIC_ADMIN_PATHS.has(pathname)) return null;

  if (!ctx.env.ADMIN_PASSWORD_HASH || !ctx.env.SESSION_SECRET) {
    return jsonError(500, 'Server misconfigured.');
  }

  const token = readSessionCookie(ctx.request);
  if (!token) return jsonError(401, 'Not authenticated');

  const payload = await verifySessionToken(token, ctx.env);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Session expired or invalid' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  return null;
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function fallbackSnapshot() {
  return {
    global: {
      siteTitle: ORGANIZATION_NAME,
      homeIntro: 'Musik, konst och kreativa mötesplatser i Amazon, Flen.',
      aboutText: '',
      contactInfo: {},
      socialLinks: [],
    },
    sections: [],
    news: [],
    events: [],
  };
}
