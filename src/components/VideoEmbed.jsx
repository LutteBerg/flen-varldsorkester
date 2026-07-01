import React from 'react';
import { normalizeYouTubeUrl } from '../lib/youtube';

// Reusable responsive 16:9 YouTube embed.
//
// Props:
//   videoId  - if you already have the normalized id, pass it directly
//   url      - otherwise pass a raw URL; we normalize it
//   embedUrl - or pass an already-normalized embedUrl
//   title    - accessible iframe title (default: 'YouTube video')
//   mode     - 'inline' (default) | 'background' (autoplay, muted, looped)
//   className - extra class names
//
// Returns null for missing/invalid input.

export default function VideoEmbed({ videoId, url, embedUrl, title = 'YouTube video', mode = 'inline', className = '' }) {
  let id = videoId;
  let src = embedUrl;

  if (!id && !src && url) {
    const norm = normalizeYouTubeUrl(url);
    if (norm) {
      id = norm.videoId;
      src = norm.embedUrl;
    }
  } else if (!src && id) {
    src = `https://www.youtube.com/embed/${id}`;
  } else if (!id && src) {
    const m = src.match(/embed\/([A-Za-z0-9_-]+)/);
    if (m) id = m[1];
  }

  if (!src) return null;

  // IMPORTANT: build the iframe URL via URLSearchParams so we don't accidentally
  // produce a `?si=...?autoplay=1` double-`?` if the upstream `src` already
  // contains a query string (e.g. `embed/<id>?si=RN8...`). When that happened,
  // the second `?` got consumed into the `si` value and YouTube silently
  // dropped autoplay/mute/controls/rel — the symptom the old AUDIT_REPORT
  // flagged as P1. `appendParams` works whether `src` is bare or already has `?`.
  if (mode === 'background') {
    // Autoplay is forced MUTED (browsers block autoplay-with-sound). We do
    // NOT auto-unmute — sound is opt-in via the HeroVideoSection button.
    const bgSrc = appendParams(src, {
      enablejsapi: '1',
      autoplay: '1',
      mute: '1',
      controls: '0',
      loop: '1',
      playlist: id,
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
    });
    return <BackgroundVideoIframe src={bgSrc} title={title} className={className} />;
  }

  const inlineSrc = appendParams(src, { rel: '0' });
  return (
    <div className={`video-wrapper ${className}`}>
      <iframe
        width="100%"
        height="100%"
        src={inlineSrc}
        title={title}
        frameBorder="0"
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Background-mode iframe. Autoplays MUTED and stays muted — we never unmute
// automatically on scroll/click/touch. (Public hero video now lives in
// HeroVideoSection, which exposes an explicit opt-in "sound on" button.)
function BackgroundVideoIframe({ src, title, className }) {
  return (
    <div className={`video-hero-wrapper ${className}`}>
      <div className="video-hero-overlay" />
      <iframe
        className="video-hero-iframe"
        src={src}
        title={title}
        frameBorder="0"
        loading="lazy"
        allow="autoplay; encrypted-media"
        tabIndex="-1"
      />
    </div>
  );
}

// Safely append query params to a URL that may already have a query string.
// We don't use `new URL()` because the iframe `src` is sometimes a relative-
// looking string we don't want to resolve against window.location.
function appendParams(src, params) {
  if (!params) return src;
  const qs = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  if (!qs) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}${qs}`;
}

// Thumbnail (no iframe) — used in gallery previews.
export function VideoThumbnail({ videoId, url, className = '' }) {
  let id = videoId;
  if (!id && url) {
    const norm = normalizeYouTubeUrl(url);
    if (norm) id = norm.videoId;
  }
  if (!id) return null;
  const thumbUrl = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return (
    <div className={`video-thumb-wrapper ${className}`}>
      <img
        src={thumbUrl}
        alt="Video thumbnail"
        width="480"
        height="360"
        loading="lazy"
      />
      <div className="play-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
    </div>
  );
}
