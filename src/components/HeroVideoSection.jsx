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
//       * The video autoplays MUTED and STAYS muted. We never turn the
//         sound on automatically — browsers block autoplay-with-sound, and
//         per Lutte's request we no longer unmute on scroll/click either.
//       * Sound is strictly opt-in: the always-visible "Slå på ljudet"
//         button (next to pause/restart) lets the visitor enable audio
//         with a single deliberate click.
//
// Props:
//   video         - { videoId, embedUrl, url, title } -- required for video mode
//   title         - section title (rendered in the bottom ribbon)
//   backTo        - { to, label } -- optional back link rendered on top of overlay
//   fallbackImage - URL used when no video is supplied (image hero instead)
//   variant       - 'dark' (default) | 'light' -- controls the ribbon background
//                   so a child page on a white surround doesn't draw a hard line

export default function HeroVideoSection({ video, title, backTo, fallbackImage, variant = 'dark', externalPaused = false }) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef(null);
  // Once the visitor takes manual control (pause / mute / restart) OR the
  // page pauses the hero from outside (e.g. a gallery video opens), we stop
  // the scroll/gesture auto-unmute+autoplay so the video STAYS stopped/muted
  // and does not jump back to life on the next scroll.
  const userControlledRef = useRef(false);

  // If the parent swaps to a different video, reset local controls.
  useEffect(() => {
    setMuted(true);
    setPlaying(true);
    setReloadKey((k) => k + 1);
    userControlledRef.current = false;
  }, [video?.videoId, video?.embedUrl]);

  // External pause: when the page signals it (a gallery/preview video was
  // opened), stop the hero video and lock it so scrolling won't restart it.
  useEffect(() => {
    if (!video || !externalPaused) return;
    userControlledRef.current = true;
    setPlaying(false);
    sendCommand('pauseVideo');
  }, [externalPaused, video]);

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

  // The URL is intentionally FROZEN to muted autoplay. Mute/pause/restart are
  // driven through IFrame-API postMessage commands instead of URL changes:
  // deriving the URL from state remounted the iframe on every toggle, and a
  // fresh iframe with mute=0&autoplay=1 never starts on iOS (autoplay with
  // sound is blocked there), so tapping the sound button killed the video on
  // iPhones. Commands keep the already-playing player alive.
  //
  // YouTube only accepts IFrame-API postMessage commands (our playVideo poke)
  // when the embed URL's `origin` matches the parent page. Without it the
  // command is dropped and the player sits on the poster with a red play
  // button on mobile. Compute it at render (SPA — window is always present).
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const src =
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1` +
    `&mute=1` +
    `&loop=1` +
    `&playlist=${id}` +
    `&controls=0` +
    `&modestbranding=1` +
    `&rel=0` +
    `&playsinline=1` +
    `&enablejsapi=1` +
    (origin ? `&origin=${encodeURIComponent(origin)}` : '');

  // Send an IFrame-API command to the live player. Must be called
  // synchronously from the user's tap so iOS treats it as gesture-driven.
  function sendCommand(func, args = []) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    } catch { /* cross-origin postMessage must not throw, but be safe */ }
  }

  function toggleMute() {
    // Manual sound toggle = the visitor is in control now. Don't force play,
    // and don't let scroll re-assert audio afterwards.
    userControlledRef.current = true;
    if (muted) {
      sendCommand('unMute');
      sendCommand('setVolume', [100]);
    } else {
      sendCommand('mute');
    }
    setMuted((m) => !m);
  }
  function togglePlay() {
    userControlledRef.current = true;
    sendCommand(playing ? 'pauseVideo' : 'playVideo');
    setPlaying((p) => !p);
  }
  function restart() {
    userControlledRef.current = true;
    sendCommand('seekTo', [0, true]);
    sendCommand('playVideo');
    setPlaying(true);
  }

  // Kick MUTED playback as soon as the iframe is ready. The URL already carries
  // autoplay=1&mute=1, but browsers honor autoplay for third-party iframes only
  // intermittently — an explicit playVideo via the IFrame API (enablejsapi=1)
  // makes the muted autostart reliable. We NEVER send unMute here: audio stays
  // off until the visitor presses the sound button. Fires on every (re)mount
  // via the iframe key, and respects a manual pause (playing === false).
  function startMutedPlayback() {
    if (!playing) return;
    const poke = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      } catch { /* cross-origin postMessage must not throw, but be safe */ }
    };
    poke();
    // Retry across the brief window where the player's message handler isn't
    // listening yet on slower connections.
    setTimeout(poke, 400);
    setTimeout(poke, 1200);
  }

  return (
    <>
    <section className={`hero-video-section hero-video-section--${variant}`}>
      <div className="hero-video-bg" aria-hidden="true">
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={src}
          onLoad={startMutedPlayback}
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
