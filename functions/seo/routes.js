import {
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_PATH,
  ORGANIZATION_NAME,
  STATIC_LABELS,
} from './constants.js';

const DEFAULT_DESCRIPTION = 'Musik, konst och kreativa mötesplatser i Amazon, Flen.';

export function resolveSeoPage(pathname, snapshot, origin) {
  const canonicalPath = normalizePath(pathname);
  const siteTitle = snapshot?.global?.siteTitle || ORGANIZATION_NAME;
  const base = {
    kind: 'unknown',
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath, origin),
    title: siteTitle,
    description: snapshot?.global?.homeIntro || DEFAULT_DESCRIPTION,
    image: absoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH, origin),
    noindex: false,
    breadcrumbs: [{ name: 'Hem', path: '/' }],
    visibleText: [],
    lastModified: snapshot?.global?.updatedAt || null,
    snapshot,
    origin,
  };

  if (canonicalPath === '/') {
    const sections = snapshot?.sections || [];
    return finalize({
      ...base,
      kind: 'home',
      title: siteTitle,
      description: snapshot?.global?.homeIntro || DEFAULT_DESCRIPTION,
      sections,
      lcpImage: sections[0]?.coverImage || null,
      visibleText: compact([
        siteTitle,
        snapshot?.global?.homeIntro,
        ...sections.flatMap((section) => [section.title, section.shortDescription]),
      ]),
      lastModified: latestDate([
        snapshot?.global?.updatedAt,
        ...sections.map((section) => section.updatedAt),
      ]),
    });
  }

  if (canonicalPath === '/about') {
    return finalize({
      ...base,
      kind: 'about',
      title: pageTitle(STATIC_LABELS.aboutTitle, siteTitle),
      description: snapshot?.global?.aboutText || base.description,
      breadcrumbs: [
        ...base.breadcrumbs,
        { name: STATIC_LABELS.aboutTitle, path: canonicalPath },
      ],
      visibleText: compact([STATIC_LABELS.aboutTitle, snapshot?.global?.aboutText]),
    });
  }

  if (canonicalPath === '/contact') {
    const contact = snapshot?.global?.contactInfo || {};
    return finalize({
      ...base,
      kind: 'contact',
      title: pageTitle(STATIC_LABELS.contactTitle, siteTitle),
      description: compact([contact.address, contact.email]).join(' · ') || base.description,
      breadcrumbs: [
        ...base.breadcrumbs,
        { name: STATIC_LABELS.contactTitle, path: canonicalPath },
      ],
      contact,
      socialLinks: snapshot?.global?.socialLinks || [],
      visibleText: compact([
        STATIC_LABELS.contactTitle,
        'Hitta hit',
        contact.address,
        'Kontakta oss',
        contact.email,
        contact.phone,
      ]),
    });
  }

  if (canonicalPath === '/admin' || canonicalPath.startsWith('/admin/')) {
    return finalize({
      ...base,
      kind: 'admin',
      title: pageTitle('Administration', siteTitle),
      noindex: true,
      visibleText: [],
    });
  }

  const segments = canonicalPath.slice(1).split('/');
  const section = findSection(snapshot, segments[0]);
  if (!section) {
    return finalize({
      ...base,
      title: pageTitle('Sidan hittades inte', siteTitle),
      noindex: true,
    });
  }

  const sectionPath = `/${section.slug}`;
  const sectionCrumb = { name: section.title, path: sectionPath };
  const sectionNews = newsForSection(snapshot, section.id);
  const sectionEvents = eventsForSection(snapshot, section.id);

  if (segments.length === 1) {
    const previewNews = sectionNews.slice(0, 2);
    const previewEvents = sectionEvents.slice(0, 3);
    return finalize({
      ...base,
      kind: 'section',
      canonicalPath: sectionPath,
      canonicalUrl: absoluteUrl(sectionPath, origin),
      title: pageTitle(section.title, siteTitle),
      description: section.shortDescription || section.fullDescription || base.description,
      image: absoluteUrl(section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH, origin),
      breadcrumbs: [...base.breadcrumbs, sectionCrumb],
      section,
      news: sectionNews,
      events: sectionEvents,
      previewNews,
      previewEvents,
      visibleText: compact([
        section.title,
        section.shortDescription,
        section.fullDescription,
        ...((section.childPages || []).flatMap((child) => [
          child.title,
          child.shortDescription,
        ])),
        ...previewNews.flatMap((news) => [news.title, news.excerpt]),
        'Praktisk Information',
        section.practicalInfo,
        ...previewEvents.flatMap((event) => [event.title, event.date]),
        ...visibleMediaText(section),
      ]),
      lastModified: latestDate([
        section.updatedAt,
        ...previewNews.map((news) => news.updatedAt),
        ...previewEvents.map((event) => event.updatedAt),
        ...(section.galleryImages || []).map((image) => image.updatedAt),
        ...(section.videos || []).map((video) => video.updatedAt),
      ]),
    });
  }

  if (segments[1] === 'evenemang') {
    if (segments.length === 2) {
      return eventListPage({
        base,
        siteTitle,
        origin,
        section,
        parentPath: sectionPath,
        parentTitle: section.title,
        events: sectionEvents,
        breadcrumbs: [...base.breadcrumbs, sectionCrumb],
      });
    }

    if (segments.length === 3) {
      const event = (snapshot?.events || []).find((item) => (
        item.sectionId === section.id
        && String(item.id) === segments[2]
      ));
      if (!event) return unknownPage(base, siteTitle);
      const child = event.childPageId
        ? (section.childPages || []).find((item) => item.id === event.childPageId)
        : null;
      return eventPage({
        base,
        siteTitle,
        origin,
        section,
        child,
        event,
        breadcrumbs: child
          ? [
            ...base.breadcrumbs,
            sectionCrumb,
            { name: child.title, path: `${sectionPath}/${child.slug}` },
          ]
          : [...base.breadcrumbs, sectionCrumb],
      });
    }
  }

  if (segments.length === 2 && segments[1] === 'nyheter') {
    return finalize({
      ...base,
      kind: 'news-list',
      title: pageTitle(`${STATIC_LABELS.newsTitle} – ${section.title}`, siteTitle),
      description: section.shortDescription || base.description,
      image: absoluteUrl(section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH, origin),
      breadcrumbs: [
        ...base.breadcrumbs,
        sectionCrumb,
        { name: STATIC_LABELS.newsTitle, path: canonicalPath },
      ],
      section,
      news: sectionNews,
      visibleText: compact([
        STATIC_LABELS.newsTitle,
        ...sectionNews.flatMap((news) => [
          news.date,
          news.title,
          news.excerpt || news.body,
        ]),
      ]),
      lastModified: latestDate([
        section.updatedAt,
        ...sectionNews.map((news) => news.updatedAt),
      ]),
    });
  }

  if (segments.length === 2 && segments[1] === 'galleri') {
    return finalize({
      ...base,
      kind: 'gallery',
      title: pageTitle(`${STATIC_LABELS.galleryTitle} – ${section.title}`, siteTitle),
      description: section.shortDescription || base.description,
      image: absoluteUrl(section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH, origin),
      breadcrumbs: [
        ...base.breadcrumbs,
        sectionCrumb,
        { name: STATIC_LABELS.galleryTitle, path: canonicalPath },
      ],
      section,
      visibleText: compact([
        STATIC_LABELS.galleryTitle,
        ...visibleMediaText(section),
      ]),
      lastModified: latestDate([
        section.updatedAt,
        ...(section.galleryImages || []).map((image) => image.updatedAt),
        ...(section.videos || []).map((video) => video.updatedAt),
      ]),
    });
  }

  const child = (section.childPages || []).find((item) => item.slug === segments[1]);
  if (!child) return unknownPage(base, siteTitle);

  const childPath = `${sectionPath}/${child.slug}`;
  const childCrumb = { name: child.title, path: childPath };
  const childNews = newsForChild(snapshot, child.id);
  const childEvents = eventsForChild(snapshot, child.id);

  if (segments.length === 2) {
    const previewNews = childNews.slice(0, 2);
    const previewEvents = childEvents.slice(0, 3);
    return finalize({
      ...base,
      kind: 'child',
      canonicalPath: childPath,
      canonicalUrl: absoluteUrl(childPath, origin),
      title: pageTitle(child.title, siteTitle),
      description: child.shortDescription || child.body || section.shortDescription || base.description,
      image: absoluteUrl(
        child.coverImage || section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH,
        origin,
      ),
      breadcrumbs: [...base.breadcrumbs, sectionCrumb, childCrumb],
      section,
      child,
      news: childNews,
      events: childEvents,
      previewNews,
      previewEvents,
      visibleText: compact([
        child.title,
        child.shortDescription,
        child.body,
        ...previewNews.flatMap((news) => [news.title, news.excerpt]),
        ...previewEvents.flatMap((event) => [
          event.title,
          event.date,
          event.time,
          event.location,
          event.description,
        ]),
        ...visibleMediaText(child),
      ]),
      lastModified: latestDate([
        child.updatedAt,
        ...previewNews.map((news) => news.updatedAt),
        ...previewEvents.map((event) => event.updatedAt),
        ...(child.galleryImages || []).map((image) => image.updatedAt),
        ...(child.videos || []).map((video) => video.updatedAt),
      ]),
    });
  }

  if (segments.length === 3 && segments[2] === 'evenemang') {
    return eventListPage({
      base,
      siteTitle,
      origin,
      section,
      child,
      parentPath: childPath,
      parentTitle: child.title,
      events: childEvents,
      breadcrumbs: [...base.breadcrumbs, sectionCrumb, childCrumb],
    });
  }

  return unknownPage(base, siteTitle);
}

