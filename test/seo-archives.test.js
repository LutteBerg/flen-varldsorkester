import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eventDetailPath,
  filterArchiveEvents,
  groupEventsByLocation,
  indexableEvents,
  locationSlug,
  stockholmDateKey,
} from '../src/lib/eventArchives.js';
import { resolveSeoPage } from '../functions/seo/routes.js';
import {
  renderHead,
  renderJsonLd,
  renderNoscript,
} from '../functions/seo/render.js';
import { renderMarkdown } from '../functions/seo/markdown.js';
import { SITE_ORIGIN, seoFixture } from './seo-fixture.js';

const archiveFixture = {
  sections: [
    {
      id: 'section-fvo',
      slug: 'flen-varldsorkester',
      title: 'Flen Världsorkester',
      childPages: [
        {
          id: 'child-musaik',
          slug: 'musaik-projektet',
          title: 'MUSAIK',
        },
      ],
    },
  ],
  events: [
    event({
      id: 'past',
      title: 'Tidigare konsert',
      date: '2026-06-12',
      location: 'Folkets hus, Hälleforsnäs',
    }),
    event({
      id: 'today',
      title: 'Konsert idag',
      date: '2026-06-13',
      location: 'Folkets hus, Hälleforsnäs',
    }),
    event({
      id: 'future',
      title: 'Kommande konsert',
      date: '2026-10-24',
      location: 'Folkets hus, Flen',
      childPageId: 'child-musaik',
    }),
    event({
      id: 'draft',
      title: 'Utkast',
      date: '2026-10-25',
      status: 'draft',
    }),
    event({
      id: 'orphan',
      title: 'Saknar sektion',
      date: '2026-10-26',
      sectionId: 'missing-section',
    }),
    event({
      id: 'blank-location',
      title: 'Minimalt evenemang',
      date: '2026-10-27',
      time: '',
      location: '   ',
      description: '',
      image: '',
    }),
  ],
};

test('uses the Europe/Stockholm calendar date at UTC day boundaries', () => {
  assert.equal(
    stockholmDateKey(new Date('2026-06-12T22:30:00.000Z')),
    '2026-06-13',
  );
  assert.equal(
    stockholmDateKey(new Date('2026-12-31T23:30:00.000Z')),
    '2027-01-01',
  );
});

test('keeps only published events with a real section and stable detail URL', () => {
  assert.deepEqual(
    indexableEvents(archiveFixture).map((item) => item.id),
    ['past', 'today', 'future', 'blank-location'],
  );
  assert.equal(
    eventDetailPath(archiveFixture.events[0], archiveFixture),
    '/flen-varldsorkester/evenemang/past',
  );
  assert.equal(
    eventDetailPath(archiveFixture.events.at(-2), archiveFixture),
    null,
  );
});

test('filters all, upcoming, and past archives against an explicit date', () => {
  assert.deepEqual(
    filterArchiveEvents(archiveFixture, 'all', '2026-06-13')
      .map((item) => item.id),
    ['past', 'today', 'future', 'blank-location'],
  );
  assert.deepEqual(
    filterArchiveEvents(archiveFixture, 'upcoming', '2026-06-13')
      .map((item) => item.id),
    ['today', 'future', 'blank-location'],
  );
  assert.deepEqual(
    filterArchiveEvents(archiveFixture, 'past', '2026-06-13')
      .map((item) => item.id),
    ['past'],
  );
});

test('creates deterministic readable Swedish location slugs', () => {
  assert.equal(
    locationSlug('Folkets hus, Hälleforsnäs'),
    'folkets-hus-halleforsnas',
  );
  assert.equal(locationSlug('  Amazon – Parkgatan 3  '), 'amazon-parkgatan-3');
  assert.equal(locationSlug(''), '');
});

test('groups only real locations and keeps their event detail paths', () => {
  const groups = groupEventsByLocation(archiveFixture);

  assert.deepEqual(
    groups.map((group) => ({
      name: group.name,
      slug: group.slug,
      events: group.events.map((item) => item.id),
    })),
    [
      {
        name: 'Folkets hus, Hälleforsnäs',
        slug: 'folkets-hus-halleforsnas',
        events: ['past', 'today'],
      },
      {
        name: 'Folkets hus, Flen',
        slug: 'folkets-hus-flen',
        events: ['future'],
      },
    ],
  );
  assert.equal(
    groups[0].events[0].detailPath,
    '/flen-varldsorkester/evenemang/past',
  );
});

test('resolves global event archives with canonical URLs and invisible intent', () => {
  const all = resolveSeoPage('/events', seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });
  const upcoming = resolveSeoPage('/events/upcoming', seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });
  const emptyPast = resolveSeoPage('/events/past', seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });

  assert.equal(all.kind, 'event-archive');
  assert.equal(all.archiveMode, 'all');
  assert.equal(all.canonicalUrl, `${SITE_ORIGIN}/events`);
  assert.deepEqual(all.events.map((item) => item.id), [
    'event-summer',
    'event-child',
  ]);
  assert.match(all.description, /FlenVärldsOrkester/);
  assert.ok(all.intentConcepts.includes('världsmusik Sverige'));
  assert.ok(all.intentConcepts.includes('MUSAIK'));
  assert.equal(
    all.visibleText.some((value) => all.intentConcepts.includes(value)),
    false,
  );

  assert.equal(upcoming.kind, 'event-archive');
  assert.equal(upcoming.archiveMode, 'upcoming');
  assert.equal(upcoming.noindex, false);

  assert.equal(emptyPast.kind, 'event-archive');
  assert.equal(emptyPast.archiveMode, 'past');
  assert.equal(emptyPast.noindex, true);
  assert.deepEqual(emptyPast.events, []);
});

