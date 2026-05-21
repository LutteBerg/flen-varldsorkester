import React, { useEffect, useRef } from 'react';
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

  if (mode === 'background') {
    // enablejsapi=1 lets us send commands (e.g. unMute) via postMessage once
    // the user makes a gesture. Browsers silently mute autoplay without one.
    const bgSrc = `${src}?enablejsapi=1&autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&rel=0&modestbranding=1&playsinline=1`;
    return <BackgroundVideoIframe src={bgSrc} title={title} className={className} />;
  }

  const inlineSrc = `${src}?rel=0`;
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

// Background-mode iframe + one-shot auto-unmute on first user gesture.
// Browsers silently mute autoplay until the user interacts with the page,
// so we keep the URL muted (so it actually starts) and post unMute on any
// click / key / scroll / touch — feels "automatic with sound" to the user.
function BackgroundVideoIframe({ src, title, className }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    const unmute = () => {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        try {
          win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
          win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
        } catch {
          // postMessage to cross-origin iframe should not throw, but be safe.
        }
      }
      events.forEach(ev => document.removeEventListener(ev, unmute, true));
    };
    events.forEach(ev =>
      document.addEventListener(ev, unmute, { capture: true, passive: true })
    );
    return () => events.forEach(ev => document.removeEventListener(ev, unmute, true));
  }, []);

  return (
    <div className={`video-hero-wrapper ${className}`}>
      <div className="video-hero-overlay" />
      <iframe
        ref={iframeRef}
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
      <img src={thumbUrl} alt="Video thumbnail" loading="lazy" />
      <div className="play-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
    </div>
  );
}
