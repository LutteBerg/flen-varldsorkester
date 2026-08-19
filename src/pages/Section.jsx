import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import VideoModal from '../components/VideoModal';
import NewsModal from '../components/NewsModal';
import MediaTabs from '../components/MediaTabs';
import MediaPreviewGrid from '../components/MediaPreviewGrid';
import HeroVideoSection from '../components/HeroVideoSection';
import MusaikFeatureCard from '../components/MusaikFeatureCard';
import FacebookFeed from '../components/FacebookFeed';
import { resolveHeroVideo } from '../lib/heroMedia';
import './Section.css';

// Sections that show the "Från Facebook" sidebar widget (between
// Praktisk Information and Evenemang). Add a slug here to enable it for
// another section — the backend token in functions/api/facebook-feed.js
// is shared.
const FACEBOOK_FEED_SECTIONS = ['malarateljen'];

// Every section page now uses HeroVideoSection — it handles both the
// video-hero case (pinned/first video → looping background) and the
// image-fallback case (cover image → still hero) inside the same
// component, so Jazz / Målarateljen / Textilverkstad get the same
// orange-bordered title label and body-lead layout as FVO.

export default function Section() {
  const { slug } = useParams();
  const [section, setSection] = useState(null);
  const [globalContent, setGlobalContent] = useState(null);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaTab, setMediaTab] = useState('bilder');
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [activeNews, setActiveNews] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const g = await contentRepository.getGlobalContent();
      const s = await contentRepository.getSectionBySlug(slug);

      setGlobalContent(g);
      setSection(s);

      if (s) {
        const n = await contentRepository.getNewsBySection(s.id);
        const e = await contentRepository.getEventsBySection(s.id);
        setNews(n.filter(item => item.status === 'published'));
        setEvents(e.filter(item => item.status === 'published'));
      }
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section) return <div className="container" style={{padding: '80px 32px'}}>Sektionen hittades inte.</div>;

  const sortedVideos = [...(section.videos || [])].sort(byPinnedThenOrder);
  const sortedImages = [...(section.galleryImages || [])].sort(byPinnedThenOrder);

  // Always use HeroVideoSection. What sits at the top is decided ONLY by the
  // section's own hero settings (see src/lib/heroMedia.js) — media added to
  // the gallery below can no longer take over the header of the page.
  const useNewHero = true;
  const heroVideo = resolveHeroVideo(section, sortedVideos);
  // Kept for downstream layout flags (e.g. full-bleed adjustments).
  const isVideoHero = !!heroVideo;

  const previewEvents = events.slice(0, 3);
  const previewNews = news.slice(0, 2);

  const hasImages = sortedImages.length > 0;
  const hasVideos = sortedVideos.length > 0;
  const effectiveTab = (mediaTab === 'bilder' && !hasImages && hasVideos)
    ? 'video'
    : (mediaTab === 'video' && !hasVideos && hasImages)
      ? 'bilder'
      : mediaTab;

  const hasFullBleedHero = isVideoHero || useNewHero;

  return (
    <div className={`section-page animate-fade-in${hasFullBleedHero ? ' section-page--has-hero-video' : ''}`}>

      <HeroVideoSection
        video={heroVideo}
        title={section.title}
        backTo={{ to: '/', label: 'Hem' }}
        fallbackImage={section.coverImage}
        externalPaused={!!activeVideo}
      />

      <section className="section-content-grid container">
        <div className="main-col">

          {useNewHero && section.shortDescription && (
            <p className="section-body-lead">{section.shortDescription}</p>
          )}

          <div className="prose">
            <p>{section.fullDescription}</p>
          </div>

          {section.childPages && section.childPages
            .filter(child => !(useNewHero && child.slug === 'musaik-projektet'))
            .map(child => (
              <div key={child.slug} className="musaik-section">
                <h2 className="block-title" style={{fontSize: '1.75rem'}}>{child.title}</h2>
                <p className="prose" style={{marginBottom: '24px', fontSize: '1.1rem'}}>{child.shortDescription}</p>
                <Link to={`/${slug}/${child.slug}`} className="btn-secondary">Läs mer om {child.title}</Link>
              </div>
            ))}

          <div className="news-section">
            <h2 className="block-title">Senaste Nyheterna</h2>
            {previewNews.length > 0 ? (
              <>
                <div className="news-list">
                  {previewNews.map(n => (
                    <button
                      type="button"
                      key={n.id}
                      className="designed-news-card news-card-button"
                      onClick={() => setActiveNews(n)}
                    >
                      <div className="news-date-block">
                        <span className="date-month">{new Date(n.date).toLocaleString('sv-SE', { month: 'short' }).toUpperCase()}</span>
                        <span className="date-day">{new Date(n.date).getDate()}</span>
                      </div>
                      <div className="news-content">
                        <div className="news-title" style={{fontSize: '1.25rem'}}>{n.title}</div>
                        <p style={{fontSize: '0.95rem'}}>{n.excerpt}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{marginTop: '24px'}}>
                  <Link to={`/${slug}/nyheter`} className="btn-secondary">Visa alla nyheter</Link>
                </div>
              </>
            ) : (
              <p className="empty-state">Inga nyheter publicerade just nu.</p>
            )}
          </div>

        </div>

        <aside className="sidebar">
          <div className="practical-card">
            <h3 className="practical-title">Praktisk Information</h3>
            <div className="practical-content">
              {section.practicalInfo}
            </div>
          </div>

          {FACEBOOK_FEED_SECTIONS.includes(slug) && <FacebookFeed />}

          <div className="events-section">
            <h3 className="block-title" style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Evenemang</h3>
            {previewEvents.length > 0 ? (
              <>
                <div className="events-list">
                  {previewEvents.map(e => (
                    <Link key={e.id} to={`/${slug}/evenemang/${e.id}`} className="designed-event-card event-card-link">
                      <div className="event-stripe"></div>
                      <div className="event-content" style={{padding: '16px'}}>
                        <h4 className="event-title" style={{fontSize: '1.1rem'}}>{e.title}</h4>
                        <div className="event-meta" style={{gap: '8px'}}>
                          <div className="meta-item">
                            <Calendar size={14} />
                            <span style={{fontSize: '0.85rem'}}>{e.date}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{marginTop: '24px'}}>
                  <Link to={`/${slug}/evenemang`} className="btn-secondary" style={{width: '100%', textAlign: 'center'}}>Visa alla evenemang</Link>
                </div>
              </>
            ) : (
              <p className="empty-state">Inga kommande evenemang.</p>
            )}
          </div>
        </aside>
      </section>

      {useNewHero && (() => {
        const musaik = (section.childPages || []).find(c => c.slug === 'musaik-projektet');
        if (!musaik) return null;
        return (
          <MusaikFeatureCard
            logoSrc="/assets/musaik/logo.png"
            logoAlt="Musaik logotyp"
            title={musaik.title || 'Musaik Projektet'}
            description={musaik.shortDescription || 'Ett projekt inom Flen Världsorkester med fokus på skapande, gemenskap och musikaliska uttryck.'}
            ctaLabel={`Läs mer om ${musaik.title || 'Musaik'}`}
            ctaTo={`/${slug}/${musaik.slug}`}
          />
        );
      })()}

      {(hasImages || hasVideos) && (
        <section className="container">
          <div className="media-section">
            <div className="media-section-head">
              <h2 className="block-title" style={{ marginBottom: 0 }}>Galleri</h2>
              <MediaTabs
                activeTab={effectiveTab}
                onChange={setMediaTab}
                hasImages={hasImages}
                hasVideos={hasVideos}
              />
            </div>

            {effectiveTab === 'bilder' && (
              <>
                <MediaPreviewGrid
                  items={sortedImages}
                  type="bilder"
                  maxItems={3}
                  onImageClick={setActiveImage}
                />
                {sortedImages.length > 0 && (
                  <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link to={`/${slug}/galleri?tab=bilder`} className="btn-secondary">
                      Visa fler bilder
                    </Link>
                  </div>
                )}
              </>
            )}

            {effectiveTab === 'video' && (
              <>
                <MediaPreviewGrid
                  items={sortedVideos}
                  type="video"
                  maxItems={3}
                  onVideoClick={setActiveVideo}
                />
                {sortedVideos.length > 0 && (
                  <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <Link to={`/${slug}/galleri?tab=video`} className="btn-secondary">
                      Visa fler videor
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      <VideoModal
        isOpen={!!activeVideo}
        onClose={() => setActiveVideo(null)}
        videoId={activeVideo?.videoId}
        embedUrl={activeVideo?.embedUrl}
        url={activeVideo?.url}
        title={activeVideo?.title}
      />

      <VideoModal
        isOpen={!!activeImage}
        onClose={() => setActiveImage(null)}
        image={activeImage ? { src: activeImage.src, alt: activeImage.alt || activeImage.caption } : null}
        title={activeImage?.caption}
      />

      <NewsModal
        isOpen={!!activeNews}
        onClose={() => setActiveNews(null)}
        item={activeNews}
      />

      <div style={{ marginTop: '40px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}

function byPinnedThenOrder(a, b) {
  if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}
