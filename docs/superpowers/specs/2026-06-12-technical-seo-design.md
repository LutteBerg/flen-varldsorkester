# Technical SEO and Crawler Rendering Design

## Goal

Improve the controllable technical SEO surface of
`https://flen-varldsorkester.pages.dev` without changing visible content or
visual design and without breaking the React SPA, `/admin`, Pages Functions,
D1, R2, or PWA behavior.

The server response must expose route-specific metadata, structured data, and
the same Swedish content that the React route displays. The crawler fallback
must not contain extra keywords, claims, links, or prose.

## Baseline

- Production Lighthouse home: Performance 66, Accessibility 82, Best Practices
  100, SEO 83.
- Production `robots.txt` and `sitemap.xml` currently fall through to
  `index.html`.
- Raw HTML currently has one shared title and no description, canonical,
  Open Graph metadata, or useful JSON-LD.
- Raw route bodies currently contain an empty `#root`.
- A verified pre-change backup exists at
  `E:\Lutte Berg\Orchester\_backups\app-pre-seo-2026-06-12-2045`.
- Pre-change screenshots are stored in `output/playwright/before`.

## Chosen Architecture

Use root Pages middleware as the HTML response transformation layer.

1. Existing API/admin authentication behavior runs first and remains
   authoritative for `/api/admin/*`.
2. Non-HTML responses, `/api/*`, `/media/*`, static assets, manifest, service
   worker files, `robots.txt`, `sitemap.xml`, and `llms.txt` are not HTML
   transformed.
3. For public HTML requests, build one published D1 content snapshot using
   `buildContentSnapshot`.
4. Resolve the request pathname into a page model.
5. Generate route-specific metadata, JSON-LD, and a `<noscript>` representation
   from that page model.
6. Transform the existing SPA HTML response. React still mounts into the same
   empty `#root`; the fallback is inserted after it and is invisible when
   JavaScript is enabled.

This avoids hydration conflicts because React does not own the `<noscript>`
node. It also avoids stale build-time content because every HTML response and
the sitemap use current published D1 data.

If D1 is unavailable, the public page must still return the original SPA
response with conservative static defaults. SEO enrichment failure must not
make the site unavailable.

## Module Boundaries

### Content Snapshot

Extend `buildContentSnapshot` with source timestamps needed for sitemap and
article metadata while preserving all existing public property names.

The snapshot remains the sole D1 mapping used by:

- `/api/content`
- route metadata
- JSON-LD
- `<noscript>`
- `sitemap.xml`
- `llms.txt`

### Route Resolver

A pure SEO module accepts:

- origin/site URL
- pathname
- published content snapshot

It returns a normalized page model containing:

- route kind
- canonical path and absolute URL
- title
- description
- image
- breadcrumb entries
- matching section, child page, event, news collection, and media as applicable
- `noindex`
- `lastModified`

Route kinds:

- `/`
- `/about`
- `/contact`
- `/:sectionSlug`
- `/:sectionSlug/:childSlug`
- `/:sectionSlug/evenemang`
- `/:sectionSlug/:childSlug/evenemang`
- `/:sectionSlug/evenemang/:eventId`
- `/:sectionSlug/nyheter`
- `/:sectionSlug/galleri`
- `/admin` and `/admin/*`
- unknown

News items currently open in a modal and do not have a client detail route.
They are represented on the section news-list page and as `NewsArticle`
entities there. The sitemap must not invent inaccessible news detail URLs.

### Head Renderer

The renderer replaces the shared title and injects:

- unique `meta[name=description]`
- absolute canonical
- `og:title`
- `og:description`
- `og:image`
- `og:type`
- `og:url`
- `og:locale=sv_SE`
- `twitter:card=summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`
- route-specific JSON-LD

All attribute and JSON values are escaped. Existing generated Vite/PWA head
elements are preserved.

### Structured Data

Every indexable page receives:

- `Organization` with `PerformingGroup` additional type, official name, URL,
  logo, postal address, email when available, and Facebook `sameAs`
- `WebSite`

Internal pages also receive `BreadcrumbList`.

Content-specific entities:

- Event detail: `Event` with ISO start date/time, status, place/address,
  image, description, organizer, and zero-price SEK offer only when the visible
  event text explicitly says admission is free; otherwise omit `offers`.
- Event lists: an `ItemList` referencing matching event entities.
- News lists: `NewsArticle` entities for the same visible news cards.
- Section and child pages: `VideoObject` entries for videos rendered by that
  page, using embed URL and YouTube thumbnail URL.

Structured data must not assert hidden facts. Missing optional data is omitted.
Organization address may use the user-provided stable organization address:
Parkgatan 3, 642 31 Flen, Sweden, building Amazon.

### Noscript Renderer

Insert one `<noscript id="crawler-content">` immediately after `#root`.

The fallback uses semantic HTML and only route-visible D1 fields:

- Home: site title, home intro, section titles, section short descriptions,
  and the same section links.
- About: visible page heading and global about text.
- Contact: visible page heading and available contact address, email, phone,
  and visible social links.
- Section: section title, short/full description, practical information,
  visible child-page cards, the same section-level news preview, the same event
  preview, and visible gallery captions/video titles.
- Child page: child title, short description, body, the same child news/event
  previews, and visible gallery captions/video titles.
- Event list: visible heading and all events rendered by that list.
- Event detail: event title, date, time, location, image alt/title, and
  description.
