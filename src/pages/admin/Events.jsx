import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [sections, setSections] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await contentRepository.getEvents();
    const sData = await contentRepository.getSections();
    setEvents(data);
    setSections(sData);
  }

  const handleEdit = (item) => {
    setIsNew(false);
    setEditingItem({ ...item });
  };

  const handleCreate = () => {
    setIsNew(true);
    const dateStr = new Date().toISOString().split('T')[0];
    setEditingItem({ title: '', date: dateStr, time: '18:00', location: 'Amazon, Flen', description: '', sectionId: '', status: 'published', image: '' });
  };

  const handleDelete = async (id) => {
    if (confirm('Är du säker på att du vill radera detta evenemang?')) {
      await contentRepository.deleteEvent(id);
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
      await contentRepository.createEvent(editingItem);
    } else {
      await contentRepository.updateEvent(editingItem.id, editingItem);
    }
    setEditingItem(null);
    load();
  };

  if (editingItem) {
    return (
      <div className="animate-fade-in max-w-3xl">
        <div className="admin-card">
          <h3 style={{ marginBottom: '24px' }}>{isNew ? 'Skapa Evenemang' : 'Redigera Evenemang'}</h3>
          
          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editingItem.title} onChange={(e) => handleChange(e, 'title')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input type="date" className="form-control" value={editingItem.date} onChange={(e) => handleChange(e, 'date')} />
            </div>
            <div className="form-group">
              <label className="form-label">Tid</label>
              <input type="time" className="form-control" value={editingItem.time} onChange={(e) => handleChange(e, 'time')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Plats</label>
            <input type="text" className="form-control" value={editingItem.location} onChange={(e) => handleChange(e, 'location')} />
          </div>

          <div className="form-group">
            <label className="form-label">Relaterad Sektion (Frivilligt)</label>
            <select className="form-control" value={editingItem.sectionId || ''} onChange={(e) => handleChange(e, 'sectionId')}>
              <option value="">Ingen specifik sektion</option>
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
            <label className="form-label">Beskrivning</label>
            <textarea className="form-control" value={editingItem.description} onChange={(e) => handleChange(e, 'description')} />
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
        <button className="btn-primary" onClick={handleCreate}>+ Skapa Evenemang</button>
      </div>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Titel</th>
              <th>Plats</th>
              <th>Status</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td style={{ color: 'var(--color-text-muted)' }}>{e.date} {e.time}</td>
                <td style={{ fontWeight: '500' }}>{e.title}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{e.location}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                    background: e.status === 'published' ? '#e6f4ea' : '#f1f3f4',
                    color: e.status === 'published' ? '#137333' : '#5f6368'
                  }}>
                    {e.status === 'published' ? 'Publicerad' : 'Utkast'}
                  </span>
                </td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', marginRight: '8px' }} onClick={() => handleEdit(e)}>
                    Redigera
                  </button>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'red' }} onClick={() => handleDelete(e.id)}>
                    Radera
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan="5" style={{textAlign: 'center', padding: '24px'}}>Inga evenemang hittades.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