function eventListPage({
  base,
  siteTitle,
  origin,
  section,
  child = null,
  parentPath,
  parentTitle,
  events,
  breadcrumbs,
}) {
  const canonicalPath = `${parentPath}/evenemang`;
  return finalize({
    ...base,
    kind: 'event-list',
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath, origin),
    title: pageTitle(`${STATIC_LABELS.eventsTitle} – ${parentTitle}`, siteTitle),
    description: child?.shortDescription || section.shortDescription || base.description,
    image: absoluteUrl(
      child?.coverImage || section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH,
      origin,
    ),
    breadcrumbs: [
      ...breadcrumbs,
      { name: STATIC_LABELS.eventsTitle, path: canonicalPath },
    ],
    section,
    child,
    parentPath,
    events,
    visibleText: compact([
      STATIC_LABELS.eventsTitle,
      ...events.flatMap((event) => [
        event.title,
        event.date,
        event.time,
        event.location,
        event.description,
      ]),
    ]),
    lastModified: latestDate([
      child?.updatedAt,
      section.updatedAt,
      ...events.map((event) => event.updatedAt),
    ]),
  });
}

function eventPage({
  base,
  siteTitle,
  origin,
  section,
  child = null,
  event,
  breadcrumbs,
}) {
  const canonicalPath = `/${section.slug}/evenemang/${encodeURIComponent(event.id)}`;
  const eventListPath = child
    ? `/${section.slug}/${child.slug}/evenemang`
    : `/${section.slug}/evenemang`;
  return finalize({
    ...base,
    kind: 'event',
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath, origin),
    title: pageTitle(event.title, siteTitle),
    description: event.description || `${event.title} – ${event.date}`,
    image: absoluteUrl(
      event.image || section.coverImage || DEFAULT_SOCIAL_IMAGE_PATH,
      origin,
    ),
    breadcrumbs: [
      ...breadcrumbs,
      {
        name: STATIC_LABELS.eventsTitle,
        path: eventListPath,
      },
      { name: event.title, path: canonicalPath },
    ],
    section,
    child,
    event,
    visibleText: compact([
      event.title,
      event.date,
      event.time,
      event.location,
      event.description,
    ]),
    lastModified: event.updatedAt || section.updatedAt || base.lastModified,
  });
}

