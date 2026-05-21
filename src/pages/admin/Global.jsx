import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function Global() {
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const readOnly = contentRepository.isReadOnly();

  useEffect(() => {
    (async () => {
      try {
        const data = await contentRepository.getGlobalContent();
        setContent({
          siteTitle: data.siteTitle || '',
          homeIntro: data.homeIntro || '',
          aboutText: data.aboutText || '',
          contactInfo: {
            address: data.contactInfo?.address || '',
            email:   data.contactInfo?.email   || '',
            phone:   data.contactInfo?.phone   || '',
          },
          socialLinks: Array.isArray(data.socialLinks) ? data.socialLinks : [],
        });
      } catch (e) {
        setError(e.message || String(e));
      }
    })();
  }, []);

  const handleChange = (field, value) => setContent(prev => ({ ...prev, [field]: value }));
  const handleContactChange = (field, value) => setContent(prev => ({
    ...prev,
    contactInfo: { ...prev.contactInfo, [field]: value },
  }));
  const upsertSocial = (platform, url) => setContent(prev => {
    const links = [...(prev.socialLinks || [])];
    const idx = links.findIndex(l => l.platform === platform);
    if (url) {
      if (idx >= 0) links[idx] = { platform, url };
      else          links.push({ platform, url });
    } else if (idx >= 0) {
      links.splice(idx, 1);
    }
    return { ...prev, socialLinks: links };
  });

  async function handleSave() {
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      await contentRepository.updateGlobalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!content) return <div>Laddar...</div>;

  const fb = content.socialLinks?.find(l => l.platform === 'Facebook')?.url || '';
  const yt = content.socialLinks?.find(l => l.platform === 'YouTube')?.url  || '';

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="admin-card">
        <h3 style={{ marginBottom: 24 }}>Generella Inställningar & Texter</h3>
        {error && <div className="admin-login-error">{error}</div>}
        {saved && <div className="admin-save-ok" role="status">Sparat ✓</div>}

        <div className="form-group">
          <label className="form-label">Sidans Titel</label>
          <input type="text" className="form-control" value={content.siteTitle} onChange={(e) => handleChange('siteTitle', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Introduktion (Startsida)</label>
          <textarea className="form-control" value={content.homeIntro} onChange={(e) => handleChange('homeIntro', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Om Huset</label>
          <textarea className="form-control" value={content.aboutText} onChange={(e) => handleChange('aboutText', e.target.value)} style={{ minHeight: 200 }} />
        </div>

        <h4 style={{ margin: '32px 0 16px' }}>Kontaktinformation</h4>

        <div className="form-group">
          <label className="form-label">Adress</label>
          <input type="text" className="form-control" value={content.contactInfo.address} onChange={(e) => handleContactChange('address', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">E-post</label>
          <input type="text" className="form-control" value={content.contactInfo.email} onChange={(e) => handleContactChange('email', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Telefon</label>
          <input type="text" className="form-control" value={content.contactInfo.phone} onChange={(e) => handleContactChange('phone', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Facebook-länk</label>
          <input type="text" className="form-control" value={fb} onChange={(e) => upsertSocial('Facebook', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">YouTube-kanal (valfritt)</label>
          <input type="text" className="form-control" value={yt} onChange={(e) => upsertSocial('YouTube', e.target.value)} />
        </div>

        <div className="btn-group">
          <button className="btn-primary" onClick={handleSave} disabled={saving || readOnly}>
            {readOnly ? 'Read-only (dev)' : (saving ? 'Sparar...' : 'Spara Ändringar')}
          </button>
        </div>
      </div>
    </div>
  );
}
