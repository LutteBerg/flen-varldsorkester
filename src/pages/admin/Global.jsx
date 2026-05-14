import React, { useState, useEffect } from 'react';
import { contentRepository } from '../../lib/cms/contentRepository';

export default function Global() {
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await contentRepository.getGlobalContent();
      setContent(data);
    }
    load();
  }, []);

  const handleChange = (e, field, subfield = null) => {
    if (subfield) {
      setContent({
        ...content,
        [field]: { ...content[field], [subfield]: e.target.value }
      });
    } else {
      setContent({ ...content, [field]: e.target.value });
    }
  };

  const handleSocialLinkChange = (index, url) => {
    const newLinks = [...(content.socialLinks || [])];
    if (newLinks[index]) {
      newLinks[index].url = url;
    }
    setContent({ ...content, socialLinks: newLinks });
  };

  const handleSave = async () => {
    setSaving(true);
    await contentRepository.updateGlobalContent(content);
    setTimeout(() => {
      setSaving(false);
      alert('Sparat!');
    }, 500);
  };

  if (!content) return <div>Laddar...</div>;

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="admin-card">
        <h3 style={{ marginBottom: '24px' }}>Generella Inställningar & Texter</h3>
        
        <div className="form-group">
          <label className="form-label">Sidans Titel (Site Title)</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.siteTitle} 
            onChange={(e) => handleChange(e, 'siteTitle')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Introduktion (Startsida)</label>
          <textarea 
            className="form-control" 
            value={content.homeIntro} 
            onChange={(e) => handleChange(e, 'homeIntro')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Om Huset (About-sidan)</label>
          <textarea 
            className="form-control" 
            value={content.aboutText} 
            onChange={(e) => handleChange(e, 'aboutText')}
            style={{ minHeight: '200px' }}
          />
        </div>

        <h4 style={{ margin: '32px 0 16px' }}>Kontaktinformation</h4>

        <div className="form-group">
          <label className="form-label">Adress</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.contactInfo.address} 
            onChange={(e) => handleChange(e, 'contactInfo', 'address')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">E-post</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.contactInfo.email} 
            onChange={(e) => handleChange(e, 'contactInfo', 'email')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Telefon</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.contactInfo.phone} 
            onChange={(e) => handleChange(e, 'contactInfo', 'phone')}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Facebook Länk</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.socialLinks?.find(l => l.platform === 'Facebook')?.url || ''} 
            onChange={(e) => {
              const idx = content.socialLinks?.findIndex(l => l.platform === 'Facebook');
              if (idx >= 0) handleSocialLinkChange(idx, e.target.value);
              else setContent({...content, socialLinks: [...(content.socialLinks || []), {platform: 'Facebook', url: e.target.value}]});
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">YouTube Kanal (Valfritt)</label>
          <input 
            type="text" 
            className="form-control" 
            value={content.socialLinks?.find(l => l.platform === 'YouTube')?.url || ''} 
            onChange={(e) => {
              const idx = content.socialLinks?.findIndex(l => l.platform === 'YouTube');
              if (idx >= 0) handleSocialLinkChange(idx, e.target.value);
              else setContent({...content, socialLinks: [...(content.socialLinks || []), {platform: 'YouTube', url: e.target.value}]});
            }}
          />
        </div>

        <div className="btn-group">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Sparar...' : 'Spara Ändringar'}
          </button>
        </div>
      </div>
    </div>
  );
}
