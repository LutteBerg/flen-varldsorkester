import {
  DEFAULT_IMAGE_PATH,
  FACEBOOK_URL,
  ORGANIZATION_ADDRESS,
  ORGANIZATION_NAME,
  STATIC_LABELS,
} from './constants.js';
import { absoluteUrl } from './routes.js';

export function renderHead(page) {
  const robots = page.noindex
    ? '<meta name="robots" content="noindex, nofollow, noarchive">'
    : '<meta name="robots" content="index, follow, max-image-preview:large">';
  const json = JSON.stringify(renderJsonLd(page)).replace(/</g, '\\u003c');
  const type = page.kind === 'event' ? 'event' : 'website';

  return [
    page.lcpImage
      ? `<link rel="preload" as="image" href="${escapeHtml(page.lcpImage)}" fetchpriority="high">`
      : '',
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    robots,
    `<link rel="canonical" href="${escapeHtml(page.canonicalUrl)}">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:image" content="${escapeHtml(page.image)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:url" content="${escapeHtml(page.canonicalUrl)}">`,
    '<meta property="og:locale" content="sv_SE">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(page.image)}">`,
    `<script type="application/ld+json">${json}</script>`,
  ].join('');
}

export function renderJsonLd(page) {
  const organizationId = `${page.origin}/#organization`;
  const websiteId = `${page.origin}/#website`;
  const global = page.snapshot?.global || {};
  const facebook = (global.socialLinks || [])
    .find((link) => link.platform?.toLowerCase() === 'facebook')?.url;
  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: global.siteTitle || ORGANIZATION_NAME,
    url: `${page.origin}/`,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(DEFAULT_IMAGE_PATH, page.origin),
    },
    address: {
      '@type': 'PostalAddress',
      ...ORGANIZATION_ADDRESS,
    },
    ...(global.contactInfo?.email ? { email: global.contactInfo.email } : {}),
    sameAs: [facebook || FACEBOOK_URL],
  };
  const graph = [
    organization,
    {
      '@type': 'PerformingGroup',
      '@id': `${page.origin}/#performing-group`,
      name: organization.name,
      url: `${page.origin}/`,
      image: organization.logo.url,
      address: organization.address,
      sameAs: organization.sameAs,
      parentOrganization: { '@id': organizationId },
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${page.origin}/`,
      name: global.siteTitle || ORGANIZATION_NAME,
      inLanguage: 'sv-SE',
      publisher: { '@id': organizationId },
    },
  ];

  if (page.canonicalPath !== '/' && page.breadcrumbs?.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${page.canonicalUrl}#breadcrumb`,
      itemListElement: page.breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path, page.origin),
      })),
    });
  }

  if (page.kind === 'event') {
    graph.push(eventSchema(page.event, page, organizationId));
  }

  if (page.kind === 'event-list') {
    const events = page.events.map((event) => eventSchema(event, page, organizationId));
    graph.push(...events);
    graph.push({
      '@type': 'ItemList',
      '@id': `${page.canonicalUrl}#events`,
      name: STATIC_LABELS.eventsTitle,
      itemListElement: events.map((event, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: { '@id': event['@id'] },
      })),
    });
  }

  if (page.kind === 'news-list') {
    graph.push(...page.news.map((news) => newsSchema(news, page, organizationId)));
  }

  if (page.kind === 'section' || page.kind === 'child' || page.kind === 'gallery') {
    const owner = page.kind === 'child' ? page.child : page.section;
    graph.push(...(owner?.videos || []).map((video) => videoSchema(video, page)));
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function renderNoscript(page) {
  const body = renderNoscriptBody(page);
  if (!body) return '';
  return [
    '<noscript id="crawler-content">',
    '<main aria-label="Sidinnehåll utan JavaScript">',
    body,
    '</main>',
    '</noscript>',
  ].join('');
}

export function renderContentBootstrap(snapshot) {
  const json = JSON.stringify(snapshot).replace(/</g, '\\u003c');
  return `<script type="application/json" id="__PUBLIC_CONTENT__">${json}</script>`;
}

export function createHtmlRewriterHandlers(page) {
  const head = renderHead(page) + renderContentBootstrap(page.snapshot);
  const noscript = renderNoscript(page);
  return {
    title: {
      element(element) {
        element.setInnerContent(page.title);
      },
    },
    head: {
      element(element) {
        element.append(head, { html: true });
      },
    },
    root: {
      element(element) {
        if (noscript) element.after(noscript, { html: true });
      },
    },
    remove: {
      element(element) {
        element.remove();
      },
    },
  };
}

export function stockholmDateTime(date, time = '') {
  if (!date) return undefined;
  if (!time) return date;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);
  if (!match || !timeMatch) return `${date}T${time}`;

  const [, year, month, day] = match;
  const [, hour, minute, second = '00'] = timeMatch;
  const localAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  let offset = stockholmOffsetMs(localAsUtc);
  const actualUtc = localAsUtc - offset;
  offset = stockholmOffsetMs(actualUtc);

  return `${date}T${hour}:${minute}:${second}${formatOffset(offset)}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNoscriptBody(page) {
  switch (page.kind) {
    case 'home':
      return [
        `<h1>${escapeHtml(page.snapshot.global.siteTitle)}</h1>`,
        paragraph(page.snapshot.global.homeIntro),
        '<nav aria-label="Verksamheter"><ul>',
        ...page.sections.map((section) => (
          `<li><a href="/${escapeHtml(section.slug)}"><strong>${escapeHtml(section.title)}</strong></a>`
          + `${paragraph(section.shortDescription)}</li>`
        )),
        '</ul></nav>',
      ].join('');
    case 'about':
      return [
        `<article><h1>${escapeHtml(STATIC_LABELS.aboutTitle)}</h1>`,
        paragraph(page.snapshot.global.aboutText),
        '</article>',
      ].join('');
    case 'contact':
      return [
        `<article><h1>${escapeHtml(STATIC_LABELS.contactTitle)}</h1>`,
        '<section><h2>Hitta hit</h2>',
        page.contact.address
          ? `<address>${escapeHtml(page.contact.address)}</address>`
          : '',
        '</section><section><h2>Kontakta oss</h2>',
        page.contact.email
          ? `<p><strong>E-post:</strong> ${escapeHtml(page.contact.email)}</p>`
          : '',
        page.contact.phone
          ? `<p><strong>Telefon:</strong> ${escapeHtml(page.contact.phone)}</p>`
          : '',
        '</section></article>',
      ].join('');
    case 'section':
      return renderSection(page);
    case 'child':
      return renderChild(page);
    case 'event-list':
      return [
        `<article><h1>${escapeHtml(STATIC_LABELS.eventsTitle)}</h1>`,
        ...page.events.map((event) => renderEventSummary(event, page.section.slug)),
        '</article>',
      ].join('');
    case 'event':
      return [
        '<article>',
        `<h1>${escapeHtml(page.event.title)}</h1>`,
        renderEventMeta(page.event),
        paragraph(page.event.description),
        '</article>',
      ].join('');
    case 'news-list':
      return [
        `<article><h1>${escapeHtml(STATIC_LABELS.newsTitle)}</h1>`,
        ...page.news.map((news) => [
          '<article>',
          `<time datetime="${escapeHtml(news.date)}">${escapeHtml(news.date)}</time>`,
          `<h2>${escapeHtml(news.title)}</h2>`,
          paragraph(news.excerpt || news.body),
          '</article>',
        ].join('')),
        '</article>',
      ].join('');
    case 'gallery':
      return [
        `<article><h1>${escapeHtml(STATIC_LABELS.galleryTitle)}</h1>`,
        renderMedia(page.section),
        '</article>',
      ].join('');
    default:
      return '';
  }
}

function renderSection(page) {
  const section = page.section;
  return [
    '<article>',
    `<h1>${escapeHtml(section.title)}</h1>`,
    paragraph(section.shortDescription),
    paragraph(section.fullDescription),
    ...(section.childPages || []).map((child) => [
      '<section>',
      `<h2><a href="/${escapeHtml(section.slug)}/${escapeHtml(child.slug)}">${escapeHtml(child.title)}</a></h2>`,
      paragraph(child.shortDescription),
      '</section>',
    ].join('')),
    '<section><h2>Senaste Nyheterna</h2>',
    ...page.previewNews.map((news) => [
      '<article>',
      `<h3>${escapeHtml(news.title)}</h3>`,
      paragraph(news.excerpt),
      '</article>',
    ].join('')),
    '</section>',
    '<aside><h2>Praktisk Information</h2>',
    paragraph(section.practicalInfo),
    '<h2>Evenemang</h2>',
    ...page.previewEvents.map((event) => renderEventSummary(event, section.slug)),
    '</aside>',
    renderMedia(section),
    '</article>',
  ].join('');
}

function renderChild(page) {
  const child = page.child;
  return [
    '<article>',
    `<h1>${escapeHtml(child.title)}</h1>`,
    paragraph(child.shortDescription),
    paragraph(child.body),
    page.previewNews.length
      ? [
        '<section><h2>Senaste Nyheterna</h2>',
        ...page.previewNews.map((news) => [
          '<article>',
          `<h3>${escapeHtml(news.title)}</h3>`,
          paragraph(news.excerpt),
          '</article>',
        ].join('')),
        '</section>',
      ].join('')
      : '',
    page.previewEvents.length
      ? [
        '<section><h2>Evenemang</h2>',
        ...page.previewEvents.map((event) => renderEventSummary(event, page.section.slug)),
        '</section>',
      ].join('')
      : '',
    renderMedia(child),
    '</article>',
  ].join('');
}

function renderEventSummary(event, sectionSlug) {
  return [
    '<article>',
    `<h2><a href="/${escapeHtml(sectionSlug)}/evenemang/${escapeHtml(event.id)}">${escapeHtml(event.title)}</a></h2>`,
    renderEventMeta(event),
    paragraph(event.description),
    '</article>',
  ].join('');
}

function renderEventMeta(event) {
  return [
    event.date
      ? `<p><time datetime="${escapeHtml(stockholmDateTime(event.date, event.time))}">${escapeHtml(event.date)}</time></p>`
      : '',
    event.time ? `<p>${escapeHtml(event.time)}</p>` : '',
    event.location ? `<address>${escapeHtml(event.location)}</address>` : '',
  ].join('');
}

function renderMedia(owner) {
  const images = owner?.galleryImages || [];
  const videos = owner?.videos || [];
  if (!images.length && !videos.length) return '';
  return [
    '<section><h2>Galleri</h2>',
    ...images.map((image) => (
      `<figure><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || image.caption || '')}" width="1600" height="900" loading="lazy">`
      + `${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ''}</figure>`
    )),
    ...videos.map((video) => (
      `<article><h3>${escapeHtml(video.title)}</h3></article>`
    )),
    '</section>',
  ].join('');
}

