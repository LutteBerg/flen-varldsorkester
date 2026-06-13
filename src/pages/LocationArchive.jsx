import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EventArchiveList from '../components/EventArchiveList';
import { contentRepository } from '../lib/cms/contentRepository';
import { groupEventsByLocation } from '../lib/eventArchives';
import './Section.css';

export default function LocationArchive() {
  const { locationSlug } = useParams();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const snapshot = await contentRepository.getContent();
      if (!cancelled) {
        setLocations(groupEventsByLocation(snapshot));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="container" style={{ padding: '80px 32px' }}>Laddar...</div>;
  }

  const location = locationSlug
    ? locations.find((item) => item.slug === locationSlug)
    : null;

  if (locationSlug && !location) {
    return (
      <div className="container" style={{ padding: '80px 32px' }}>
        Sidan hittades inte.
      </div>
    );
  }

  return (
    <div
      className="section-page animate-fade-in"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '48px' }}>
          {location ? location.name : 'Platser'}
        </h1>

        {location ? (
          <EventArchiveList events={location.events} />
        ) : (
          locations.map((group) => (
            <section
              key={group.slug}
              className="events-section"
              style={{ marginBottom: '32px' }}
            >
              <h2 className="block-title">
                <Link to={`/locations/${group.slug}`}>{group.name}</Link>
              </h2>
              <EventArchiveList events={group.events} />
            </section>
          ))
        )}
      </div>
    </div>
  );
}
