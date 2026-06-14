import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('font stylesheet is discoverable in HTML without a CSS @import waterfall', async () => {
  const [html, css] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
  ]);

  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);
  assert.match(
    html,
    /rel="stylesheet"[\s\S]*?href="https:\/\/fonts\.googleapis\.com\/css2\?/,
  );
  assert.doesNotMatch(css, /@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com/);
});

test('every React img reserves intrinsic space with width and height', async () => {
  const sourceRoot = new URL('../src/', import.meta.url);
  const files = await collectFiles(sourceRoot, '.jsx');
  const missing = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/<img\b[\s\S]*?\/?>/g)) {
      if (!/\bwidth=/.test(match[0]) || !/\bheight=/.test(match[0])) {
        missing.push(`${file.pathname}:${source.slice(0, match.index).split('\n').length}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test('public archive routes reuse existing event-card design without changing admin routes', async () => {
  const [app, list, eventArchive, locationArchive] = await Promise.all([
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/EventArchiveList.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/EventArchive.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/LocationArchive.jsx', import.meta.url), 'utf8'),
  ]);

  for (const route of [
    '/events',
    '/events/upcoming',
    '/events/past',
    '/locations',
    '/locations/:locationSlug',
  ]) {
    assert.match(app, new RegExp(`path="${escapeRegExp(route)}"`));
  }

  for (const adminRoute of [
    '/admin/login',
    '/admin',
    'global',
    'sections',
    'child-pages',
    'news',
    'events',
  ]) {
    assert.match(app, new RegExp(`path="${escapeRegExp(adminRoute)}"`));
  }

  assert.match(list, /className="events-list"/);
  assert.match(list, /className="designed-event-card event-card-link"/);
  assert.match(list, /to=\{event\.detailPath\}/);
  assert.match(list, /event\.title/);
  assert.match(list, /event\.date/);
  assert.match(list, /event\.time/);
  assert.match(list, /event\.location/);
  assert.match(list, /event\.description/);
  assert.match(eventArchive, /filterArchiveEvents/);
  assert.match(locationArchive, /groupEventsByLocation/);
  assert.doesNotMatch(app, /pages\/admin\/.*Archive/);
});

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await collectFiles(url, extension));
    else if (entry.name.endsWith(extension)) files.push(url);
  }
  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
