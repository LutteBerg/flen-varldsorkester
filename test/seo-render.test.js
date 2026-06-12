import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSeoPage } from '../functions/seo/routes.js';
import {
  createHtmlRewriterHandlers,
  escapeHtml,
  renderContentBootstrap,
  renderHead,
  renderJsonLd,
  renderNoscript,
  stockholmDateTime,
} from '../functions/seo/render.js';
import { DEFAULT_IMAGE_PATH } from '../functions/seo/constants.js';
import { SITE_ORIGIN, seoFixture } from './seo-fixture.js';

test('event startDate uses the Europe/Stockholm summer offset', () => {
  assert.equal(
    stockholmDateTime('2026-08-15', '18:00'),
    '2026-08-15T18:00:00+02:00',
  );
});

test('event startDate uses the Europe/Stockholm winter offset', () => {
  assert.equal(
    stockholmDateTime('2026-11-08', '16:00'),
    '2026-11-08T16:00:00+01:00',
  );
});

test('head metadata is route-specific and uses absolute images', () => {
  const page = resolveSeoPage('/jazz-world-music-club', seoFixture, SITE_ORIGIN);
  const head = renderHead(page);

  assert.match(head, /name="description" content="Din lokala scen för jazz och världsmusik\."/);
  assert.match(head, /rel="canonical" href="https:\/\/flen-varldsorkester\.pages\.dev\/jazz-world-music-club"/);
  assert.match(head, /property="og:image" content="https:\/\/flen-varldsorkester\.pages\.dev\/assets\/jazz\/Logo\.jpg"/);
  assert.match(head, /property="og:locale" content="sv_SE"/);
  assert.match(head, /name="twitter:card" content="summary_large_image"/);
});

test('home head preloads its real LCP image from D1', () => {
  const head = renderHead(resolveSeoPage('/', seoFixture, SITE_ORIGIN));

  assert.match(
    head,
    /<link rel="preload" as="image" href="\/assets\/fvo\/alma-orkester.JPG" fetchpriority="high">/,
  );
});

test('head metadata falls back to the absolute logo and noindexes admin', () => {
  const about = renderHead(resolveSeoPage('/about', seoFixture, SITE_ORIGIN));
  const admin = renderHead(resolveSeoPage('/admin/login', seoFixture, SITE_ORIGIN));

  assert.match(
    about,
    new RegExp(`property="og:image" content="${SITE_ORIGIN}${DEFAULT_IMAGE_PATH}"`),
  );
  assert.match(admin, /name="robots" content="noindex, nofollow, noarchive"/);
});

test('JSON-LD exposes Organization, WebSite, and BreadcrumbList', () => {
  const graph = renderJsonLd(
    resolveSeoPage('/jazz-world-music-club', seoFixture, SITE_ORIGIN),
  );
  const types = graph['@graph'].flatMap((item) => item['@type']);

  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('PerformingGroup'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('BreadcrumbList'));

  const organization = graph['@graph'].find((item) => item['@type'] === 'Organization');
  const performingGroup = graph['@graph'].find((item) => item['@type'] === 'PerformingGroup');
  assert.equal(organization.logo.url, `${SITE_ORIGIN}${DEFAULT_IMAGE_PATH}`);
  assert.equal(organization.address.addressLocality, 'Flen');
  assert.equal(
    performingGroup.parentOrganization['@id'],
    `${SITE_ORIGIN}/#organization`,
  );
});

test('Event JSON-LD has absolute image, Stockholm startDate, and a supported free offer', () => {
  const graph = renderJsonLd(resolveSeoPage(
    '/flen-varldsorkester/evenemang/event-summer',
    seoFixture,
    SITE_ORIGIN,
  ));
  const event = graph['@graph'].find((item) => item['@type'] === 'Event');

  assert.equal(event.startDate, '2026-08-15T18:00:00+02:00');
  assert.deepEqual(event.image, [`${SITE_ORIGIN}/assets/fvo/alma-orkester.JPG`]);
  assert.equal(event.offers.price, 0);
  assert.equal(event.offers.priceCurrency, 'SEK');
  assert.equal(event.organizer['@id'], `${SITE_ORIGIN}/#organization`);
  assert.equal(event.performer['@id'], `${SITE_ORIGIN}/#performing-group`);
});

