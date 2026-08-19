// Which media belongs at the TOP of a section / child page.
//
// The rule used to be implicit and shared with the gallery: a video flagged
// `pinned` in the media list, or simply the first video of a child page,
// became the page header. So adding a YouTube link to the gallery replaced
// the top of the page — exactly the surprise Lutte hit on Målarateljen.
//
// Now the top of the page has one dedicated control, `heroVideoId`, set only
// in the "Media högst upp på sidan" block of the admin. `pinned` no longer
// touches the header; it only means "show first in the gallery".

export function resolveHeroVideo(owner, videos) {
  if (!owner) return null;
  const list = Array.isArray(videos) ? videos : [];

  // A section explicitly set to show a photo at the top never shows a video,
  // whatever is in its gallery. (Child pages carry no heroMediaType — for
  // them heroVideoId alone decides.)
  if (owner.heroMediaType && owner.heroMediaType !== 'video') return null;

  if (owner.heroVideoId) {
    // Strict match. A deleted/unpublished video simply falls back to the
    // cover photo instead of promoting some other video behind the editor's
    // back.
    return list.find((v) => v && v.id === owner.heroVideoId) || null;
  }

  // Legacy data only: rows written before migration 0005 (and the dev seed
  // fixtures) express "video at the top" with heroMediaType alone.
  if (owner.heroMediaType === 'video') return list[0] || null;

  return null;
}

// Build a CSS `url(...)` value that survives odd file names.
//
// The hero background is set inline from the cover-image path. Unquoted
// url(/assets/…/130 x 200.jpeg) is INVALID CSS — the space ends the token —
// and the browser drops the whole declaration, leaving a black hero. Several
// cover images uploaded through the admin contain spaces, so always quote.
export function cssUrl(value) {
  const safe = String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `url("${safe}")`;
}
