import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contentRepository } from '../../lib/cms/contentRepository';
import { Settings, Image, FileText, Calendar, Layers } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ sections: 0, childPages: 0, news: 0, events: 0 });
  const readOnly = contentRepository.isReadOnly();

  useEffect(() => {
    (async () => {
      try {
        const snapshot = readOnly
          ? await contentRepository.getContent()
          : await contentRepository.getAdminContent();
        const childPages = (snapshot.sections || []).reduce((acc, s) => acc + ((s.childPages || []).length), 0);
        setStats({
          sections: (snapshot.sections || []).length,
          childPages,
          news: (snapshot.news || []).length,
          events: (snapshot.events || []).length,
        });
      } catch {
        // session may have just expired; AdminLayout will redirect on next render
      }
    })();
  }, [readOnly]);

  return (
    <div className="animate-fade-in">
      <h3 style={{ marginBottom: 24 }}>Välkommen till Admin-panelen</h3>

      <div className="admin-grid" style={{ marginBottom: 40, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
        <Link to="/admin/global" className="admin-card hoverable">
          <Settings size={32} style={{ marginBottom: 16, color: '#E66A2C' }} />
          <h3>Globala Texter</h3>
          <p style={{ color: '#666', marginTop: 8 }}>Ändra sajtens titel, kontaktuppgifter och sociala länkar.</p>
        </Link>
        <Link to="/admin/sections" className="admin-card hoverable">
          <Image size={32} style={{ marginBottom: 16, color: '#E66A2C' }} />
          <h3>Sektioner ({stats.sections})</h3>
          <p style={{ color: '#666', marginTop: 8 }}>Redigera innehåll för de 4 huvudkategorierna, gallerier och videor.</p>
        </Link>
        <Link to="/admin/child-pages" className="admin-card hoverable">
          <Layers size={32} style={{ marginBottom: 16, color: '#E66A2C' }} />
          <h3>Undersidor ({stats.childPages})</h3>
          <p style={{ color: '#666', marginTop: 8 }}>Skapa och redigera undersidor (t.ex. Musaik).</p>
        </Link>
        <Link to="/admin/news" className="admin-card hoverable">
          <FileText size={32} style={{ marginBottom: 16, color: '#E66A2C' }} />
          <h3>Nyheter ({stats.news})</h3>
          <p style={{ color: '#666', marginTop: 8 }}>Hantera nyhetsinlägg för hemsidan.</p>
        </Link>
        <Link to="/admin/events" className="admin-card hoverable">
          <Calendar size={32} style={{ marginBottom: 16, color: '#E66A2C' }} />
          <h3>Evenemang ({stats.events})</h3>
          <p style={{ color: '#666', marginTop: 8 }}>Lägg till och redigera kommande evenemang.</p>
        </Link>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h4>Snabbhjälp</h4>
        <p style={{ marginTop: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Använd menyn till vänster för att redigera innehåll. Ändringar publiceras direkt på hemsidan
          när du sparar (om status är "Publicerad"). Utkast syns endast i admin.
        </p>
        {readOnly && (
          <p style={{ marginTop: 12, color: '#856404' }}>
            <strong>Utvecklingsläge:</strong> ändringar går inte att spara här —
            kör <code>npm run build &amp;&amp; npx wrangler pages dev dist</code> för att testa hela flödet lokalt.
          </p>
        )}
      </div>
    </div>
  );
}
