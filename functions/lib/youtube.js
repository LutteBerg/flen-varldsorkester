// YouTube URL normalizer.
//
// Accepts:
//   - https://www.youtube.com/watch?v=ID   (and variants with extra query)
//   - https://youtu.be/ID                   (and with ?si=...)
//   - https://www.youtube.com/embed/ID      (and with ?si=...)
//   - Also tolerates missing "www." and http:// schemes.
//
// Returns: { videoId, embedUrl } where embedUrl is the canonical
// https://www.youtube.com/embed/<id> form. Returns null for anything
// that isn't a recognizable YouTube URL.
//
// SECURITY: rejects raw HTML / iframe input. Only string URLs accepted.

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,}$/;

export function normalizeYouTubeUrl(input) {
  if (typeof input !== 'string') return null;
  const url = input.trim();
  if (!url) return null;

  // Reject anything that looks like HTML (defense-in-depth — admin form
  // also filters this, but server-side check is the boundary).
  if (/[<>]/.test(url)) return null;

  let videoId = null;

  // youtube.com/watch?v=ID
  let m = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (m) videoId = m[1];

  // youtu.be/ID
  if (!videoId) {
    m = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
    if (m) videoId = m[1];
  }

  // youtube.com/embed/ID
  if (!videoId) {
    m = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]+)/);
    if (m) videoId = m[1];
  }

  if (!videoId || !VIDEO_ID_RE.test(videoId)) return null;

  return {
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}

export const YOUTUBE_INVALID_MESSAGE =
  'Ogiltig YouTube-länk. Klistra in en länk som börjar med youtube.com/watch?v=, youtu.be/ eller youtube.com/embed/.';
