import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { linkify } from '../lib/linkify';
import './NewsModal.css';

// Popup that shows a single news item in full: image (if the admin added
// one), title, date, and the full body text with clickable links.
//
// Portal into document.body for the same reason as VideoModal — an ancestor
// `transform` (from .animate-fade-in) would otherwise capture position:fixed.
export default function NewsModal({ isOpen, onClose, item }) {
  const dialogRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeBtnRef.current && closeBtnRef.current.focus(), 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !item) return null;

  const dateLabel = item.date
    ? new Date(item.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) handleClose();
  }

  const modal = (
    <div className="news-modal-backdrop" onClick={onBackdropClick} role="presentation">
      <div
        ref={dialogRef}
        className="news-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={item.title || 'Nyhet'}
      >
        <button
          ref={closeBtnRef}
          type="button"
          className="news-modal-close"
          onClick={handleClose}
          aria-label="Stäng"
        >
          <X size={24} aria-hidden="true" />
        </button>

        {item.image && (
          <div className="news-modal-image">
            <img
              src={item.image}
              alt={item.title || ''}
              width="1600"
              height="900"
            />
          </div>
        )}

        <div className="news-modal-body">
          {dateLabel && <div className="news-modal-date">{dateLabel}</div>}
          {item.title && <h2 className="news-modal-title">{item.title}</h2>}
          {item.excerpt && <p className="news-modal-excerpt">{item.excerpt}</p>}
          {item.body && <div className="news-modal-text">{linkify(item.body)}</div>}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
