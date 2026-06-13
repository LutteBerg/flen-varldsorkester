import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';
import { MediaAssignmentSection } from './ChildPages';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [editing, setEditing] = useState(null);
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
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  function handleEdit(section) {
    setError('');
    setEditing({ ...section });
  }

  function handleChange(field, value) {
    setEditing(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await contentRepository.updateSection(editing.id, {
        title: editing.title,
        shortDescription: editing.shortDescription,
        fullDescription: editing.fullDescription,
        heroMediaType: editing.heroMediaType,
        coverImage: editing.coverImage,
        practicalInfo: editing.practicalInfo,
        status: editing.status || 'published',
      });
      setSaved(true);
      await load();
      setTimeout(() => { setSaved(false); setEditing(null); }, 1200);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const existingMedia = [...(editing.videos || []), ...(editing.galleryImages || [])];
    return (
      <div className="animate-fade-in">
        <div className="admin-card">
          <h3 style={{ marginBottom: 24 }}>Redigera Sektion: {editing.title}</h3>
          {error && <div className="admin-login-error">{error}</div>}
          {saved && <div className="admin-save-ok" role="status">Sparat ✓</div>}

          <div className="form-group">
            <label className="form-label">Titel</label>
            <input type="text" className="form-control" value={editing.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
          </div>

          <div className="form-group" style={{marginTop: 24, padding: 16, background: '#f9f9f9', borderRadius: 8, border: '1px solid #ddd'}}>
            <h4 style={{marginBottom: 16}}>Media i början av sidan (Hero)</h4>

            <label className="form-label">Vad ska visas högst upp?</label>
            <select className="form-control" style={{marginBottom: 16}} value={editing.heroMediaType || 'image'} onChange={(e) => handleChange('heroMediaType', e.target.value)}>
              <option value="image">Fast Bild (Foto)</option>
              <option value="video">Bakgrundsvideo (kräver en fäst video)</option>
            </select>

            <label className="form-label">Omslagsbild (visas på startsidan, om "Fast Bild" är valt)</label>
            <CoverImagePicker
              value={editing.coverImage || ''}
              images={editing.galleryImages || []}
              onChange={(url) => handleChange('coverImage', url)}
            />
            <p style={{fontSize: '0.85rem', color: '#666', marginTop: 8}}>För video, lägg till en video nedan och markera "Fäst överst".</p>
          </div>

          <div className="form-group" style={{marginTop: 24}}>
            <label className="form-label">Kort Beskrivning (för startsidan)</label>
            <input type="text" className="form-control" value={editing.shortDescription || ''} onChange={(e) => handleChange('shortDescription', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Lång Beskrivning</label>
            <textarea className="form-control" value={editing.fullDescription || ''} onChange={(e) => handleChange('fullDescription', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Praktisk Information</label>
            <textarea className="form-control" value={editing.practicalInfo || ''} onChange={(e) => handleChange('practicalInfo', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={editing.status || 'published'} onChange={(e) => handleChange('status', e.target.value)}>
              <option value="published">Publicerad</option>
              <option value="draft">Utkast</option>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Utkast döljer sektionen från den publika webbplatsen men behåller den i admin.
            </p>
          </div>

          <MediaAssignmentSection
            parent={{ sectionId: editing.id }}
            existing={existingMedia}
            onChange={async () => {
              await load();
              const fresh = (await contentRepository.getAdminContent()).sections.find(s => s.id === editing.id);
              if (fresh) setEditing(fresh);
            }}
          />

          <div className="btn-group" style={{marginTop: 32}}>
            <button className="btn-primary" onClick={handleSave} disabled={readOnly || saving}>
              {readOnly ? 'Read-only (dev)' : (saving ? 'Sparar...' : 'Spara')}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Avbryt</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {error && <div className="admin-login-error" style={{ marginBottom: 16 }}>{error}</div>}
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
                <td style={{ fontWeight: 500 }}>{section.title}</td>
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

// Visual picker for a section's cover image (the photo shown on the start page).
// Reuses the images already uploaded to this section's media library below — the
// admin uploads via the media panel, then clicks a thumbnail here to make it the
// cover. The manual URL field is kept for legacy /assets/... paths and advanced
// use, so the previous "type a path" behaviour still works unchanged.
function CoverImagePicker({ value, images, onChange }) {
  const imageList = (images || []).filter((img) => img && img.src);

  return (
    <div>
      {value ? (
        <div style={{ marginBottom: 12 }}>
          <img
            src={value}
            alt="Vald omslagsbild"
            width="1600"
            height="900"
            style={{ maxWidth: '100%', height: 'auto', maxHeight: 200, borderRadius: 6, border: '1px solid #ddd', display: 'block' }}
          />
        </div>
      ) : (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
          Ingen omslagsbild vald ännu.
        </p>
      )}

      {imageList.length > 0 ? (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>
            Klicka på en bild från sektionens bildbibliotek för att använda den som omslagsbild:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {imageList.map((img) => {
              const active = img.src === value;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onChange(img.src)}
                  aria-pressed={active}
                  title={img.title || img.alt || img.src}
                  style={{
                    padding: 0,
                    border: active ? '3px solid var(--color-orange)' : '1px solid #ddd',
                    borderRadius: 6,
                    background: 'none',
                    cursor: 'pointer',
                    lineHeight: 0,
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt || img.title || ''}
                    width={96}
                    height={64}
                    style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                  />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
          Inga bilder uppladdade i den här sektionen ännu. Ladda upp en bild i mediabiblioteket längre ner på sidan, så kan du välja den som omslagsbild här.
        </p>
      )}

      <label className="form-label" style={{ fontSize: '0.85rem' }}>Eller ange en bild-URL manuellt</label>
      <input
        type="text"
        className="form-control"
        placeholder="/assets/... eller /media/..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {value && (
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 8, fontSize: '0.85rem', padding: '6px 12px' }}
          onClick={() => onChange('')}
        >
          Ta bort omslagsbild
        </button>
      )}
    </div>
  );
}
