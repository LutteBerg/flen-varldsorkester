import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function News() {
  const [news, setNews] = useState([]);
  const [sections, setSections] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const readOnly = contentRepository.isReadOnly();

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const snapshot = readOnly
        ? await contentRepository.getContent()
        : await contentRepository.getAdminContent();
      setNews(snapshot.news || []);
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
    setEditingItem({ title: '', excerpt: '', body: '', date: dateStr, sectionId: '', status: 'draft', image: '' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Är du säker på att du vill radera denna nyhet?')) return;
    try {
      await contentRepository.deleteNews(id);
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function handleChange(field, value) {
    setEditingItem(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError('');
    try {
      const payload = {
        title: editingItem.title,
        date: editingItem.date,
        excerpt: editingItem.excerpt,
        body: editingItem.body,
        sectionId: editingItem.sectionId || null,
        status: editingItem.status,
        image: editingItem.image,
      };
      if (isNew) await contentRepository.createNews(payload);
      else       await contentRepository.updateNews(editingItem.id, payload);
      setEditingItem(null);
      await load();
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  if (editingItem) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="admin-card">
          <h3 style={{ marginBottom: 24 }}>{isNew ? 'Skapa Nyhet' : 'Redigera Nyhet'}</h3>
          {error && <div className="admin-login-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editingItem.title} onChange={(e) => handleChange('title', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Datum</label>
            <input type="date" className="form-control" value={editingItem.date} onChange={(e) => handleChange('date', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Relaterad Sektion (frivilligt)</label>
            <select className="form-control" value={editingItem.sectionId || ''} onChange={(e) => handleChange('sectionId', e.target.value)}>
              <option value="">Ingen specifik sektion (visas överallt)</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={editingItem.status} onChange={(e) => handleChange('status', e.target.value)}>
              <option value="published">Publicerad</option>
              <option value="draft">Utkast</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sammanfattning</label>
            <textarea className="form-control" style={{minHeight: 80}} value={editingItem.excerpt} onChange={(e) => handleChange('excerpt', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Brödtext</label>
            <textarea className="form-control" value={editingItem.body} onChange={(e) => handleChange('body', e.target.value)} />
          </div>

          <div className="btn-group">
            <button className="btn-primary" onClick={handleSave} disabled={readOnly}>{readOnly ? 'Read-only (dev)' : 'Spara'}</button>
            <button className="btn-secondary" onClick={() => setEditingItem(null)}>Avbryt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleCreate} disabled={readOnly}>+ Skapa Nyhet</button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Titel</th>
              <th>Status</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {news.map(n => (
              <tr key={n.id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{n.date}</td>
                <td style={{ fontWeight: 500 }}>{n.title}</td>
                <td>
                  <span style={{
                    padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem',
                    background: n.status === 'published' ? '#e6f4ea' : '#f1f3f4',
                    color: n.status === 'published' ? '#137333' : '#5f6368'
                  }}>
                    {n.status === 'published' ? 'Publicerad' : 'Utkast'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', marginRight: 8 }} onClick={() => handleEdit(n)}>Redigera</button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'red' }} onClick={() => handleDelete(n.id)} disabled={readOnly}>Radera</button>
                </td>
              </tr>
            ))}
            {news.length === 0 && (
              <tr><td colSpan={4} style={{textAlign: 'center', padding: 24}}>Inga nyheter hittades.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