function eventSchema(event, page, organizationId) {
  const sectionSlug = page.section.slug;
  const eventUrl = absoluteUrl(
    `/${sectionSlug}/evenemang/${encodeURIComponent(event.id)}`,
    page.origin,
  );
  const freeAdmission = /(?:^|\W)(fri entr[eé]|gratis)(?:$|\W)/i.test(
    `${event.description || ''} ${event.location || ''}`,
  );

  return {
    '@type': 'Event',
    '@id': `${eventUrl}#event`,
    name: event.title,
    startDate: stockholmDateTime(event.date, event.time),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: eventUrl,
    description: event.description || undefined,
    image: [absoluteUrl(event.image || page.image, page.origin)],
    location: {
      '@type': 'Place',
      name: event.location || 'Amazon',
      address: event.location
        ? {
          '@type': 'PostalAddress',
          streetAddress: event.location,
          addressCountry: 'SE',
        }
        : {
          '@type': 'PostalAddress',
          ...ORGANIZATION_ADDRESS,
        },
    },
    organizer: { '@id': organizationId },
    performer: { '@id': `${page.origin}/#performing-group` },
    ...(freeAdmission
      ? {
        offers: {
          '@type': 'Offer',
          url: eventUrl,
          price: 0,
          priceCurrency: 'SEK',
          availability: 'https://schema.org/InStock',
        },
      }
      : {}),
  };
}

