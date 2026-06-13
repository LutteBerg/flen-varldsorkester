# Event And Location Archives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add D1-backed event and location archives with route-specific invisible SEO metadata while preserving every existing public and admin page.

**Architecture:** A pure shared archive module will classify events and derive location slugs for both React and Pages Functions. New React routes will reuse current event-card classes without touching existing components. The existing SEO page-model, renderers, and sitemap will gain archive route kinds driven by the same shared data.

**Tech Stack:** React 19, React Router 7, Cloudflare Pages Functions, D1 snapshot page-model, HTMLRewriter, node:test.

---

### Task 1: Shared Event Archive Model

**Files:**
- Create: `src/lib/eventArchives.js`
- Create: `test/seo-archives.test.js`

- [ ] **Step 1: Write failing tests for Stockholm date boundaries, indexable events, location slugs, and location grouping**

Cover:

```js
assert.deepEqual(
  filterArchiveEvents(snapshot, 'upcoming', '2026-06-13').map((event) => event.id),
  ['today', 'future'],
);
assert.deepEqual(
  filterArchiveEvents(snapshot, 'past', '2026-06-13').map((event) => event.id),
  ['past'],
);
assert.equal(locationSlug('Folkets hus, Hälleforsnäs'), 'folkets-hus-halleforsnas');
assert.equal(eventDetailPath(event, snapshot), '/flen-varldsorkester/evenemang/event-1');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test test/seo-archives.test.js
```

Expected: module-not-found failure for `src/lib/eventArchives.js`.

- [ ] **Step 3: Implement pure shared helpers**

Export:

```js
stockholmDateKey(now)
indexableEvents(snapshot)
filterArchiveEvents(snapshot, mode, today)
locationSlug(value)
groupEventsByLocation(snapshot)
eventDetailPath(event, snapshot)
```

