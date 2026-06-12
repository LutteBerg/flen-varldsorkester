import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSeoPage } from '../functions/seo/routes.js';
import { SITE_ORIGIN, seoFixture } from './seo-fixture.js';

test('resolves home with its visible D1 text', () => {
  const page = resolveSeoPage('/', seoFixture, SITE_ORIGIN);

  assert.equal(page.kind, 'home');
  assert.equal(
    page.lcpImage,
    '/assets/fvo/alma-orkester.JPG',
  );
  assert.equal(page.canonicalUrl, `${SITE_ORIGIN}/`);
  assert.deepEqual(page.visibleText.slice(0, 2), [
    seoFixture.global.siteTitle,
    seoFixture.global.homeIntro,
  ]);
});

test('resolves a section with an absolute canonical and image URL', () => {
  const page = resolveSeoPage('/jazz-world-music-club', seoFixture, SITE_ORIGIN);

  assert.equal(page.kind, 'section');
  assert.equal(page.canonicalUrl, `${SITE_ORIGIN}/jazz-world-music-club`);
  assert.equal(page.image, `${SITE_ORIGIN}/assets/jazz/Logo.jpg`);
  assert.match(page.title, /Jazz & World Music Club/);
  assert.equal(page.lastModified, '2026-06-07T10:00:00.000Z');
});

test('resolves child events separately from section events', () => {
  const page = resolveSeoPage(
    '/flen-varldsorkester/musaik-projektet/evenemang',
    seoFixture,
    SITE_ORIGIN,
  );

  assert.equal(page.kind, 'event-list');
  assert.deepEqual(page.events.map((event) => event.id), ['event-child']);
  assert.equal(page.parentPath, '/flen-varldsorkester/musaik-projektet');
});

test('resolves a section event detail and rejects a mismatched event', () => {
  const page = resolveSeoPage(
    '/flen-varldsorkester/evenemang/event-summer',
    seoFixture,
    SITE_ORIGIN,
  );
  const mismatched = resolveSeoPage(
    '/jazz-world-music-club/evenemang/event-summer',
    seoFixture,
    SITE_ORIGIN,
  );

  assert.equal(page.kind, 'event');
  assert.equal(page.event.id, 'event-summer');
  assert.equal(mismatched.kind, 'unknown');
});

test('resolves a child-page event detail on the existing section detail route', () => {
  const page = resolveSeoPage(
    '/flen-varldsorkester/evenemang/event-child',
    seoFixture,
    SITE_ORIGIN,
  );

  assert.equal(page.kind, 'event');
  assert.equal(page.event.id, 'event-child');
  assert.equal(page.child.id, 'child-musaik');
  assert.equal(
    page.breadcrumbs.at(-2).path,
    '/flen-varldsorkester/musaik-projektet/evenemang',
  );
});

test('marks every admin descendant noindex', () => {
  const page = resolveSeoPage('/admin/login', seoFixture, SITE_ORIGIN);

  assert.equal(page.kind, 'admin');
  assert.equal(page.noindex, true);
});

test('uses the approved social photograph when the route has no image', () => {
  const page = resolveSeoPage('/about', seoFixture, SITE_ORIGIN);

  assert.equal(
    page.image,
    `${SITE_ORIGIN}/assets/social/fvo-social-preview.jpg`,
  );
  assert.deepEqual(page.imageMeta, {
    type: 'image/jpeg',
    width: 1200,
    height: 630,
    alt: 'FlenVärldsOrkester med solist och kör på scen',
  });
});

test('normalizes trailing slashes and preserves Swedish content', () => {
  const page = resolveSeoPage(
    '/flen-varldsorkester/musaik-projektet/',
    seoFixture,
    SITE_ORIGIN,
  );

  assert.equal(page.kind, 'child');
  assert.equal(page.canonicalPath, '/flen-varldsorkester/musaik-projektet');
  assert.ok(page.visibleText.includes('Musaik samlar människor genom musik.'));
});
