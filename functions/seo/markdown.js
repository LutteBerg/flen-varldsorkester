import { STATIC_LABELS } from './constants.js';

export function prefersMarkdown(acceptHeader) {
  if (!acceptHeader) return false;

  const ranges = parseAccept(acceptHeader);
  const markdownRanges = ranges.filter((range) => (
    range.type === 'text' && range.subtype === 'markdown'
  ));
  if (!markdownRanges.length) return false;

  const markdownQuality = Math.max(...markdownRanges.map((range) => range.quality));
  if (markdownQuality <= 0) return false;

  const htmlQuality = qualityFor(ranges, 'text', 'html');
  return markdownQuality >= htmlQuality;
}

export function renderMarkdown(page) {
  switch (page.kind) {
    case 'home':
      return joinBlocks([
        heading(1, page.snapshot.global.siteTitle),
        text(page.snapshot.global.homeIntro),
        ...page.sections.flatMap((section) => [
          heading(2, link(
            section.title,
            routePath(section.slug),
          )),
          text(section.shortDescription),
        ]),
      ]);
    case 'about':
      return joinBlocks([
        heading(1, STATIC_LABELS.aboutTitle),
        text(page.snapshot.global.aboutText),
      ]);
    case 'contact':
      return joinBlocks([
        heading(1, STATIC_LABELS.contactTitle),
        heading(2, 'Hitta hit'),
        text(page.contact.address),
        heading(2, 'Kontakta oss'),
        page.contact.email
          ? `**E-post:** ${escapeMarkdown(page.contact.email)}`
          : '',
        page.contact.phone
          ? `**Telefon:** ${escapeMarkdown(page.contact.phone)}`
          : '',
      ]);
    case 'section':
      return renderSection(page);
    case 'child':
      return renderChild(page);
    case 'event-list':
      return joinBlocks([
        heading(1, STATIC_LABELS.eventsTitle),
        ...page.events.flatMap((event) => renderEvent(
          event,
          routePath(page.section.slug, 'evenemang', event.id),
        )),
      ]);
    case 'event':
      return joinBlocks([
        heading(1, page.event.title),
        ...eventDetails(page.event),
      ]);
    case 'news-list':
      return joinBlocks([
        heading(1, STATIC_LABELS.newsTitle),
        ...page.news.flatMap((news) => [
          text(news.date),
          heading(2, news.title),
          text(news.excerpt || news.body),
        ]),
      ]);
    case 'gallery':
      return joinBlocks([
        heading(1, STATIC_LABELS.galleryTitle),
        ...renderMedia(page.section),
      ]);
    default:
      return '';
  }
}

function renderSection(page) {
  const section = page.section;
  return joinBlocks([
    heading(1, section.title),
    text(section.shortDescription),
    text(section.fullDescription),
    ...(section.childPages || []).flatMap((child) => [
      heading(2, link(
        child.title,
        routePath(section.slug, child.slug),
      )),
      text(child.shortDescription),
    ]),
    heading(2, 'Senaste Nyheterna'),
    ...page.previewNews.flatMap((news) => [
      heading(3, news.title),
      text(news.excerpt),
    ]),
    heading(2, 'Praktisk Information'),
    text(section.practicalInfo),
    heading(2, 'Evenemang'),
    ...page.previewEvents.flatMap((event) => renderEvent(
      event,
      routePath(section.slug, 'evenemang', event.id),
    )),
    ...renderMedia(section),
  ]);
}

function renderChild(page) {
  const child = page.child;
  return joinBlocks([
    heading(1, child.title),
    text(child.shortDescription),
    text(child.body),
    page.previewNews.length ? heading(2, 'Senaste Nyheterna') : '',
    ...page.previewNews.flatMap((news) => [
      heading(3, news.title),
      text(news.excerpt),
    ]),
    page.previewEvents.length ? heading(2, 'Evenemang') : '',
    ...page.previewEvents.flatMap((event) => renderEvent(
      event,
      routePath(page.section.slug, 'evenemang', event.id),
    )),
    ...renderMedia(child),
  ]);
}

function renderEvent(event, href) {
  return [
    heading(2, link(event.title, href)),
    ...eventDetails(event),
  ];
}

function eventDetails(event) {
  return [
    text(event.date),
    text(event.time),
    text(event.location),
    text(event.description),
  ];
}

function renderMedia(owner, { includeHeading = true } = {}) {
  const images = owner?.galleryImages || [];
  const videos = owner?.videos || [];
  if (!images.length && !videos.length) return [];

  return [
    includeHeading ? heading(2, 'Galleri') : '',
    ...images.map((image) => (
      image.caption ? `- ${escapeMarkdown(image.caption)}` : ''
    )),
    ...videos.map((video) => heading(3, video.title)),
  ];
}

function parseAccept(acceptHeader) {
  return String(acceptHeader)
    .split(',')
    .map((entry) => {
      const [mediaRange, ...parameters] = entry.split(';').map((part) => part.trim());
      const [type, subtype] = mediaRange.toLowerCase().split('/');
      if (!type || !subtype) return null;

      let quality = 1;
      for (const parameter of parameters) {
        const [name, value = ''] = parameter.split('=').map((part) => part.trim());
        if (name.toLowerCase() === 'q') {
          quality = parseQuality(value);
          break;
        }
      }

      return { type, subtype, quality };
    })
    .filter(Boolean);
}

function parseQuality(value) {
  if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value)) return 0;
  const quality = Number(value);
  return Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0;
}

function qualityFor(ranges, type, subtype) {
  const candidates = ranges
    .map((range) => {
      if (range.type === type && range.subtype === subtype) {
        return { specificity: 2, quality: range.quality };
      }
      if (range.type === type && range.subtype === '*') {
        return { specificity: 1, quality: range.quality };
      }
      if (range.type === '*' && range.subtype === '*') {
        return { specificity: 0, quality: range.quality };
      }
      return null;
    })
    .filter(Boolean);

  if (!candidates.length) return 0;
  const specificity = Math.max(...candidates.map((candidate) => candidate.specificity));
  return Math.max(
    ...candidates
      .filter((candidate) => candidate.specificity === specificity)
      .map((candidate) => candidate.quality),
  );
}

function heading(level, value) {
  return value ? `${'#'.repeat(level)} ${value}` : '';
}

function text(value) {
  return value ? escapeMarkdown(value) : '';
}

function link(label, href) {
  return `[${escapeMarkdown(label)}](${href})`;
}

function routePath(...segments) {
  return `/${segments.map((segment) => encodeURIComponent(String(segment))).join('/')}`;
}

function joinBlocks(blocks) {
  const content = blocks.flat().filter(Boolean).join('\n\n');
  return content ? `${content}\n` : '';
}

function escapeMarkdown(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/([`*_[\]<>])/g, '\\$1')
    .replace(/^(\s*)(#{1,6}|>|[-+](?=\s)|\d+\.(?=\s))/gm, '$1\\$2');
}
