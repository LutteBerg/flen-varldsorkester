import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [sections, setSections] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
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
      setEvents(snapshot.events || []);
      setSections(snapshot.sections || []);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function handleEdit(item) {
    setError('');
    setIsNew(false);
    setEditingItem({ ...item });
  }
  function handleCreate() {
    setError('');
    setIsNew(true);
    const dateStr = new Date().toISOString().split('T')[0];
    setEditingItem({ title: '', date: dateStr, time: '18:00', location: 'Amazon, Flen', description: '', sectionId: '', childPageId: '', status: 'draft', image: '' });
  }
  // Same "section OR child page" picker as News.jsx.
  function targetValue(item) {
    if (item.childPageId) return `child:${item.childPageId}`;
    if (item.sectionId)   return `sec:${item.sectionId}`;
    return '';
  }
  function setTarget(value) {
    if (!value) {
      handleChange('sectionId',   '');
      handleChange('childPageId', '');
      return;
    }
    const [kind, id] = value.split(':');
    if (kind === 'child') {
      handleChange('sectionId',   '');
      handleChange('childPageId', id);
    } else {
      handleChange('sectionId',   id);
      handleChange('childPageId', '');
    }
  }
  async function handleDelete(id) {
    if (!window.confirm('Är du säker på att du vill radera detta evenemang?')) return;
    try {
      await contentRepository.deleteEvent(id);
      await load();
    } catch (e) { setError(e.message || String(e)); }
  }
  function handleChange(field, value) {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  }
  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const payload = {
        title: editingItem.title,
        date: editingItem.date,
        time: editingItem.time,
        location: editingItem.location,
        description: editingItem.description,
        sectionId:   editingItem.childPageId ? null : (editingItem.sectionId || null),
        childPageId: editingItem.childPageId || null,
        status: editingItem.status,
        image: editingItem.image,
      };
      if (isNew) await contentRepository.createEvent(payload);
      else       await contentRepository.updateEvent(editingItem.id, payload);
      setSaved(true);
      await load();
      setTimeout(() => { setSaved(false); setEditingItem(null); }, 1200);
    } catch (e) { setError(e.message || String(e)); }
    finally { setSaving(false); }
  }

  if (editingItem) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="admin-card">
          <h3 style={{ marginBottom: 24 }}>{isNew ? 'Skapa Evenemang' : 'Redigera Evenemang'}</h3>
          {error && <div className="admin-login-error">{error}</div>}
          {saved && <div className="admin-save-ok" role="status">Sparat ✓</div>}

          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editingItem.title} onChange={(e) => handleChange('title', e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input type="date" className="form-control" value={editingItem.date} onChange={(e) => handleChange('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tid</label>
              <input type="time" className="form-control" value={editingItem.time} onChange={(e) => handleChange('time', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Plats</label>
            <input type="text" className="form-control" value={editingItem.location} onChange={(e) => handleChange('location', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Bild (URL eller sökväg, valfritt)</label>
            <input
              type="text"
              className="form-control"
              placeholder="/assets/events/foo.jpg eller https://..."
              value={editingItem.image || ''}
              onChange={(e) => handleChange('image', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Visas på sida (välj sektion eller undersida)</label>
            <select
              className="form-control"
              value={targetValue(editingItem)}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Ingen specifik</option>
              {sections.map(s => (
                <React.Fragment key={s.id}>
                  <option value={`sec:${s.id}`}>{s.title}</option>
                  {(s.childPages || []).map(cp => (
                    <option key={cp.id} value={`child:${cp.id}`}>
                      &nbsp;&nbsp;↳ {s.title} / {cp.title}
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
            <p style={{fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4}}>
              T.ex. <em>Flen Världsorkester / Musaik Projektet</em> — då visas evenemanget endast på Musaik-sidan.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={editingItem.status} onChange={(e) => handleChange('status', e.target.value)}>
              <option value="published">Publicerad</option>
              <option value="draft">Utkast</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Beskrivning</label>
            <textarea className="form-control" value={editingItem.description} onChange={(e) => handleChange('description', e.target.value)} />
          </div>

          <div className="btn-group">
            <button className="btn-primary" onClick={handleSave} disabled={readOnly || saving}>
              {readOnly ? 'Read-only (dev)' : (saving ? 'Sparar...' : 'Spara')}
            </button>
            <button className="btn-secondary" onClick={() => setEditingItem(null)} disabled={saving}>Avbryt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleCreate} disabled={readOnly}>+ Skapa Evenemang</button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Datum</th><th>Titel</th><th>Plats</th><th>Status</th><th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{e.date} {e.time}</td>
                <td style={{ fontWeight: 500 }}>{e.title}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{e.location}</td>
                <td>
                  <span style={{
                    padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem',
                    background: e.status === 'published' ? '#e6f4ea' : '#f1f3f4',
                    color: e.status === 'published' ? '#137333' : '#5f6368'
                  }}>
                    {e.status === 'published' ? 'Publicerad' : 'Utkast'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', marginRight: 8 }} onClick={() => handleEdit(e)}>Redigera</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'red' }} onClick={() => handleDelete(e.id)} disabled={readOnly}>Radera</button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: 24}}>Inga evenemang hittades.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
