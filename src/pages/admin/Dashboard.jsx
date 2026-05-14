import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { contentRepository } from '../../lib/cms/contentRepository';
import { Settings, Image, FileText, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ sections: 0, news: 0, events: 0 });

  useEffect(() => {
    async function loadStats() {
      const sections = await contentRepository.getSections();
      const news = await contentRepository.getNews();
      const events = await contentRepository.getEvents();
      
      setStats({
        sections: sections.length,
        news: news.length,
        events: events.length
      });
    }
    loadStats();
  }, []);

  return (
    <div className="animate-fade-in">
      <h3 style={{ marginBottom: '24px' }}>Välkommen till Admin-panelen</h3>
      
      <div className="admin-grid" style={{ marginBottom: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <Link to="/admin/global" className="admin-card hoverable">
          <Settings size={32} style={{ marginBottom: '16px', color: '#E66A2C' }} />
          <h3>Globala Texter</h3>
          <p style={{ color: '#666', marginTop: '8px' }}>Ändra sajtens titel, kontaktuppgifter och sociala länkar.</p>
        </Link>
        <Link to="/admin/sections" className="admin-card hoverable">
          <Image size={32} style={{ marginBottom: '16px', color: '#E66A2C' }} />
          <h3>Sektioner</h3>
          <p style={{ color: '#666', marginTop: '8px' }}>Redigera innehåll för de 4 huvudkategorierna, gallerier och videor.</p>
        </Link>
        <Link to="/admin/news" className="admin-card hoverable">
          <FileText size={32} style={{ marginBottom: '16px', color: '#E66A2C' }} />
          <h3>Nyheter</h3>
          <p style={{ color: '#666', marginTop: '8px' }}>Hantera nyhetsinlägg för hemsidan.</p>
        </Link>
        <Link to="/admin/events" className="admin-card hoverable">
          <Calendar size={32} style={{ marginBottom: '16px', color: '#E66A2C' }} />
          <h3>Evenemang</h3>
          <p style={{ color: '#666', marginTop: '8px' }}>Lägg till och redigera kommande evenemang.</p>
        </Link>
      </div>

      <div className="admin-card" style={{ maxWidth: '600px', borderLeft: '4px solid #E66A2C' }}>
        <h3 style={{ marginBottom: '16px' }}>Databas (Prototype)</h3>
        <p style={{ color: '#666', marginBottom: '24px' }}>
          Eftersom sidan för närvarande använder webbläsarens lokala lagring (localStorage), kan du återställa allt innehåll till standardvärdena från källfilen (seedContent.json). Detta är användbart om du vill ladda om nya texter eller bilder från en uppdatering.
        </p>
        <button 
          className="btn-secondary" 
          onClick={async () => {
            if (window.confirm('Är du säker på att du vill skriva över alla dina lokala ändringar med standardinnehållet?')) {
              await contentRepository.resetToSeed();
              window.location.reload();
            }
          }}
        >
          Återställ från seedContent
        </button>
      </div>

      <div className="admin-card" style={{ marginTop: '24px' }}>
        <h4>Snabbhjälp</h4>
        <p style={{ marginTop: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
          Använd menyn till vänster för att redigera innehåll. 
          Observera: Ändringar sparas för närvarande lokalt i din webbläsare (localStorage).
          I framtiden kommer detta att kopplas till en riktig databas.
        </p>
      </div>
    </div>
  );
}
