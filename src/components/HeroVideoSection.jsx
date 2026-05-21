import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './HeroVideoSection.css';

// Section hero with a looping muted YouTube background and an overlay
// title + lead text.
//
// Why this exists separately from the existing video-bg hero in Section.css:
// the existing one is purely decorative (pointer-events:none) so the user
// can't unmute or pause. This hero is the *primary* content for /flen-varldsorkester,
// so the user needs explicit affordances to unmute, pause and restart.
//
// Props:
//   video         - { videoId, embedUrl, url, title } — required for video mode
//   title         - section title (rendered centered on the gradient overlay)
//   lead          - short description (rendered under the title)
//   backTo        - { to, label } — optional back link rendered on top of overlay
//   fallbackImage - URL used when no video is supplied (image hero instead)
//
// Browser autoplay rules: <iframe> autoplay only works when muted. The user
// must initiate sound. Clicking the speaker icon reloads the iframe with
// `mute=0` and `autoplay=1` — the click counts as user gesture so audio plays.

export default function HeroVideoSection({ video, title, lead, backTo, fallbackImage }) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  // Used to force-remount the iframe whenever the user toggles mute or restarts.
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef(null);

  // If the parent swaps to a different video, reset local controls.
  useEffect(() => {
    setMuted(true);
    setPlaying(true);
    setReloadKey((k) => k + 1);
  }, [video?.videoId, video?.embedUrl]);

  if (!video) {
    // No usable video — fall back to a still image hero so the page never
    // breaks because the section has no pinned youtube media.
    return (
      <section className="hero-video-section hero-video-section--image">
        {fallbackImage && (
          <div
            className="hero-video-bg-img"
            style={{ backgroundImage: `url(${fallbackImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="hero-video-gradient" aria-hidden="true" />
        <HeroOverlayContent title={title} lead={lead} backTo={backTo} />
      </section>
    );
  }

  const id = video.videoId || extractId(video.embedUrl || video.url || '');
  if (!id) {
    return (
      <section className="hero-video-section hero-video-section--image">
        {fallbackImage && (
          <div
            className="hero-video-bg-img"
            style={{ backgroundImage: `url(${fallbackImage})` }}
            aria-hidden="true"
          />
        )}
        <div className="hero-video-gradient" aria-hidden="true" />
        <HeroOverlayContent title={title} lead={lead} backTo={backTo} />
      </section>
    );
  }

  // The `playlist=<id>` param is required for `loop=1` to actually loop a
  // single video on YouTube — without it the iframe stops on first end.
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
    `&playsinline=1`;

  function toggleMute() {
    // We force-remount the iframe with the new param value. Posting to the
    // YouTube iframe API would also work but requires loading the YT JS SDK,
    // which is heavier and not worth the dependency for a single button.
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
    <section className="hero-video-section">
      <div className="hero-video-bg" aria-hidden="true">
        <iframe
          ref={iframeRef}
          key={reloadKey}
          src={src}
          title={video.title || 'Bakgrundsvideo'}
          frameBorder="0"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex="-1"
        />
      </div>

      <div className="hero-video-gradient" aria-hidden="true" />

      <HeroOverlayContent title={title} lead={lead} backTo={backTo} />

      <div className="hero-video-controls">
        <button
          type="button"
          onClick={toggleMute}
          className="hero-video-btn"
          aria-label={muted ? 'Slå på ljudet' : 'Stäng av ljudet'}
        >
          {muted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        </button>
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
  );
}

function HeroOverlayContent({ title, lead, backTo }) {
  return (
    <div className="container hero-video-content">
      {backTo && (
        <Link to={backTo.to} className="hero-video-back">
          <ArrowLeft size={20} aria-hidden="true" />
          <span className="text-uppercase">{backTo.label}</span>
        </Link>
      )}
      {title && <h1 className="hero-video-title">{title}</h1>}
      {lead && <p className="hero-video-lead">{lead}</p>}
    </div>
  );
}

function extractId(input) {
  if (!input) return null;
  const m = input.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
