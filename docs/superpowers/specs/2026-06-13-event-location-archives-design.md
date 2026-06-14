# Event And Location Archives Design

## Goal

Add indexable event and location archive routes without changing any existing
public page, owner-authored copy, admin UI, admin workflow, database schema, or
content editing behavior.

## Supported Routes

- `/events`: every published event.
- `/events/upcoming`: published events dated today or later in
  `Europe/Stockholm`.
- `/events/past`: published events dated before today. The route remains
  `noindex` and is omitted from the sitemap while empty.
- `/locations`: groups published events by their existing non-empty `location`.
- `/locations/:slug`: published events whose existing location maps to the
  requested deterministic slug.

Existing event URLs remain canonical:
`/:sectionSlug/evenemang/:eventId`. No event slug migration is introduced.

## Data Boundaries

The routes use only the existing public D1 snapshot:

- `events`: title, date, time, location, description, image, sectionId,
  childPageId, timestamps.
- `sections`: id, slug, title, cover image, child pages.
- `global`: site title and existing organization information.

No programs, artists, genres, translations, booking services, end dates, or
new admin fields are inferred. Empty event locations are excluded from location
archives.

## Public Rendering

Two new public React pages will reuse the existing `section-page`, `container`,
`events-list`, `designed-event-card`, `event-card-link`, `event-meta`, and
`back-link` classes. Event cards will show the same existing event fields and
link to the existing event detail URLs.

No existing React component output or CSS will be changed. No admin file will
be modified. The new pages contain no invented descriptive paragraphs.

## Shared Archive Model

A pure shared module will provide:

- Stockholm-local date classification.
- Published event filtering.
- Stable location slug generation.
- Event-to-section URL resolution.
- Unique location grouping.

Both React pages and the edge SEO page-model will consume this module to avoid
browser/crawler data divergence.

## SEO Page Model

`resolveSeoPage` will resolve the five route families above and expose:

- route kind and canonical URL;
- filtered events and location groups;
- route-specific title and description;
- breadcrumbs;
- `noindex` for empty archives and unknown locations;
- last modification date from the included D1 records;
- a small route-specific list of truthful search intent concepts.

Intent concepts are metadata only. They will not be emitted by React,
`<noscript>`, or Markdown. Examples may include `världsmusik Sverige`,
`Flen Världsorkester`, `MUSAIK`, `community orchestra Sweden`, and
`live world music performance` only where the related D1 sections/events
support them. No `/booking` route or booking claim will be added.

## Metadata And Structured Data

Existing canonical, Open Graph, Twitter, Organization, WebSite, and breadcrumb
handling will be reused.

Archive pages will additionally emit a schema.org `CollectionPage` node with:

- canonical URL, title, description, language, and WebSite relationship;
- `about` concepts selected by the page-model;
- `keywords` containing the same restrained concept list;
- an `ItemList` of real Event nodes for event collections.

Location detail pages will identify the real location as a `Place` and list
only events that use that exact D1 location value.

## Sitemap Rules

The dynamic sitemap will include:

- `/events` only when at least one published event exists;
- `/events/upcoming` only when at least one upcoming event exists;
- `/events/past` only when at least one past event exists;
- `/locations` only when at least one non-empty event location exists;
- one `/locations/:slug` per real non-empty location.

No empty, invented, admin, draft, artist, genre, program, or booking route will
be included.

## Testing

TDD coverage will verify:

- Stockholm date boundary behavior;
- deterministic Swedish location slugs;
- all/upcoming/past filtering;
- empty past archive `noindex`;
- location grouping and unknown location handling;
- canonical, metadata, JSON-LD, `<noscript>`, and Markdown behavior;
- conditional sitemap inclusion;
- existing routes remain unchanged;
- browser screenshots of existing key pages are pixel-identical;
- new archive pages render using existing visual classes;
- admin routes and API behavior remain unchanged.

Production currently has two future events and no past event. Past and
minimal-data cases will therefore be verified with fixtures, not fabricated
public content.