- News list: visible heading and all section-level news cards with date, title,
  and excerpt/body fallback.
- Gallery: visible heading and all image captions/video titles for the
  section.

No fallback-only marketing text, geographic variants, synonyms, hidden links,
or repeated keyword blocks are allowed. Static UI labels may be included only
when the corresponding React route displays them.

Automated tests compare the text-bearing fields selected by the resolver
against the fields emitted by the fallback, preventing accidental divergence.

### Crawl Discovery Endpoints

`public/robots.txt`:

- allow normal public crawling
- disallow `/admin`
- explicitly address Googlebot, Bingbot, GPTBot, OAI-SearchBot,
  ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, and
  CCBot without adding restrictive rules
- declare the production sitemap URL

`functions/sitemap.xml.js`:

- dynamically build XML from the published D1 snapshot
- include home, about, contact, section, child, event-list, child event-list,
  news-list, gallery, and event-detail URLs that exist
- exclude `/admin`, drafts, unknown routes, and invented news detail URLs
- provide the most relevant available `lastmod`
- emit valid XML and a short shared-cache policy

`functions/llms.txt.js`:

- dynamically describe the organization and list canonical public routes
- use published D1 titles/descriptions
- contain no secrets, drafts, or invented facts
- emit UTF-8 plain text

## Index and PWA Metadata

Update the static shell to:

- `lang="sv-SE"`
- UTF-8 charset
- viewport
- theme color
- favicon/apple-touch links that point to existing assets
- a correct static default title and description

Update the PWA manifest to use valid Swedish UTF-8 strings and generated icons
that actually exist. Preserve the current service worker API denylist and SPA
navigation behavior.

## Admin Indexing

For `/admin` and every descendant:

- inject `meta[name=robots]` with `noindex, nofollow, noarchive`
- set `X-Robots-Tag: noindex, nofollow, noarchive`
- omit from sitemap and llms route lists

The login UI and authenticated admin APIs must retain existing behavior.

## Performance and Stability

- Add immutable cache headers for Vite `/assets/*`.
- Preserve long immutable R2 media caching.
- Add preconnects for YouTube and YouTube thumbnails.
- Give the current home LCP logo explicit intrinsic dimensions and high fetch
  priority without changing its rendered CSS dimensions.
- Give content images intrinsic dimensions when their dimensions can be
  derived from local assets or captured at upload time. Do not alter CSS
  sizing or layout.
- Preserve lazy loading for non-critical images.
- Keep all functional JavaScript behavior unchanged unless a measured
  performance issue can be fixed without visible change.

No claim that field Core Web Vitals are green will be made from one lab run.
Report Lighthouse lab values and distinguish them from CrUX field data.

## Testing Strategy

Use Node's built-in test runner for pure SEO modules.

Tests are written before implementation and cover:

- route resolution for every route kind
- exact canonical URL generation
- unique titles/descriptions
- escaping hostile/special content
- admin noindex
- event association with child pages
- JSON-LD required properties and omission of unsupported claims
- sitemap URL inclusion/exclusion and XML escaping
- `<noscript>` exact field parity with route-visible data
- fallback behavior when content or optional values are missing

Pages runtime integration is tested with `wrangler pages dev dist` and the
configured local/remote D1 binding available to the project.

## Verification Matrix

### Build and Static Checks

- `npm run lint`
- full automated test suite
- `npm run build`
- bundle verification/postbuild
- inspect generated manifest and service worker behavior

### Raw HTML

Use both Googlebot and GPTBot user agents against:

- `/`
- `/about`
- `/contact`
- `/jazz-world-music-club`
- `/flen-varldsorkester/musaik-projektet`
- `/flen-varldsorkester/evenemang`
- one real event detail URL
- `/admin/login`

Verify raw HTML without JavaScript contains:

- route-specific Swedish fallback text
- unique title
- description
- canonical
- Open Graph and Twitter metadata
- parseable JSON-LD
- admin noindex where applicable

### Discovery

- `robots.txt` returns `text/plain`, not SPA HTML
- `sitemap.xml` returns valid XML containing every real generated URL
- `llms.txt` returns `text/plain`
- sitemap URLs resolve and `/admin` is absent

### Structured Data

- parse every JSON-LD script locally
- validate graph shapes against schema.org properties in automated tests
- run Google Rich Results Test for supported Event markup and
  Schema.org Validator for Organization/Event/VideoObject/NewsArticle when the
  external services are reachable

### Visual Identity

At 1280x720, capture the same routes stored in
`output/playwright/before` into `output/playwright/after`.

Pixel-compare before/after screenshots. Any difference must be investigated;
metadata and `<noscript>` changes are expected to produce zero visible
difference with JavaScript enabled.

### Application Regression

- public content loads from `/api/content`
- event detail and child-page event routing work
- `/admin/login` renders
- protected `/api/admin/*` still returns the expected authentication response
- R2 `/media/*` headers/content remain valid
- manifest and service worker files load successfully
- no browser console errors on representative public and admin pages

### Lighthouse

Run Lighthouse against the tested production-equivalent server and report:

- Performance
- Accessibility
- Best Practices
- SEO
- LCP
- CLS
- TBT/INP proxy

Target SEO is 100. If an uncontrollable external/runtime condition prevents
100, report the exact failed audit rather than claiming success.

## Deployment Boundary

Implementation and local/full-stack verification do not automatically deploy
production. A production deploy changes an external system and must be
explicitly authorized before `wrangler pages deploy` is run.