function unknownPage(base, siteTitle) {
  return finalize({
    ...base,
    kind: 'unknown',
    title: pageTitle('Sidan hittades inte', siteTitle),
    noindex: true,
  });
}

function finalize(page) {
  const image = absoluteUrl(
    page.image || DEFAULT_SOCIAL_IMAGE_PATH,
    page.origin,
  );
  const defaultSocialImage = absoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH, page.origin);
  return {
    ...page,
    canonicalUrl: absoluteUrl(page.canonicalPath, page.origin),
    image,
    imageMeta: image === defaultSocialImage
      ? { ...DEFAULT_SOCIAL_IMAGE }
      : page.imageMeta,
    description: cleanDescription(page.description),
  };
}

function findSection(snapshot, slug) {
  return (snapshot?.sections || []).find((section) => section.slug === slug);
}

function newsForSection(snapshot, sectionId) {
  return (snapshot?.news || []).filter((item) => (
    !item.childPageId
    && (item.sectionId === sectionId || item.sectionId === null)
  ));
}

function eventsForSection(snapshot, sectionId) {
  return (snapshot?.events || []).filter((item) => (
    !item.childPageId
    && (item.sectionId === sectionId || item.sectionId === null)
  ));
}

function newsForChild(snapshot, childId) {
  return (snapshot?.news || []).filter((item) => item.childPageId === childId);
}

function eventsForChild(snapshot, childId) {
  return (snapshot?.events || []).filter((item) => item.childPageId === childId);
}

function visibleMediaText(owner) {
  return [
    ...(owner.galleryImages || []).map((image) => image.caption || image.alt),
    ...(owner.videos || []).map((video) => video.title),
  ];
}

function normalizePath(pathname) {
  let path = typeof pathname === 'string' ? pathname.split('?')[0] : '/';
  try {
    path = decodeURI(path);
  } catch {
    // Keep the original path. A malformed escape sequence will resolve unknown.
  }
  path = `/${path.replace(/^\/+|\/+$/g, '')}`;
  return path === '/' ? path : path.replace(/\/+/g, '/');
}

function pageTitle(label, siteTitle) {
  return label === siteTitle ? siteTitle : `${label} | ${siteTitle}`;
}

export function absoluteUrl(value, origin) {
  if (!value) return new URL(DEFAULT_SOCIAL_IMAGE_PATH, origin).href;
  return new URL(value, origin).href;
}

function cleanDescription(value) {
  const text = String(value || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim();
  return text.length <= 180 ? text : `${text.slice(0, 177).trimEnd()}…`;
}

function compact(values) {
  return values.filter((value) => typeof value === 'string' && value.trim());
}

function latestDate(values) {
  const dates = compact(values).sort();
  return dates.at(-1) || null;
}
