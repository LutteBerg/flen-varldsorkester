import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';

export default function NewsList() {
  const { slug } = useParams();
  const [section, setSection] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const s = await contentRepository.getSectionBySlug(slug);
      setSection(s);
      
      if (s) {
        const n = await contentRepository.getNewsBySection(s.id);
        setNews(n.filter(item => item.status === 'published'));
      }
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section) return <div className="container" style={{padding: '80px 32px'}}>Sektionen hittades inte.</div>;

  return (
    <div className="section-page animate-fade-in" style={{paddingTop: '80px', paddingBottom: '80px'}}>
      <div className="container">
        <Link to={`/${slug}`} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till {section.title}</span>
        </Link>
        <h1 className="section-title" style={{marginBottom: '48px'}}>Alla Nyheter</h1>

        {news.length > 0 ? (
          <div className="news-list">
            {news.map(n => (
              <article key={n.id} className="designed-news-card">
                <div className="news-date-block">
                  <span className="date-month">{new Date(n.date).toLocaleString('sv-SE', { month: 'short' }).toUpperCase()}</span>
                  <span className="date-day">{new Date(n.date).getDate()}</span>
                </div>
                <div className="news-content">
                  <h3 className="news-title">{n.title}</h3>
                  <p>{n.body || n.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">Inga nyheter publicerade just nu.</p>
        )}
      </div>
    </div>
  );
}
