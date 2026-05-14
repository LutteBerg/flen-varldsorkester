import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';

export default function EventList() {
  const { slug } = useParams();
  const [section, setSection] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const s = await contentRepository.getSectionBySlug(slug);
      setSection(s);
      
      if (s) {
        const e = await contentRepository.getEventsBySection(s.id);
        setEvents(e.filter(item => item.status === 'published'));
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
        <h1 className="section-title" style={{marginBottom: '48px'}}>Kommande Evenemang</h1>

        {events.length > 0 ? (
          <div className="events-list">
            {events.map(e => (
              <div key={e.id} className="designed-event-card">
                <div className="event-stripe"></div>
                <div className="event-content">
                  <h4 className="event-title">{e.title}</h4>
                  <div className="event-meta" style={{flexDirection: 'row', gap: '24px', flexWrap: 'wrap', marginBottom: '16px'}}>
                    <div className="meta-item">
                      <Calendar size={16} />
                      <span>{e.date}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={16} />
                      <span>{e.time}</span>
                    </div>
                    <div className="meta-item">
                      <MapPin size={16} />
                      <span>{e.location}</span>
                    </div>
                  </div>
                  <p>{e.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">Inga kommande evenemang publicerade just nu.</p>
        )}
      </div>
    </div>
  );
}
