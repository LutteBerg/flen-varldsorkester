const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';

export function stockholmDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function indexableEvents(snapshot) {
  const sections = new Map(
    (snapshot?.sections || []).map((section) => [section.id, section]),
  );

  return (snapshot?.events || [])
    .filter((event) => (
      event?.status === 'published'
      && event.title
      && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '')
      && sections.has(event.sectionId)
    ))
    .map((event) => ({
      ...event,
      section: sections.get(event.sectionId),
      detailPath: eventDetailPath(event, snapshot),
    }));
}

export function filterArchiveEvents(snapshot, mode = 'all', today = stockholmDateKey()) {
  const events = indexableEvents(snapshot);
  if (mode === 'upcoming') {
    return events.filter((event) => event.date >= today);
  }
  if (mode === 'past') {
    return events.filter((event) => event.date < today);
  }
  return events;
}

export function eventDetailPath(event, snapshot) {
  const section = (snapshot?.sections || [])
    .find((item) => item.id === event?.sectionId);
  if (!section || !event?.id) return null;
  return `/${section.slug}/evenemang/${encodeURIComponent(event.id)}`;
}

export function locationSlug(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function groupEventsByLocation(snapshot) {
  const groups = new Map();

  for (const event of indexableEvents(snapshot)) {
    const name = String(event.location || '').replace(/\s+/g, ' ').trim();
    const slug = locationSlug(name);
    if (!slug) continue;

    const group = groups.get(slug) || { name, slug, events: [] };
    group.events.push(event);
    groups.set(slug, group);
  }

  return [...groups.values()];
}
