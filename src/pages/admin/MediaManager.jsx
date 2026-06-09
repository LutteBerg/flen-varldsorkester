// MediaManager — admin component for managing the media library attached
// to a single parent (a section OR a child page).
//
// Replaces the old MediaAssignmentSection from ChildPages.jsx. Adds:
//   - Image upload from local disk (Phase 2): POST /api/admin/upload → R2.
//   - YouTube link add (preserved from old flow).
//   - Per-item Edit (Phase 3): title, caption, alt, pinned, status.
//   - Per-item Delete (preserved).
//
// Conventions:
//   parent  = { sectionId } | { childPageId } — exactly one. Required.
//   existing = pre-merged list of media (videos + images) to display.
//   onChange() — called after any successful save so the parent reloads.
//
// All operations save immediately; the global "Avbryt" button on the parent
// edit form has never undone media changes, and we keep that behavior (with
// a clear note in the UI).

import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { contentRepository } from '../../lib/cms/contentRepository';
import VideoEmbed from '../../components/VideoEmbed';
import { normalizeYouTubeUrl, YOUTUBE_INVALID_MESSAGE } from '../../lib/youtube';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_ATTR  = ACCEPT_MIMES.join(',');

export default function MediaManager({ parent, existing, onChange }) {
  const readOnly = contentRepository.isReadOnly();
  const [tab, setTab] = useState('upload'); // 'upload' | 'youtube'

  // Edit-in-place state: which item id is currently being edited.
  const [editingId, setEditingId] = useState(null);

  // ── Drag-and-drop ordering ───────────────────────────────────────────────
  // `items` mirrors `existing` but can be reordered live while dragging. On
  // drop we persist the new positions as sort_order via updateMedia.
  const [items, setItems] = useState(existing || []);
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Re-sync when the parent reloads media after any save.
  useEffect(() => { setItems(existing || []); }, [existing]);

  function handleDragStart(index) {
    dragIndexRef.current = index;
  }
  function handleDragOver(e, index) {
    e.preventDefault();
    const from = dragIndexRef.current;
    setDragOverIndex(index);
    if (from === null || from === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndexRef.current = index;
  }
  async function handleDrop() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
    setReordering(true);
    setOrderError('');
    try {
      // Assign a clean sequential sort_order by visible position; only save
      // the rows whose value actually changed.
      const changed = items
        .map((m, idx) => ({ m, idx }))
        .filter(({ m, idx }) => (m.sortOrder ?? 0) !== idx);
      await Promise.all(changed.map(({ m, idx }) =>
        contentRepository.updateMedia(m.id, { sortOrder: idx })
      ));
      if (changed.length > 0 && onChange) onChange();
    } catch (e) {
      setOrderError(e.message || String(e));
      if (onChange) onChange(); // re-sync to the server's truth on failure
    } finally {
      setReordering(false);
    }
  }

  const canReorder = !readOnly && editingId === null && items.length > 1;

  return (
    <div style={{ marginTop: 32, padding: 16, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd' }}>
      <h4 style={{ marginBottom: 4 }}>
        Tilldelad media{' '}
        <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          (sparas direkt)
        </span>
      </h4>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 12 }}>
        Media sparas direkt. Knappen <strong>Avbryt</strong> nedan ångrar bara ändringar i textfälten på sidan — inte mediainställningar.
      </p>

      {/* Existing items list */}
      {(!items || items.length === 0) && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Ingen media tilldelad ännu.</p>
      )}

      {canReorder && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 0, marginBottom: 8 }}>
          Dra raderna i <strong>handtaget</strong> (⠿) för att ändra ordningen. Den första videon/bilden visas först på sidan.
          {reordering && <span style={{ marginLeft: 8, color: 'var(--color-orange)' }}>Sparar ordning…</span>}
        </p>
      )}
      {orderError && <div className="admin-login-error" style={{ marginBottom: 8 }}>{orderError}</div>}

      {items.map((m, index) => (
        <div
          key={m.id}
          className="media-dnd-row"
          draggable={canReorder}
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={handleDrop}
          onDragEnd={handleDrop}
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 6,
            borderRadius: 6,
            background: dragOverIndex === index ? 'rgba(245, 130, 32, 0.08)' : 'transparent',
            outline: dragOverIndex === index ? '1px dashed var(--color-orange)' : 'none',
          }}
        >
          {canReorder && (
            <span
              className="media-drag-handle"
              title="Dra för att ändra ordning"
              aria-hidden="true"
              style={{ display: 'flex', alignItems: 'center', color: '#9a9a9a', cursor: 'grab', paddingLeft: 2 }}
            >
              <GripVertical size={18} />
            </span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <MediaRow
              item={m}
              isEditing={editingId === m.id}
              onStartEdit={() => setEditingId(m.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaved={() => { setEditingId(null); onChange && onChange(); }}
              onChange={onChange}
              readOnly={readOnly}
            />
          </div>
        </div>
      ))}

      <h5 style={{ marginTop: 24, marginBottom: 12 }}>Lägg till ny</h5>

      {/* Add tabs: image upload vs YouTube link */}
      <div className="admin-media-tabs" role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <TabBtn active={tab === 'upload'}  onClick={() => setTab('upload')}>Ladda upp bild</TabBtn>
        <TabBtn active={tab === 'youtube'} onClick={() => setTab('youtube')}>YouTube-länk</TabBtn>
      </div>

      {tab === 'upload' && (
        <UploadForm parent={parent} onSaved={onChange} readOnly={readOnly} />
      )}
      {tab === 'youtube' && (
        <YouTubeForm parent={parent} onSaved={onChange} readOnly={readOnly} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={active ? 'btn-primary' : 'btn-secondary'}
      style={{ padding: '8px 14px', fontSize: '0.9rem' }}
    >
      {children}
    </button>
  );
}

// ── Existing-item row ──────────────────────────────────────────────────────
function MediaRow({ item, isEditing, onStartEdit, onCancelEdit, onSaved, onChange, readOnly }) {
  const isVideo = !!item.videoId;
  const label = (item.title || item.caption || item.url || item.src || '').toString();

  if (isEditing) {
    return (
      <EditMediaForm
        item={item}
        onCancel={onCancelEdit}
        onSaved={onSaved}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #eee' }}>
      <span style={{ flex: 1, fontSize: '0.9rem', minWidth: 0, overflowWrap: 'anywhere' }}>
        <strong>{isVideo ? 'Video' : 'Bild'}:</strong> {label || '(utan titel)'}
        {item.pinned && <span style={{ color: 'var(--color-orange)', marginLeft: 8, fontWeight: 600 }}>(fäst)</span>}
        {item.status === 'draft' && <span style={{ color: '#8a6d3b', marginLeft: 8 }}>(utkast)</span>}
      </span>
      <button
        className="btn-secondary"
        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
        onClick={onStartEdit}
        disabled={readOnly}
      >
        Redigera
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '0.8rem', padding: '6px 10px', color: '#a02828' }}
        onClick={async () => {
          if (!window.confirm('Ta bort denna media?')) return;
          try { await contentRepository.deleteMedia(item.id); onChange && onChange(); }
          catch (e) { window.alert(e.message || String(e)); }
        }}
        disabled={readOnly}
      >
        Ta bort
      </button>
    </div>
  );
}

// ── Edit-in-place form (Phase 3) ───────────────────────────────────────────
function EditMediaForm({ item, onCancel, onSaved, readOnly }) {
  const [title,   setTitle]   = useState(item.title || '');
  const [caption, setCaption] = useState(item.caption || '');
  const [alt,     setAlt]     = useState(item.alt || '');
  const [pinned,  setPinned]  = useState(!!item.pinned);
  const [status,  setStatus]  = useState(item.status || 'published');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    setSaving(true);
    try {
      // Only metadata — URL/file/youtube id intentionally NOT touched.
      await contentRepository.updateMedia(item.id, {
        title, caption, alt, pinned, status,
      });
      onSaved && onSaved();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #eee', background: '#fff', marginBottom: 4, borderRadius: 4, padding: 12 }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Redigera metadata. Själva filen/länken ändras inte.
      </div>
      {error && <div className="admin-login-error">{error}</div>}

      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">Titel</label>
        <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">Bildtext / undertext</label>
        <input className="form-control" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>

      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">Alt-text (tillgänglighet)</label>
        <input
          className="form-control"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Beskriv bilden kort för skärmläsare"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Fäst överst
        </label>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Publicerad</option>
          <option value="draft">Utkast</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary" onClick={save} disabled={readOnly || saving}>
          {saving ? 'Sparar...' : 'Spara ändringar'}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>Avbryt</button>
      </div>
    </div>
  );
}

// ── Upload form (Phase 2) ──────────────────────────────────────────────────
function UploadForm({ parent, onSaved, readOnly }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [alt, setAlt] = useState('');
  const [pinned, setPinned] = useState(false);
  const [status, setStatus] = useState('published');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // We keep the native <input type="file"> in the DOM but hide it.
  // Browsers localize the native "Choose file / No file chosen" labels
  // based on the OS locale, which leaked Russian into a Swedish admin
  // on Lutte's machine. The visible UI below is fully Swedish.
  const fileInputRef = useRef(null);

  function onPickFile(e) {
    setError('');
    setSuccess('');
    const f = e.target.files && e.target.files[0];
    if (!f) { setFile(null); setPreviewUrl(''); return; }
    if (!ACCEPT_MIMES.includes(f.type)) {
      setError('Endast JPG, PNG och WebP stöds.');
      setFile(null); setPreviewUrl('');
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError('Filen är för stor.');
      setFile(null); setPreviewUrl('');
      return;
    }
    setFile(f);
    // Object URL for preview — revoked when component unmounts or new file chosen.
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    // Default title from filename stem (admin can edit before saving).
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function upload() {
    setError('');
    setSuccess('');
    if (!file) { setError('Välj en bild först.'); return; }
    setUploading(true);
    setProgress(0);
    try {
      await contentRepository.uploadMedia(file, {
        ...parent,
        title, caption, alt, pinned, status,
        onProgress: (p) => setProgress(p),
      });
      setSuccess('Bilden laddades upp.');
      setFile(null);
      if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
      setTitle(''); setCaption(''); setAlt(''); setPinned(false); setStatus('published');
      setProgress(0);
      onSaved && onSaved();
    } catch (e) {
      setError(e.message || 'Uppladdningen misslyckades. Försök igen.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {error && <div className="admin-login-error">{error}</div>}
      {success && <div className="admin-save-ok" role="status">{success}</div>}

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Bildfil (JPG, PNG eller WebP, max 10 MB)</label>
        {/* Visually hidden — keeps the form submit behaviour and accept filter
            but suppresses the OS-localized "Choose file/No file chosen" label.
            Triggered by the Swedish button below. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={onPickFile}
          disabled={readOnly || uploading}
          style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={readOnly || uploading}
          >
            Välj bild från datorn
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', overflowWrap: 'anywhere' }}>
            {file ? file.name : 'Ingen bild vald.'}
          </span>
        </div>
      </div>

      {previewUrl && (
        <div style={{ marginBottom: 12 }}>
          <img
            src={previewUrl}
            alt="Förhandsvisning"
            style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4, border: '1px solid #ddd' }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <input className="form-control" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="form-control" placeholder="Bildtext" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <input className="form-control" placeholder="Alt-text (tillgänglighet)" value={alt} onChange={(e) => setAlt(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Fäst överst
        </label>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Publicerad</option>
          <option value="draft">Utkast</option>
        </select>
      </div>

      {uploading && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(progress * 100)}%`,
              background: 'var(--color-orange)',
              transition: 'width 0.15s linear',
            }} />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Laddar upp {Math.round(progress * 100)}%
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={upload} disabled={readOnly || uploading || !file}>
        {uploading ? 'Laddar upp...' : 'Ladda upp och spara'}
      </button>
    </div>
  );
}

// ── YouTube form (preserved from old flow) ─────────────────────────────────
function YouTubeForm({ parent, onSaved, readOnly }) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [pinned, setPinned] = useState(false);
  const [status, setStatus] = useState('published');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const preview = normalizeYouTubeUrl(url);

  async function add() {
    setError('');
    if (!preview) { setError(YOUTUBE_INVALID_MESSAGE); return; }
    setSaving(true);
    try {
      await contentRepository.createMedia({
        type: 'youtube',
        url: url.trim(),
        title, caption, pinned, status,
        ...parent,
      });
      setUrl(''); setTitle(''); setCaption(''); setPinned(false); setStatus('published');
      onSaved && onSaved();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {error && <div className="admin-login-error">{error}</div>}

      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">YouTube-URL (watch / youtu.be / embed)</label>
        <input className="form-control" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
        <input className="form-control" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="form-control" placeholder="Bildtext" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
          Fäst överst
        </label>
        <select className="form-control" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Publicerad</option>
          <option value="draft">Utkast</option>
        </select>
      </div>

      {preview && (
        <div className="admin-video-preview" style={{ marginBottom: 12 }}>
          <VideoEmbed videoId={preview.videoId} title="Förhandsvisning" />
        </div>
      )}

      <button className="btn-primary" onClick={add} disabled={readOnly || saving || !url}>
        {saving ? 'Sparar...' : 'Lägg till YouTube-video'}
      </button>
    </div>
  );
}