test('NewsArticle and VideoObject use only matching visible content', () => {
  const newsGraph = renderJsonLd(
    resolveSeoPage('/jazz-world-music-club/nyheter', seoFixture, SITE_ORIGIN),
  );
  const sectionGraph = renderJsonLd(
    resolveSeoPage('/flen-varldsorkester', seoFixture, SITE_ORIGIN),
  );
  const article = newsGraph['@graph'].find((item) => item['@type'] === 'NewsArticle');
  const video = sectionGraph['@graph'].find((item) => item['@type'] === 'VideoObject');

  assert.equal(article.headline, 'Klubbscenen öppnar');
  assert.equal(article.image, `${SITE_ORIGIN}/assets/jazz/Logo.jpg`);
  assert.equal(video.name, 'FlenVärldsOrkester live');
  assert.equal(video.thumbnailUrl, 'https://img.youtube.com/vi/abcdefghijk/hqdefault.jpg');
});

test('noscript emits every allowed route-visible field and no child-only body', () => {
  const page = resolveSeoPage('/flen-varldsorkester', seoFixture, SITE_ORIGIN);
  const html = renderNoscript(page);

  for (const text of page.visibleText) {
    assert.ok(
      html.includes(escapeHtml(text)),
      `Expected noscript to include visible text: ${text}`,
    );
  }
  assert.doesNotMatch(html, /Musaik samlar människor genom musik\./);
  assert.doesNotMatch(html, /best jazz|top orchestra|SEO|keywords/i);
  assert.match(html, /^<noscript id="crawler-content">/);
  assert.match(html, /<main aria-label="Sidinnehåll utan JavaScript">/);
  assert.doesNotMatch(html, /<img\b(?![^>]*\bwidth=)(?![^>]*\bheight=)/);
});

test('noscript escapes D1 content instead of allowing HTML injection', () => {
  const fixture = structuredClone(seoFixture);
  fixture.global.aboutText = '<script>alert("x")</script> & kultur';
  const html = renderNoscript(resolveSeoPage('/about', fixture, SITE_ORIGIN));

  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; kultur/);
});

test('HTMLRewriter handlers replace title and append head/noscript fragments', () => {
  const page = resolveSeoPage('/jazz-world-music-club', seoFixture, SITE_ORIGIN);
  const handlers = createHtmlRewriterHandlers(page);
  const calls = [];
  const element = {
    setInnerContent(value) {
      calls.push(['title', value]);
    },
    append(value, options) {
      calls.push(['append', value, options]);
    },
    after(value, options) {
      calls.push(['after', value, options]);
    },
    remove() {
      calls.push(['remove']);
    },
  };

  handlers.title.element(element);
  handlers.head.element(element);
  handlers.root.element(element);
  handlers.remove.element(element);

  assert.deepEqual(calls[0], ['title', page.title]);
  assert.equal(calls[1][0], 'append');
  assert.equal(calls[1][2].html, true);
  assert.match(calls[1][1], /application\/ld\+json/);
  assert.match(calls[1][1], /id="__PUBLIC_CONTENT__"/);
  assert.equal(calls[2][0], 'after');
  assert.equal(calls[2][2].html, true);
  assert.match(calls[2][1], /<noscript id="crawler-content">/);
  assert.deepEqual(calls[3], ['remove']);
});

test('content bootstrap serializes only JSON and neutralizes closing script tags', () => {
  const fixture = structuredClone(seoFixture);
  fixture.global.homeIntro = '</script><script>alert("x")</script>';
  const html = renderContentBootstrap(fixture);

  assert.match(html, /^<script type="application\/json" id="__PUBLIC_CONTENT__">/);
  assert.doesNotMatch(html, /<\/script><script>/);
  assert.match(html, /\\u003c\/script>/);
});
