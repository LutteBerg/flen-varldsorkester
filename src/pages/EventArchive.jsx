import { useEffect, useState } from 'react';
import EventArchiveList from '../components/EventArchiveList';
import { contentRepository } from '../lib/cms/contentRepository';
import { filterArchiveEvents } from '../lib/eventArchives';
import './Section.css';

const HEADINGS = {
  all: 'Evenemang',
  upcoming: 'Kommande Evenemang',
  past: 'Tidigare Evenemang',
};

const EMPTY_TEXT = {
  all: 'Inga evenemang publicerade just nu.',
  upcoming: 'Inga kommande evenemang publicerade just nu.',
  past: 'Inga tidigare evenemang publicerade.',
};

export default function EventArchive({ mode = 'all' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const snapshot = await contentRepository.getContent();
      if (!cancelled) {
        setEvents(filterArchiveEvents(snapshot, mode));
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (loading) {
    return <div className="container" style={{ padding: '80px 32px' }}>Laddar...</div>;
  }

  return (
    <div
      className="section-page animate-fade-in"
      style={{ paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="container">
        <h1 className="section-title" style={{ marginBottom: '48px' }}>
          {HEADINGS[mode]}
        </h1>
        <EventArchiveList events={events} emptyText={EMPTY_TEXT[mode]} />
      </div>
    </div>
  );
}
