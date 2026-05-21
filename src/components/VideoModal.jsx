import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import './VideoModal.css';

// Lightbox modal that plays a single YouTube video in an overlay.
//
// Props:
//   isOpen   - whether to render the modal
//   onClose  - called on × click, Esc, or backdrop click
//   videoId  - YouTube video id (preferred)
//   embedUrl - or a normalized https://www.youtube.com/embed/<id> URL
//   url      - raw URL fallback (we extract the id)
//   title    - accessible iframe title; also rendered as caption when shown
//
// A11y notes:
//   - role="dialog" + aria-modal="true"
//   - focus is moved to the close button on open and restored on close
//   - keyboard trapping keeps Tab focus inside the modal while open
//   - background scroll is locked while open
export default function VideoModal({ isOpen, onClose, videoId, embedUrl, url, title }) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

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

  // Auto-play once the modal opens (user-initiated click satisfies autoplay rules).
  const iframeSrc = `${src}?autoplay=1&rel=0&modestbranding=1`;

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  const accessibleTitle = title || 'YouTube video';

  return (
    <div
      className="video-modal-backdrop"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="video-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={accessibleTitle}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="video-modal-close"
          onClick={handleClose}
          aria-label="Stäng video"
        >
          <X size={28} aria-hidden="true" />
        </button>

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

        {title && <div className="video-modal-caption">{title}</div>}
      </div>
    </div>
  );
}
