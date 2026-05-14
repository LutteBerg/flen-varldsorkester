import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await contentRepository.getSections();
    setSections(data);
  }

  const handleEdit = (section) => {
    setEditingSection({ ...section });
  };

  const handleCancel = () => {
    setEditingSection(null);
  };

  const handleChange = (e, field) => {
    setEditingSection({ ...editingSection, [field]: e.target.value });
  };

  const handleArrayChange = (field, index, subfield, value) => {
    const arr = [...(editingSection[field] || [])];
    if (subfield) {
      arr[index] = { ...arr[index], [subfield]: value };
    } else {
      arr[index] = value;
    }
    setEditingSection({ ...editingSection, [field]: arr });
  };

  const addArrayItem = (field, defaultItem) => {
    setEditingSection({
      ...editingSection,
      [field]: [...(editingSection[field] || []), defaultItem]
    });
  };

  const removeArrayItem = (field, index) => {
    const arr = [...(editingSection[field] || [])];
    arr.splice(index, 1);
    setEditingSection({ ...editingSection, [field]: arr });
  };

  const handleSave = async () => {
    await contentRepository.updateSection(editingSection.id, editingSection);
    setEditingSection(null);
    load();
  };

  if (editingSection) {
    return (
      <div className="animate-fade-in">
        <div className="admin-card">
          <h3 style={{ marginBottom: '24px' }}>Redigera Sektion: {editingSection.title}</h3>
          
          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editingSection.title} onChange={(e) => handleChange(e, 'title')} />
          </div>

          <div className="form-group" style={{marginTop: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd'}}>
            <h4 style={{marginBottom: '16px'}}>Media i början av sidan (Hero)</h4>
            
            <label className="form-label">Vad ska visas högst upp?</label>
            <select className="form-control" style={{marginBottom: '16px'}} value={editingSection.heroMediaType || 'image'} onChange={(e) => handleChange(e, 'heroMediaType')}>
              <option value="image">Fast Bild (Foto)</option>
              <option value="video">Bakgrundsvideo (Kräver fäst video)</option>
            </select>

            <label className="form-label">Bild URL (om "Fast Bild" är valt)</label>
            <input type="text" className="form-control" placeholder="/assets/..." value={editingSection.coverImage || ''} onChange={(e) => handleChange(e, 'coverImage')} />
            <p style={{fontSize: '0.85rem', color: '#666', marginTop: '8px'}}>För video, lägg till en video i listan nedan och markera "Fäst överst".</p>
          </div>
          
          <div className="form-group" style={{marginTop: '24px'}}>
            <label className="form-label">Kort Beskrivning (För startsidan)</label>
            <input type="text" className="form-control" value={editingSection.shortDescription} onChange={(e) => handleChange(e, 'shortDescription')} />
          </div>

          <div className="form-group">
            <label className="form-label">Lång Beskrivning</label>
            <textarea className="form-control" value={editingSection.fullDescription} onChange={(e) => handleChange(e, 'fullDescription')} />
          </div>

          <div className="form-group">
            <label className="form-label">Praktisk Information</label>
            <textarea className="form-control" value={editingSection.practicalInfo || ''} onChange={(e) => handleChange(e, 'practicalInfo')} />
          </div>

          {/* Gallery Images */}
          <div className="form-group" style={{marginTop: '32px', borderTop: '1px solid #ddd', paddingTop: '24px'}}>
            <h3 style={{marginBottom: '16px'}}>Bildgalleri</h3>
            {(editingSection.galleryImages || []).map((img, idx) => (
              <div key={idx} style={{display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center'}}>
                <input type="text" placeholder="Bild URL (/assets/...)" className="form-control" value={img.src || ''} onChange={(e) => handleArrayChange('galleryImages', idx, 'src', e.target.value)} />
                <input type="text" placeholder="Bildtext" className="form-control" value={img.caption || ''} onChange={(e) => handleArrayChange('galleryImages', idx, 'caption', e.target.value)} />
                <button className="btn-secondary" onClick={() => removeArrayItem('galleryImages', idx)}>Ta bort</button>
              </div>
            ))}
            <button className="btn-secondary" onClick={() => addArrayItem('galleryImages', {src: '', caption: ''})}>+ Lägg till bild</button>
          </div>

          {/* Videos */}
          <div className="form-group" style={{marginTop: '32px', borderTop: '1px solid #ddd', paddingTop: '24px'}}>
            <h3 style={{marginBottom: '16px'}}>Videor (YouTube)</h3>
            {(editingSection.videos || []).map((vid, idx) => (
              <div key={idx} style={{display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
                <input type="text" placeholder="Video Titel" className="form-control" value={vid.title || ''} onChange={(e) => handleArrayChange('videos', idx, 'title', e.target.value)} />
                <input type="text" placeholder="YouTube URL" className="form-control" value={vid.url || ''} onChange={(e) => handleArrayChange('videos', idx, 'url', e.target.value)} />
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input type="checkbox" checked={vid.pinned || false} onChange={(e) => handleArrayChange('videos', idx, 'pinned', e.target.checked)} />
                  Fäst överst
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  Kontext: 
                  <input type="text" style={{width: '100px'}} placeholder="ex: musaik" className="form-control" value={vid.context || ''} onChange={(e) => handleArrayChange('videos', idx, 'context', e.target.value)} />
                </label>
                <button className="btn-secondary" onClick={() => removeArrayItem('videos', idx)}>Ta bort</button>
              </div>
            ))}
            <button className="btn-secondary" onClick={() => addArrayItem('videos', {title: '', url: '', pinned: false})}>+ Lägg till video</button>
          </div>

          <div className="btn-group" style={{marginTop: '32px'}}>
            <button className="btn-primary" onClick={handleSave}>Spara</button>
            <button className="btn-secondary" onClick={handleCancel}>Avbryt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titel</th>
              <th>Kort Beskrivning</th>
              <th>Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(section => (
              <tr key={section.id}>
                <td style={{ fontWeight: '500' }}>{section.title}</td>
                <td style={{ color: 'var(--color-text-muted)' }}>{section.shortDescription}</td>
                <td>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleEdit(section)}>
                    Redigera
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