test('prioritizes festival intent only when related D1 content supports it', () => {
  const fixture = structuredClone(seoFixture);
  fixture.sections[0].galleryImages[0].caption = 'MUSAIK Folk & Kultur 2025';

  const page = resolveSeoPage('/events', fixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });

  assert.ok(page.intentConcepts.includes('festival music Sweden'));
  assert.ok(page.intentConcepts.includes('orchestra for cultural festivals'));
  assert.ok(page.intentConcepts.length <= 6);
  assert.equal(page.visibleText.includes('festival music Sweden'), false);
});

test('indexes a past archive only when real past events exist', () => {
  const fixture = structuredClone(seoFixture);
  fixture.events.push({
    ...fixture.events[0],
    id: 'event-past',
    title: 'Tidigare världsmusikkonsert',
    date: '2026-05-10',
    updatedAt: '2026-05-11T10:00:00.000Z',
  });

  const page = resolveSeoPage('/events/past', fixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });

  assert.equal(page.kind, 'event-archive');
  assert.equal(page.noindex, false);
  assert.deepEqual(page.events.map((item) => item.id), ['event-past']);
});

test('resolves location index and detail pages from exact D1 locations', () => {
  const index = resolveSeoPage('/locations', seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });
  const detail = resolveSeoPage(
    '/locations/amazon-parkgatan-3-flen',
    seoFixture,
    SITE_ORIGIN,
    { today: '2026-06-13' },
  );
  const unknown = resolveSeoPage(
    '/locations/finns-inte',
    seoFixture,
    SITE_ORIGIN,
    { today: '2026-06-13' },
  );

  assert.equal(index.kind, 'location-index');
  assert.equal(index.noindex, false);
  assert.deepEqual(index.locations.map((item) => item.slug), [
    'amazon-parkgatan-3-flen',
    'klosters-kyrka-eskilstuna',
  ]);
  assert.equal(index.canonicalUrl, `${SITE_ORIGIN}/locations`);

  assert.equal(detail.kind, 'location');
  assert.equal(detail.location.name, 'Amazon, Parkgatan 3, Flen');
  assert.deepEqual(detail.events.map((item) => item.id), ['event-summer']);
  assert.equal(
    detail.canonicalUrl,
    `${SITE_ORIGIN}/locations/amazon-parkgatan-3-flen`,
  );
  assert.match(detail.description, /Amazon, Parkgatan 3, Flen/);

  assert.equal(unknown.kind, 'unknown');
  assert.equal(unknown.noindex, true);
});

test('renders archive metadata and CollectionPage JSON-LD without visible intent copy', () => {
  const page = resolveSeoPage('/events', seoFixture, SITE_ORIGIN, {
    today: '2026-06-13',
  });
  const head = renderHead(page);
  const graph = renderJsonLd(page)['@graph'];
  const collection = graph.find((item) => item['@type'] === 'CollectionPage');
  const itemList = graph.find((item) => item['@type'] === 'ItemList');
  const events = graph.filter((item) => item['@type'] === 'Event');
  const noscript = renderNoscript(page);
  const markdown = renderMarkdown(page);

  assert.match(head, /rel="canonical" href="https:\/\/flen-varldsorkester\.pages\.dev\/events"/);
  assert.match(head, /property="og:title" content="Evenemang/);
  assert.ok(collection);
  assert.equal(collection.url, `${SITE_ORIGIN}/events`);
  assert.ok(collection.keywords.includes('world music Sweden'));
  assert.equal(itemList.itemListElement.length, 2);
  assert.equal(events.length, 2);
  assert.match(noscript, /Sommarkonsert/);
  assert.match(markdown, /\[Sommarkonsert\]\(\/flen-varldsorkester\/evenemang\/event-summer\)/);
  assert.doesNotMatch(noscript, /world music Sweden/);
  assert.doesNotMatch(markdown, /world music Sweden/);
});

test('renders location Place JSON-LD and the same D1 fields in noscript and Markdown', () => {
  const page = resolveSeoPage(
    '/locations/amazon-parkgatan-3-flen',
    seoFixture,
    SITE_ORIGIN,
    { today: '2026-06-13' },
  );
  const graph = renderJsonLd(page)['@graph'];
  const place = graph.find((item) => item['@type'] === 'Place');
  const noscript = renderNoscript(page);
  const markdown = renderMarkdown(page);

  assert.equal(place.name, 'Amazon, Parkgatan 3, Flen');
  for (const value of [
    'Sommarkonsert',
    '2026-08-15',
    '18:00',
    'Amazon, Parkgatan 3, Flen',
    'Fri entré för unga.',
  ]) {
    assert.match(noscript, new RegExp(value));
    assert.match(markdown, new RegExp(value));
  }
});

function event(overrides) {
  return {
    id: 'event',
    sectionId: 'section-fvo',
    childPageId: null,
    title: 'Evenemang',
    date: '2026-06-13',
    time: '18:00',
    location: 'Amazon, Flen',
    description: 'Beskrivning',
    image: '',
    status: 'published',
    updatedAt: '2026-06-01T10:00:00.000Z',
    ...overrides,
  };
}
