import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import { linkify } from '../lib/linkify';
import SocialCTA from '../components/SocialCTA';
import './EventDetail.css';

// Full detail PAGE for a single event (not a modal — the client asked for a
// dedicated page). Shows the admin-entered address (location), date, time,
// photo and the full description.

export default function EventDetail() {
  const { slug, eventId } = useParams();
  const [section, setSection] = useState(null);
  const [globalContent, setGlobalContent] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [g, s, all] = await Promise.all([
        contentRepository.getGlobalContent(),
        contentRepository.getSectionBySlug(slug),
        contentRepository.getEvents(),
      ]);
      setGlobalContent(g);
      setSection(s);
      setEvent((all || []).find(e => String(e.id) === String(eventId)) || null);
      setLoading(false);
    }
    fetchData();
  }, [slug, eventId]);

  if (loading) return <div className="container" style={{ padding: '80px 32px' }}>Laddar...</div>;

  // Events that belong to a child page link back to that child page's event
  // list; section events link back to the section event list.
  const childPage = event && event.childPageId && section && section.childPages
    ? section.childPages.find(c => c.id === event.childPageId)
    : null;
  const backTo = childPage ? `/${slug}/${childPage.slug}/evenemang` : `/${slug}/evenemang`;

  if (!event) {
    return (
      <div className="container" style={{ padding: '80px 32px' }}>
        <p className="empty-state">Evenemanget hittades inte.</p>
        <Link to={`/${slug}/evenemang`} className="back-link" style={{ marginTop: 24 }}>
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till evenemang</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="section-page animate-fade-in event-detail-page" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div className="container">
        <Link to={backTo} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till evenemang</span>
        </Link>

        <article className="event-detail">
          <h1 className="section-title event-detail-title">{event.title}</h1>

          <div className="event-detail-meta">
            {event.date && (
              <div className="meta-item">
                <Calendar size={18} />
                <span>{event.date}</span>
              </div>
            )}
            {event.time && (
              <div className="meta-item">
                <Clock size={18} />
                <span>{event.time}</span>
              </div>
            )}
            {event.location && (
              <div className="meta-item">
                <MapPin size={18} />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.image && (
            <div className="event-detail-image">
              <img src={event.image} alt={event.title} />
            </div>
          )}

          {event.description && (
            <div className="prose event-detail-body">
              {linkify(event.description)}
            </div>
          )}
        </article>
      </div>

      <div style={{ marginTop: '48px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}
