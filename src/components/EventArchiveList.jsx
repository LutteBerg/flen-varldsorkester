import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function EventArchiveList({ events, emptyText }) {
  if (!events.length) {
    return emptyText ? <p className="empty-state">{emptyText}</p> : null;
  }

  return (
    <div className="events-list">
      {events.map((event) => (
        <Link
          key={event.id}
          to={event.detailPath}
          className="designed-event-card event-card-link"
        >
          <div className="event-stripe"></div>
          <div className="event-content">
            <h4 className="event-title">{event.title}</h4>
            <div
              className="event-meta"
              style={{
                flexDirection: 'row',
                gap: '24px',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}
            >
              <div className="meta-item">
                <Calendar size={16} />
                <span>{event.date}</span>
              </div>
              {event.time && (
                <div className="meta-item">
                  <Clock size={16} />
                  <span>{event.time}</span>
                </div>
              )}
              {event.location && (
                <div className="meta-item">
                  <MapPin size={16} />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
            {event.description && <p>{event.description}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
