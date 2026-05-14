import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function News() {
  const [news, setNews] = useState([]);
  const [sections, setSections] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await contentRepository.getNews();
    const sData = await contentRepository.getSections();
    setNews(data);
    setSections(sData);
  }

  const handleEdit = (item) => {
    setIsNew(false);
    setEditingItem({ ...item });
  };

  const handleCreate = () => {
    setIsNew(true);
    const dateStr = new Date().toISOString().split('T')[0];
    setEditingItem({ title: '', excerpt: '', body: '', date: dateStr, sectionId: '', status: 'published', image: '' });
  };

  const handleDelete = async (id) => {
    if (confirm('Är du säker på att du vill radera denna nyhet?')) {
      await contentRepository.deleteNews(id);
      load();
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
  };

  const handleChange = (e, field) => {
    setEditingItem({ ...editingItem, [field]: e.target.value });
  };

  const handleSave = async () => {
    if (isNew) {
      await contentRepository.createNews(editingItem);
    } else {
      await contentRepository.updateNews(editingItem.id, editingItem);
    }
    setEditingItem(null);
    load();
  };

  if (editingItem) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="admin-card">
          <h3 style={{ marginBottom: '24px' }}>{isNew ? 'Skapa Nyhet' : 'Redigera Nyhet'}</h3>
          
          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editingItem.title} onChange={(e) => handleChange(e, 'title')} />
          </div>

          <div className="form-group">
            <label className="form-label">Datum</label>
            <input type="date" className="form-control" value={editingItem.date} onChange={(e) => handleChange(e, 'date')} />
          </div>

          <div className="form-group">
            <label className="form-label">Relaterad Sektion (Frivilligt)</label>
            <select className="form-control" value={editingItem.sectionId || ''} onChange={(e) => handleChange(e, 'sectionId')}>
              <option value="">Ingen specifik sektion (Visas överallt)</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={editingItem.status} onChange={(e) => handleChange(e, 'status')}>
              <option value="published">Publicerad</option>
              <option value="draft">Utkast</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Sammanfattning (Excerpt)</label>
            <textarea className="form-control" style={{minHeight: '80px'}} value={editingItem.excerpt} onChange={(e) => handleChange(e, 'excerpt')} />
          </div>

          <div className="form-group">
            <label className="form-label">Brödtext</label>
            <textarea className="form-control" value={editingItem.body} onChange={(e) => handleChange(e, 'body')} />
          </div>

          <div className="btn-group">
            <button className="btn-primary" onClick={handleSave}>Spara</button>
            <button className="btn-secondary" onClick={handleCancel}>Avbryt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleCreate}>+ Skapa Nyhet</button>
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
                <td style={{ fontWeight: '500' }}>{n.title}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                    background: n.status === 'published' ? '#e6f4ea' : '#f1f3f4',
                    color: n.status === 'published' ? '#137333' : '#5f6368'
                  }}>
                    {n.status === 'published' ? 'Publicerad' : 'Utkast'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', marginRight: '8px' }} onClick={() => handleEdit(n)}>
                    Redigera
                  </button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'red' }} onClick={() => handleDelete(n.id)}>
                    Radera
                  </button>
                </td>
              </tr>
            ))}
            {news.length === 0 && (
              <tr><td colSpan="4" style={{textAlign: 'center', padding: '24px'}}>Inga nyheter hittades.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
