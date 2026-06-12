import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './VideoModal.css';

// Lightbox modal for either a YouTube video or a full-size image.
//
// Why a Portal: the modal must be `position: fixed` against the viewport.
// Any ancestor with a non-`none` transform (we have one — `.animate-fade-in`
// applies `transform: translateY(0)` permanently via `animation-fill-mode: forwards`)
// becomes the containing block for `position: fixed`, pinning the modal to that
// ancestor instead of the viewport. Rendering into `document.body` sidesteps the
// entire ancestor chain.
//
// Props:
//   isOpen   - whether to render the modal
//   onClose  - called on × click, Esc, or backdrop click
//   videoId  - YouTube video id (preferred when showing a video)
//   embedUrl - or a normalized https://www.youtube.com/embed/<id> URL
//   url      - raw URL fallback (we extract the id)
//   image    - { src, alt } — when set, render an image instead of a video
//   title    - accessible label; also rendered as caption when shown
//
// A11y notes:
//   - role="dialog" + aria-modal="true"
//   - focus is moved to the close button on open and restored on close
//   - keyboard trapping keeps Tab focus inside the modal while open
//   - background scroll is locked while open
export default function VideoModal({ isOpen, onClose, videoId, embedUrl, url, image, title }) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  // Image lightbox zoom: false = fit-to-screen, true = natural/original size
  // (the wrapper becomes scrollable so the visitor can pan around).
  const [zoomed, setZoomed] = useState(false);

  // Reset zoom whenever the modal opens or the shown image changes.
  useEffect(() => { setZoomed(false); }, [isOpen, image && image.src]);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  // Lock body scroll + capture/restore focus.
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = setTimeout(() => {
      if (closeBtnRef.current) closeBtnRef.current.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [isOpen]);

  // Esc to close + simple focus trap (Tab/Shift+Tab cycles within modal).
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusables = dialogRef.current.querySelectorAll(
        'button, [href], iframe, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isImage = !!(image && image.src);

  let iframeSrc = null;
  if (!isImage) {
    let id = videoId;
    let src = embedUrl;
    if (!src && id) {
      src = `https://www.youtube.com/embed/${id}`;
    } else if (!src && url) {
      const m = url.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
      if (m) {
        id = m[1];
        src = `https://www.youtube.com/embed/${id}`;
      }
    }
    if (!src) return null;
    // Modal opens from a real user click → counts as gesture → audio allowed.
    // mute=0 is the YouTube default but we set it explicitly so the URL reads as intent.
    iframeSrc = `${src}?autoplay=1&mute=0&rel=0&modestbranding=1`;
  }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  const accessibleTitle = title || (isImage ? (image.alt || 'Bild') : 'YouTube video');

  const modal = (
    <div
      className="video-modal-backdrop"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`video-modal-dialog${isImage ? ' video-modal-dialog--image' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={accessibleTitle}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="video-modal-close"
          onClick={handleClose}
          aria-label={isImage ? 'Stäng bild' : 'Stäng video'}
        >
          <X size={28} aria-hidden="true" />
        </button>

        {isImage ? (
          <div className={`video-modal-image-wrap${zoomed ? ' is-zoomed' : ''}`}>
            <img
              src={image.src}
              alt={image.alt || title || ''}
              width="1600"
              height="900"
              className={`video-modal-image${zoomed ? ' video-modal-image--zoomed' : ''}`}
              onClick={() => setZoomed((z) => !z)}
              title={zoomed ? 'Klicka för att zooma ut' : 'Klicka för att zooma in'}
            />
          </div>
        ) : (
          <div className="video-modal-frame">
            <iframe
              src={iframeSrc}
              title={accessibleTitle}
              frameBorder="0"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {title && <div className="video-modal-caption">{title}</div>}
      </div>
    </div>
  );

  // Portal escapes any ancestor `transform` containing block.
  return createPortal(modal, document.body);
}