Only published events with a matching section and existing title/date are
indexable. Location groups exclude blank locations.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test test/seo-archives.test.js
```

Expected: all shared-model tests pass.

### Task 2: SEO Page Models And Intent Concepts

**Files:**
- Modify: `functions/seo/routes.js`
- Modify: `test/seo-routes.test.js`
- Modify: `test/seo-archives.test.js`

- [ ] **Step 1: Add failing route tests**

Verify:

- `/events`, `/events/upcoming`, `/events/past`;
- empty past archives are `noindex`;
- `/locations` and `/locations/:slug`;
- unknown location slugs are `noindex`;
- canonical URLs and D1-derived owner/location descriptions;
- intent concepts exist in page metadata but are absent from `visibleText`.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```powershell
node --test test/seo-routes.test.js test/seo-archives.test.js
```

Expected: archive routes resolve as `unknown`.

- [ ] **Step 3: Extend `resolveSeoPage`**

Add route kinds:

```text
event-archive
location-index
location
```

Use an optional `{ today }` fourth argument for deterministic tests. Build
descriptions from real related section/child-page names. Generate at most six
truthful route-specific intent concepts. Do not add concepts to `visibleText`.

- [ ] **Step 4: Run route tests and verify GREEN**

Run:

```powershell
node --test test/seo-routes.test.js test/seo-archives.test.js
```

Expected: all archive page-model tests pass.

### Task 3: Metadata, JSON-LD, Noscript, And Markdown

**Files:**
- Modify: `functions/seo/render.js`
- Modify: `functions/seo/markdown.js`
- Modify: `test/seo-render.test.js`
- Modify: `test/seo-markdown.test.js`
- Modify: `test/seo-archives.test.js`

- [ ] **Step 1: Add failing renderer tests**

Verify:

- `CollectionPage` for all archive pages;
- real `Event` nodes and `ItemList`;
- location detail `Place`;
- route intent appears only in head/JSON-LD;
- `<noscript>` and Markdown contain the same D1 event fields;
- intent phrases do not appear in `<noscript>` or Markdown.

- [ ] **Step 2: Run renderer tests and verify RED**

Run:

```powershell
node --test test/seo-render.test.js test/seo-markdown.test.js test/seo-archives.test.js
```

Expected: missing archive rendering/schema assertions fail.

- [ ] **Step 3: Implement archive rendering**

Reuse the existing canonical, OG, Twitter, Event, Organization, WebSite, and
BreadcrumbList paths. Add one `CollectionPage`, one archive `ItemList`, and
real Event/Place nodes. Extend `<noscript>` and Markdown only with visible D1
fields and archive headings.

- [ ] **Step 4: Run renderer tests and verify GREEN**

Run:

```powershell
node --test test/seo-render.test.js test/seo-markdown.test.js test/seo-archives.test.js
```

Expected: all renderer and anti-cloaking tests pass.

### Task 4: Conditional Sitemap

**Files:**
- Modify: `functions/seo/sitemap.js`
- Modify: `test/seo-discovery.test.js`

- [ ] **Step 1: Add failing sitemap tests**

Assert that:

```text
/events                 requires at least one indexable event
/events/upcoming        requires at least one upcoming event
/events/past            requires at least one past event
/locations              requires at least one location
/locations/:slug        requires that exact D1 location group
```

- [ ] **Step 2: Run discovery tests and verify RED**

Run:

```powershell
node --test test/seo-discovery.test.js
```

Expected: new URLs are absent.

- [ ] **Step 3: Extend sitemap collection**

Accept an optional `{ today }` argument for deterministic date filtering and
append only page-model routes that are indexable and backed by the snapshot.

- [ ] **Step 4: Run discovery tests and verify GREEN**

Run:

```powershell
node --test test/seo-discovery.test.js
```

Expected: conditional sitemap tests pass.

### Task 5: Public React Routes

**Files:**
- Create: `src/components/EventArchiveList.jsx`
- Create: `src/pages/EventArchive.jsx`
- Create: `src/pages/LocationArchive.jsx`
- Modify: `src/App.jsx`
- Modify: `test/seo-static.test.js`

- [ ] **Step 1: Add failing static route/component tests**

Verify that the new routes exist, admin route declarations are unchanged, no
admin file is modified, and the new components use the existing event-card CSS
classes and existing detail URL convention.

- [ ] **Step 2: Run the static test and verify RED**

Run:

```powershell
node --test test/seo-static.test.js
```

Expected: route/component assertions fail.

- [ ] **Step 3: Add the routes and components**

`EventArchiveList` renders the existing card structure from D1 fields.
`EventArchive` selects all/upcoming/past from the URL mode.
`LocationArchive` renders grouped locations or one location group.
No existing page or stylesheet is changed.

- [ ] **Step 4: Run static tests and verify GREEN**

Run:

```powershell
node --test test/seo-static.test.js
```

Expected: public route and preservation assertions pass.

### Task 6: Full Verification

**Files:**
- No production file changes.

- [ ] **Step 1: Run changed-file lint**

```powershell
npx eslint src/App.jsx src/lib/eventArchives.js src/components/EventArchiveList.jsx src/pages/EventArchive.jsx src/pages/LocationArchive.jsx functions/seo/routes.js functions/seo/render.js functions/seo/markdown.js functions/seo/sitemap.js test/seo-archives.test.js test/seo-routes.test.js test/seo-render.test.js test/seo-markdown.test.js test/seo-discovery.test.js test/seo-static.test.js
```

- [ ] **Step 2: Run all tests**

```powershell
npm test
```

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

- [ ] **Step 4: Run local Pages server and HTTP checks**

Verify HTML, Markdown, canonical, JSON-LD, noindex empty past, sitemap,
robots, API, admin, and three fixture event variants.

- [ ] **Step 5: Capture before/after screenshots**

Compare existing home, section, child, event, about, contact, and admin pages.
Application-rendered pixels must be identical; external YouTube frames may be
masked as dynamic third-party content.

- [ ] **Step 6: Report without deployment**

List changed files, routes, SEO behavior, missing-data limitations, local test
commands, and explicitly state:

```text
Existing visible content changed: none.
Admin UI/workflow changes: none.
Production deploy: not performed.
```