function newsSchema(news, page, organizationId) {
  const id = `${page.canonicalUrl}#news-${encodeURIComponent(news.id)}`;
  return {
    '@type': 'NewsArticle',
    '@id': id,
    headline: news.title,
    datePublished: news.date,
    dateModified: news.updatedAt || news.date,
    description: news.excerpt || news.body || undefined,
    image: absoluteUrl(news.image || page.image, page.origin),
    inLanguage: 'sv-SE',
    mainEntityOfPage: page.canonicalUrl,
    publisher: { '@id': organizationId },
  };
}

function videoSchema(video, page) {
  const videoId = video.videoId || extractVideoId(video.embedUrl || video.url);
  return {
    '@type': 'VideoObject',
    '@id': `${page.canonicalUrl}#video-${encodeURIComponent(video.id)}`,
    name: video.title || 'Video',
    description: video.caption || video.title || undefined,
    embedUrl: video.embedUrl || (
      videoId ? `https://www.youtube.com/embed/${videoId}` : undefined
    ),
    thumbnailUrl: videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : undefined,
    uploadDate: video.createdAt || video.updatedAt || undefined,
  };
}

function paragraph(value) {
  return value ? `<p>${escapeHtml(value)}</p>` : '';
}

function extractVideoId(value = '') {
  const match = String(value).match(/(?:embed\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]+)/);
  return match?.[1];
}

function stockholmOffsetMs(timestamp) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const localAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return localAsUtc - timestamp;
}

function formatOffset(offsetMs) {
  const totalMinutes = Math.round(offsetMs / 60000);
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(totalMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
