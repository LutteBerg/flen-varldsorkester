import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import './HeroVideoSection.css';

// Section hero with a looping YouTube background and a minimal title ribbon.
//
// Phase 4 design:
//   - The video occupies the whole hero. A bottom-only gradient ribbon
//     darkens roughly the bottom third so the title remains readable.
//   - Only the TITLE renders inside the hero (and optionally a "back" link).
//     The lead/short description is intentionally NOT rendered here -- the
//     caller is responsible for placing it in the body content area below.
//   - Sound:
//       * Browsers block autoplay with sound until there's a user gesture.
//         The iframe always loads muted so it actually starts playing.
//       * On the first user gesture anywhere on the page (pointerdown /
//         touchstart / click / keydown), we remount the iframe with
//         autoplay=1&mute=0. The click is the user activation YouTube
//         needs to allow sound.
//       * If that first attempt didn't actually unmute (e.g. the gesture
//         was consumed by a child element before our handler ran), the
//         always-visible "Slå på ljudet" button stays available as a fallback.
//
// Props:
//   video         - { videoId, embedUrl, url, title } -- required for video mode
//   title         - section title (rendered in the bottom ribbon)
//   backTo        - { to, label } -- optional back link rendered on top of overlay
//   fallbackImage - URL used when no video is supplied (image hero instead)
//   variant       - 'dark' (default) | 'light' -- controls the ribbon background
//                   so a child page on a white surround doesn't draw a hard line

export default function HeroVideoSection({ video, title, backTo, fallbackImage, variant = 'dark' }) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef(null);
  const mutedRef = useRef(true);
  mutedRef.current = muted;

  // If the parent swaps to a different video, reset local controls.
  useEffect(() => {
    setMuted(true);
    setPlaying(true);
    setReloadKey((k) => k + 1);
  }, [video?.videoId, video?.embedUrl]);

  // Auto-unmute on user gesture — belt-and-braces, every visit.
  //
  // We use TWO independent paths because each one has a failure mode:
  //   (a) postMessage `unMute` to the loaded YouTube player. Works at any
  //       time AFTER the iframe has fully loaded. Fails silently if the
  //       gesture arrives before the player is ready.
  //   (b) Remount the iframe with `mute=0`. Works regardless of player
  //       ready state — the new iframe always loads cleanly. The trade-off
  //       is a brief reload flicker.
  //
  // On the first muted gesture we do BOTH. If postMessage wins, the iframe
  // unmutes instantly; if it loses (too early), the remount catches it.
  // Repeated gestures after we're already unmuted are no-ops.
  //
  // Browser autoplay policy note:
  //   `scroll` and `wheel` events are NOT user activations per the HTML
  //   spec — browsers will not allow audio to start from a scroll alone,
  //   no matter what we do. The visible "Slå på ljudet" pill stays as
  //   the fallback for users who never click.
  useEffect(() => {
    if (!video) return;

    const postUnmute = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
        win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [100] }), '*');
        win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } catch { /* cross-origin postMessage must not throw, but be safe */ }
    };

    const handleGesture = () => {
      if (!mutedRef.current) {
        // Already unmuted — still re-assert in case YouTube dropped state
        // on bfcache restore. Cheap to send.
        postUnmute();
        return;
      }
      // First muted gesture: do both paths.
      postUnmute();
      setMuted(false);
      setReloadKey((k) => k + 1);
    };

    // Only events that count as user activations per HTML spec are
    // *guaranteed* to let YouTube unmute. We also listen to scroll/wheel
    // as a courtesy — postMessage will run, and on some browsers/MEI
    // profiles it succeeds. On most browsers scroll alone won't, and
    // that's a browser policy we cannot override.
    const events = ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'keyup', 'scroll', 'wheel'];
    const opts = { capture: true, passive: true };
    events.forEach((ev) => document.addEventListener(ev, handleGesture, opts));

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleGesture, true));
    };
  }, [video]);

  if (!video) {
    return (
      <section className={`hero-video-section hero-video-section--image hero-video-section--${variant}`}>
        {fallbackImage && (
          <div
            className="hero-video-bg-img"
            style={{ backgroundImage: `url(${fallbackImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="hero-video-ribbon" aria-hidden="true" />
        <HeroOverlayContent title={title} backTo={backTo} />
      </section>
    );
  }

  const id = video.videoId || extractId(video.embedUrl || video.url || '');
  if (!id) {
    return (
      <section className={`hero-video-section hero-video-section--image hero-video-section--${variant}`}>
        {fallbackImage && (
          <div
            className="hero-video-bg-img"
            style={{ backgroundImage: `url(${fallbackImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="hero-video-ribbon" aria-hidden="true" />
        <HeroOverlayContent title={title} backTo={backTo} />
      </section>
    );
  }

  const muteParam = muted ? '1' : '0';
  const autoplayParam = playing ? '1' : '0';
  const src =
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=${autoplayParam}` +
    `&mute=${muteParam}` +
    `&loop=1` +
    `&playlist=${id}` +
    `&controls=0` +
    `&modestbranding=1` +
    `&rel=0` +
    `&playsinline=1` +
    `&enablejsapi=1`;

  function toggleMute() {
    setMuted((m) => !m);
    setPlaying(true);
    setReloadKey((k) => k + 1);
  }
  function togglePlay() {
    setPlaying((p) => !p);
    setReloadKey((k) => k + 1);
  }
  function restart() {
    setPlaying(true);
    setReloadKey((k) => k + 1);
  }

  return (
    <>
    <section className={`hero-video-section hero-video-section--${variant}`}>
      <div className="hero-video-bg" aria-hidden="true">
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={src}
          title={video.title || 'Bakgrundsvideo'}
          frameBorder="0"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex="-1"
        />
      </div>

      <div className="hero-video-ribbon" aria-hidden="true" />

      <HeroOverlayContent title={title} backTo={backTo} />

      <div className="hero-video-controls">
        {muted ? (
          <button
            type="button"
            onClick={toggleMute}
            className="hero-video-btn hero-video-btn--unmute"
            aria-label="Slå på ljudet"
          >
            <VolumeX size={18} aria-hidden="true" />
            <span className="hero-video-btn-label">Slå på ljudet</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleMute}
            className="hero-video-btn"
            aria-label="Stäng av ljudet"
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={togglePlay}
          className="hero-video-btn"
          aria-label={playing ? 'Pausa video' : 'Spela upp video'}
        >
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={restart}
          className="hero-video-btn"
          aria-label="Starta om från början"
        >
          <RotateCcw size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
    </>
  );
}

function HeroOverlayContent({ title, backTo }) {
  return (
    <>
      {backTo && (
        <div className="hero-video-backwrap">
          <div className="container">
            <Link to={backTo.to} className="hero-video-back">
              <ArrowLeft size={20} aria-hidden="true" />
              <span className="text-uppercase">{backTo.label}</span>
            </Link>
          </div>
        </div>
      )}
      <div className="container hero-video-content">
        {title && <h1 className="hero-video-title">{title}</h1>}
      </div>
    </>
  );
}

function extractId(input) {
  if (!input) return null;
  const m = input.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
