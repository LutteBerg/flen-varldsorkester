import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';

// Lists all events for a section OR a child page.
//   /:slug/evenemang             -> section events
//   /:slug/:childSlug/evenemang  -> child-page events
// Each card links to the event's own detail page.

export default function EventList() {
  const { slug, childSlug } = useParams();
  const [section, setSection] = useState(null);
  const [childPage, setChildPage] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const s = await contentRepository.getSectionBySlug(slug);
      setSection(s);

      let child = null;
      if (s && childSlug && s.childPages) {
        child = s.childPages.find(p => p.slug === childSlug) || null;
      }
      setChildPage(child);

      if (child) {
        const e = await contentRepository.getEventsByChildPage(child.id);
        setEvents(e.filter(item => item.status === 'published'));
      } else if (s) {
        const e = await contentRepository.getEventsBySection(s.id);
        setEvents(e.filter(item => item.status === 'published'));
      }
      setLoading(false);
    }
    fetchData();
  }, [slug, childSlug]);

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section) return <div className="container" style={{padding: '80px 32px'}}>Sektionen hittades inte.</div>;

  // Back link goes to the child page (child mode) or the section page.
  const backTo = childPage ? `/${slug}/${childPage.slug}` : `/${slug}`;
  const backLabel = childPage ? childPage.title : section.title;

  return (
    <div className="section-page animate-fade-in" style={{paddingTop: '80px', paddingBottom: '80px'}}>
      <div className="container">
        <Link to={backTo} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till {backLabel}</span>
        </Link>
        <h1 className="section-title" style={{marginBottom: '48px'}}>Kommande Evenemang</h1>

        {events.length > 0 ? (
          <div className="events-list">
            {events.map(e => (
              <Link key={e.id} to={`/${slug}/evenemang/${e.id}`} className="designed-event-card event-card-link">
                <div className="event-stripe"></div>
                <div className="event-content">
                  <h4 className="event-title">{e.title}</h4>
                  <div className="event-meta" style={{flexDirection: 'row', gap: '24px', flexWrap: 'wrap', marginBottom: '16px'}}>
                    <div className="meta-item">
                      <Calendar size={16} />
                      <span>{e.date}</span>
                    </div>
                    {e.time && (
                      <div className="meta-item">
                        <Clock size={16} />
                        <span>{e.time}</span>
                      </div>
                    )}
                    {e.location && (
                      <div className="meta-item">
                        <MapPin size={16} />
                        <span>{e.location}</span>
                      </div>
                    )}
                  </div>
                  {e.description && <p>{e.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">Inga kommande evenemang publicerade just nu.</p>
        )}
      </div>
    </div>
  );
}
