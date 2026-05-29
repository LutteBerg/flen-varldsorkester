import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';
import MediaManager from './MediaManager';

const EMPTY = {
  sectionId: '',
  slug: '',
  title: '',
  shortDescription: '',
  body: '',
  coverImage: '',
  status: 'draft',
};

export default function AdminChildPages() {
  const [sections, setSections] = useState([]);
  const [childPages, setChildPages] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const readOnly = contentRepository.isReadOnly();

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snapshot = readOnly
        ? await contentRepository.getContent()
        : await contentRepository.getAdminContent();
      setSections(snapshot.sections || []);
      const flat = [];
      for (const s of (snapshot.sections || [])) {
        for (const c of (s.childPages || [])) {
          flat.push({ ...c, sectionTitle: s.title, sectionSlug: s.slug });
        }
      }
      setChildPages(flat);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function startCreate() {
    setError('');
    setIsNew(true);
    setEditing({ ...EMPTY, sectionId: sections[0]?.id || '' });
  }
  function startEdit(cp) {
    setError('');
    setIsNew(false);
    setEditing({ ...cp });
  }

  async function handleSave() {
    setError('');
    if (!editing.sectionId || !editing.title || !editing.slug) {
      setError('Sektion, titel och slug krävs.');
      return;
    }
    setSaved(false);
    setSaving(true);
    try {
      if (isNew) await contentRepository.createChildPage(editing);
      else       await contentRepository.updateChildPage(editing.id, editing);
      setSaved(true);
      await load();
      setTimeout(() => { setSaved(false); setEditing(null); }, 1200);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Är du säker på att du vill radera denna undersida?')) return;
    try {
      await contentRepository.deleteChildPage(id);
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  if (editing) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="admin-card">
          <h3 style={{ marginBottom: 24 }}>{isNew ? 'Skapa undersida' : `Redigera: ${editing.title}`}</h3>

          {error && <div className="admin-login-error">{error}</div>}
          {saved && <div className="admin-save-ok" role="status">Sparat ✓</div>}

          <div className="form-group">
            <label className="form-label">Sektion (förälder)</label>
            <select className="form-control" value={editing.sectionId || ''} onChange={(e) => setEditing({ ...editing, sectionId: e.target.value })}>
              <option value="">Välj sektion</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Titel</label>
            <input className="form-control" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Slug (URL-vänlig)</label>
            <input className="form-control" value={editing.slug} placeholder="t.ex. musaik-projektet" onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Kort beskrivning</label>
            <textarea className="form-control" style={{ minHeight: 80 }} value={editing.shortDescription || ''} onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Brödtext</label>
            <textarea className="form-control" value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Bild för Hero (URL eller /assets/...)</label>
            <input className="form-control" value={editing.coverImage || ''} onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="published">Publicerad</option>
              <option value="draft">Utkast</option>
            </select>
          </div>

          {!isNew && editing.id && (
            <MediaManager
              parent={{ childPageId: editing.id }}
              existing={[...(editing.videos || []), ...(editing.galleryImages || [])]}
              onChange={load}
            />
          )}

          <div className="btn-group">
            <button className="btn-primary" onClick={handleSave} disabled={readOnly || saving}>
              {readOnly ? 'Read-only (dev)' : (saving ? 'Sparar...' : 'Spara')}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Avbryt</button>
          </div>
          {readOnly && <p style={{ marginTop: 12, color: '#856404', fontSize: '0.85rem' }}>Utvecklingsläge: ändringar går inte att spara.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3>Undersidor</h3>
        <button className="btn-primary" onClick={startCreate} disabled={readOnly}>+ Skapa undersida</button>
      </div>
      {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sektion</th>
              <th>Titel</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {childPages.map(cp => (
              <tr key={cp.id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{cp.sectionTitle}</td>
                <td style={{ fontWeight: 500 }}>{cp.title}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{cp.slug}</td>
                <td>
                  <span style={{
                    padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem',
                    background: cp.status === 'published' ? '#e6f4ea' : '#f1f3f4',
                    color: cp.status === 'published' ? '#137333' : '#5f6368',
                  }}>
                    {cp.status === 'published' ? 'Publicerad' : 'Utkast'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', marginRight: 8 }} onClick={() => startEdit(cp)}>Redigera</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'red' }} onClick={() => handleDelete(cp.id)} disabled={readOnly}>Radera</button>
                </td>
              </tr>
            ))}
            {childPages.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>Inga undersidor ännu.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// MediaAssignmentSection is retained as a compatibility alias — Sections.jsx
// imports it by name. The new implementation lives in MediaManager.jsx and
// supports both image upload (R2) and per-item Edit.
export { default as MediaAssignmentSection } from './MediaManager';
