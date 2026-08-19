import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroVideo } from '../src/lib/heroMedia.js';

const VIDEOS = [
  { id: 'v-gallery-1', pinned: true,  title: 'Tillagd i galleriet' },
  { id: 'v-hero',      pinned: false, title: 'Vald som topp-video' },
];

test('a section set to photo keeps the photo even when a gallery video is pinned', () => {
  // Regression: Lutte added a YouTube link to Målarateljen's gallery and
  // ticked "Fäst överst"; it took over the top of the page.
  const section = { heroMediaType: 'image', heroVideoId: '', coverImage: '/foto.jpg' };
  assert.equal(resolveHeroVideo(section, VIDEOS), null);
});

test('a section set to video shows exactly the chosen video, not the pinned one', () => {
  const section = { heroMediaType: 'video', heroVideoId: 'v-hero' };
  assert.equal(resolveHeroVideo(section, VIDEOS)?.id, 'v-hero');
});

test('adding more gallery videos never changes the chosen hero video', () => {
  const section = { heroMediaType: 'video', heroVideoId: 'v-hero' };
  const withNewUpload = [{ id: 'v-brand-new', pinned: true }, ...VIDEOS];
  assert.equal(resolveHeroVideo(section, withNewUpload)?.id, 'v-hero');
});

test('a chosen video that no longer exists falls back to the photo, not to another video', () => {
  const section = { heroMediaType: 'video', heroVideoId: 'v-deleted' };
  assert.equal(resolveHeroVideo(section, VIDEOS), null);
});

test('child pages (no heroMediaType) follow heroVideoId only', () => {
  assert.equal(resolveHeroVideo({ heroVideoId: 'v-hero' }, VIDEOS)?.id, 'v-hero');
  assert.equal(resolveHeroVideo({ heroVideoId: '' }, VIDEOS), null);
  assert.equal(resolveHeroVideo({}, VIDEOS), null);
});

test('legacy rows without heroVideoId still show a video when the type says so', () => {
  const legacy = { heroMediaType: 'video' };
  assert.equal(resolveHeroVideo(legacy, VIDEOS)?.id, 'v-gallery-1');
});

test('missing or empty inputs are handled', () => {
  assert.equal(resolveHeroVideo(null, VIDEOS), null);
  assert.equal(resolveHeroVideo({ heroMediaType: 'video', heroVideoId: 'x' }, undefined), null);
  assert.equal(resolveHeroVideo({ heroMediaType: 'video' }, []), null);
});

// ── cover-image URLs in inline CSS ────────────────────────────────────────
import { cssUrl } from '../src/lib/heroMedia.js';

test('cover images with spaces still render (quoted CSS url)', () => {
  // Målarateljen's cover really is "/assets/malarateljen/130 x 200.jpeg".
  // Unquoted, the browser drops the declaration and the hero turns black.
  assert.equal(cssUrl('/assets/malarateljen/130 x 200.jpeg'), 'url("/assets/malarateljen/130 x 200.jpeg")');
});

test('cssUrl escapes quotes and backslashes and tolerates empty values', () => {
  assert.equal(cssUrl('/a/b"c.jpg'), 'url("/a/b\\"c.jpg")');
  assert.equal(cssUrl('/a\\b.jpg'), 'url("/a\\\\b.jpg")');
  assert.equal(cssUrl(''), 'url("")');
  assert.equal(cssUrl(undefined), 'url("")');
});
