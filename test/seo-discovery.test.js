import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLlmsText } from '../functions/seo/llms.js';
import { collectSitemapEntries, renderSitemapXml } from '../functions/seo/sitemap.js';
import { SITE_ORIGIN, seoFixture } from './seo-fixture.js';

test('sitemap contains every real public route and excludes invented routes', () => {
  const entries = collectSitemapEntries(seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });
  const urls = entries.map((entry) => entry.loc);

  assert.ok(urls.includes(`${SITE_ORIGIN}/`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/jazz-world-music-club`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/flen-varldsorkester/musaik-projektet`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/flen-varldsorkester/musaik-projektet/evenemang`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/flen-varldsorkester/evenemang/event-child`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/jazz-world-music-club/nyheter`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/jazz-world-music-club/galleri`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/events`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/events/upcoming`));
  assert.ok(!urls.includes(`${SITE_ORIGIN}/events/past`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/locations`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/locations/amazon-parkgatan-3-flen`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/locations/klosters-kyrka-eskilstuna`));
  assert.ok(!urls.some((url) => url.includes('/admin')));
  assert.ok(!urls.some((url) => url.includes('/nyheter/news-jazz')));
});

test('sitemap includes past archive only when a real past event exists', () => {
  const fixture = structuredClone(seoFixture);
  fixture.events.push({
    ...fixture.events[0],
    id: 'event-past',
    title: 'Tidigare konsert',
    date: '2026-05-10',
    updatedAt: '2026-05-11T10:00:00.000Z',
  });

  const urls = collectSitemapEntries(fixture, SITE_ORIGIN, {
    today: '2026-06-13',
  }).map((entry) => entry.loc);

  assert.ok(urls.includes(`${SITE_ORIGIN}/events/past`));
  assert.ok(urls.includes(`${SITE_ORIGIN}/flen-varldsorkester/evenemang/event-past`));
});

test('sitemap omits event and location archives when D1 has no indexable events', () => {
  const fixture = structuredClone(seoFixture);
  fixture.events = [];

  const urls = collectSitemapEntries(fixture, SITE_ORIGIN, {
    today: '2026-06-13',
  }).map((entry) => entry.loc);

  assert.ok(!urls.some((url) => url.includes('/events')));
  assert.ok(!urls.some((url) => url.includes('/locations')));
});

test('sitemap uses source lastmod values and escapes XML', () => {
  const fixture = structuredClone(seoFixture);
  fixture.sections[1].slug = 'jazz-&-world';
  const xml = renderSitemapXml(fixture, SITE_ORIGIN);

  assert.match(xml, /<lastmod>2026-06-07T10:00:00.000Z<\/lastmod>/);
  assert.match(xml, /jazz-&amp;-world/);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
});

test('llms text describes the organization from D1 and lists canonical pages', () => {
  const text = renderLlmsText(seoFixture, SITE_ORIGIN);

  assert.match(text, /Kulturföreningen FlenVärldsOrkester/);
  assert.match(text, /Den kreativa mötesplatsen i Flen\./);
  assert.match(text, /https:\/\/flen-varldsorkester\.pages\.dev\/jazz-world-music-club/);
  assert.match(text, /Musaik Projektet/);
  assert.doesNotMatch(text, /\/admin|news-jazz/);
});
