import test from 'node:test';
import assert from 'node:assert/strict';
import { prefersMarkdown, renderMarkdown } from '../functions/seo/markdown.js';
import { renderNoscript } from '../functions/seo/render.js';
import { resolveSeoPage } from '../functions/seo/routes.js';
import { SITE_ORIGIN, seoFixture } from './seo-fixture.js';

test('Accept negotiation requires explicit preferred Markdown', () => {
  const cases = [
    [undefined, false],
    ['', false],
    ['text/html', false],
    ['*/*', false],
    ['text/*', false],
    ['text/markdown', true],
    ['text/markdown, text/html', true],
    ['text/html;q=0.8, text/markdown;q=0.8', true],
    ['text/html;q=0.9, text/markdown;q=0.8', false],
    ['text/html;q=0.4, text/markdown;q=0.8', true],
    ['text/markdown;q=0, text/html;q=0', false],
    ['text/markdown;q=0.7, text/*;q=0.9', false],
    ['text/markdown;q=0.9, */*;q=0.5', true],
    ['text/markdown;q=0.5, text/html;q=0.4, */*;q=0.9', true],
    ['TEXT/MARKDOWN; charset=utf-8; Q=0.9, TEXT/HTML;Q=0.8', true],
    ['application/json, text/markdown;q=invalid', false],
  ];

  for (const [accept, expected] of cases) {
    assert.equal(prefersMarkdown(accept), expected, accept || '(missing)');
  }
});

test('renders semantic Markdown for every public route kind', () => {
  const fixture = fixtureWithChildNews();
  const cases = [
    {
      path: '/',
      includes: [
        '# Kulturföreningen FlenVärldsOrkester',
        'Den kreativa mötesplatsen i Flen.',
        '[FlenVärldsOrkester](/flen-varldsorkester)',
      ],
    },
    {
      path: '/about',
      includes: [
        '# Om Amazon i Flen',
        'Kulturföreningen driver verksamheter i Amazon, Flen.',
      ],
    },
    {
      path: '/contact',
      includes: [
        '# Kontakt & Praktisk Information',
        '## Hitta hit',
        'Parkgatan 3, 642 31 Flen',
        '**E-post:** lutteberg@gmail.com',
      ],
    },
    {
      path: '/flen-varldsorkester',
      includes: [
        '# FlenVärldsOrkester',
        'Vi spelar musik över alla gränser.',
        '[Musaik Projektet](/flen-varldsorkester/musaik-projektet)',
        '## Praktisk Information',
        '## Evenemang',
        '## Galleri',
        'Orkestern på scen',
        '### FlenVärldsOrkester live',
      ],
    },
    {
      path: '/flen-varldsorkester/musaik-projektet',
      includes: [
        '# Musaik Projektet',
        'Musaik samlar människor genom musik.',
        '## Senaste Nyheterna',
        '### Musaik växer',
        '## Evenemang',
        'Musaik i Klosters kyrka',
      ],
    },
    {
      path: '/flen-varldsorkester/evenemang',
      includes: [
        '# Kommande Evenemang',
        '[Sommarkonsert](/flen-varldsorkester/evenemang/event-summer)',
        '2026-08-15',
        '18:00',
        'Amazon, Parkgatan 3, Flen',
        'Fri entré för unga.',
      ],
    },
    {
      path: '/flen-varldsorkester/evenemang/event-summer',
      includes: [
        '# Sommarkonsert',
        '2026-08-15',
        '18:00',
        'Amazon, Parkgatan 3, Flen',
        'Fri entré för unga.',
      ],
    },
    {
      path: '/jazz-world-music-club/nyheter',
      includes: [
        '# Alla Nyheter',
        '2026-06-10',
        '## Klubbscenen öppnar',
        'Vi öppnar dörrarna för fredagsjazz.',
      ],
    },
    {
      path: '/flen-varldsorkester/galleri',
      includes: [
        '# Galleri',
        'Orkestern på scen',
        '### FlenVärldsOrkester live',
      ],
    },
  ];

  for (const { path, includes } of cases) {
    const markdown = renderMarkdown(resolveSeoPage(path, fixture, SITE_ORIGIN));
    for (const expected of includes) {
      assert.match(markdown, new RegExp(escapeRegExp(expected)), `${path}: ${expected}`);
    }
  }
});

test('returns empty Markdown for unknown and admin routes', () => {
  assert.equal(
    renderMarkdown(resolveSeoPage('/missing', seoFixture, SITE_ORIGIN)),
    '',
  );
  assert.equal(
    renderMarkdown(resolveSeoPage('/admin/login', seoFixture, SITE_ORIGIN)),
    '',
  );
});

test('escapes Markdown control syntax from D1 without inventing content', () => {
  const fixture = structuredClone(seoFixture);
  fixture.global.aboutText = '# Rubrik\n[extern](https://example.test) *betoning*';
  const markdown = renderMarkdown(resolveSeoPage('/about', fixture, SITE_ORIGIN));

  assert.match(markdown, /\\# Rubrik/);
  assert.match(markdown, /\\\[extern\\\]\(https:\/\/example\.test\)/);
  assert.match(markdown, /\\\*betoning\\\*/);
  assert.doesNotMatch(markdown, /\n# Rubrik/);
});

test('Markdown text is identical to noscript text for every route kind', () => {
  const fixture = fixtureWithChildNews();
  const paths = [
    '/',
    '/about',
    '/contact',
    '/flen-varldsorkester',
    '/flen-varldsorkester/musaik-projektet',
    '/flen-varldsorkester/evenemang',
    '/flen-varldsorkester/evenemang/event-summer',
    '/jazz-world-music-club/nyheter',
    '/flen-varldsorkester/galleri',
    '/missing',
    '/admin/login',
  ];

  for (const path of paths) {
    const page = resolveSeoPage(path, fixture, SITE_ORIGIN);
    assert.equal(
      normalizeMarkdownText(renderMarkdown(page)),
      normalizeHtmlText(renderNoscript(page)),
      path,
    );
  }
});

function fixtureWithChildNews() {
  const fixture = structuredClone(seoFixture);
  fixture.news.push({
    id: 'news-child',
    title: 'Musaik växer',
    date: '2026-06-11',
    sectionId: 'section-fvo',
    childPageId: 'child-musaik',
    excerpt: 'Projektet möter fler körer.',
    body: 'Fler deltagare samlas genom musik.',
    image: '',
    updatedAt: '2026-06-11T10:00:00.000Z',
  });
  return fixture;
}

function normalizeHtmlText(html) {
  return decodeHtml(
    html
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, '\n'),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMarkdownText(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[ \t]*(?:#{1,6}|[-+*>])\s+/gm, '')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .replace(/\\([\\`*_[\]<>#+.!|-])/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
