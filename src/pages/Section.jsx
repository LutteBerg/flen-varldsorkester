import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import VideoEmbed from '../components/VideoEmbed';
import VideoModal from '../components/VideoModal';
import MediaTabs from '../components/MediaTabs';
import MediaPreviewGrid from '../components/MediaPreviewGrid';
import HeroVideoSection from '../components/HeroVideoSection';
import MusaikFeatureCard from '../components/MusaikFeatureCard';
import './Section.css';

// Slugs that should render the new HeroVideoSection at the top.
const HERO_VIDEO_SLUGS = new Set(['flen-varldsorkester']);

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
  const pinnedVideo = sortedVideos.find(v => v.pinned);
  const isVideoHero = section.heroMediaType === 'video' && pinnedVideo;

  const useNewHero = HERO_VIDEO_SLUGS.has(slug);
  const heroVideo = useNewHero ? (pinnedVideo || sortedVideos[0] || null) : null;

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

      {useNewHero ? (
        <HeroVideoSection
          video={heroVideo}
          title={section.title}
          backTo={{ to: '/', label: 'Hem' }}
          fallbackImage={section.coverImage}
        />
      ) : (
        <section className={`section-hero ${isVideoHero ? 'has-video-bg' : ''}`}>
          {isVideoHero && (
            <VideoEmbed
              videoId={pinnedVideo.videoId}
              url={pinnedVideo.url}
              embedUrl={pinnedVideo.embedUrl}
              mode="background"
              title="Bakgrundsvideo"
            />
          )}

          <div className="container hero-container" style={{ position: 'relative', zIndex: 2 }}>
            <div className="hero-text-side">
              <Link to="/" className="back-link">
                <ArrowLeft size={20} />
                <span className="text-uppercase">Hem</span>
              </Link>
              <h1 className="section-title">{section.title}</h1>
              <p className="section-lead">{section.shortDescription}</p>
            </div>
            {!isVideoHero && (
              <div className="hero-visual-side">
                {section.coverImage ? (
                  <img
                    src={section.coverImage}
                    alt={section.title}
                    className="img-documentary"
                    loading="eager"
                    decoding="sync"
                  />
                ) : (
                  <div className="accent-block"></div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

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
                    <article key={n.id} className="designed-news-card">
                      <div className="news-date-block">
                        <span className="date-month">{new Date(n.date).toLocaleString('sv-SE', { month: 'short' }).toUpperCase()}</span>
                        <span className="date-day">{new Date(n.date).getDate()}</span>
                      </div>
                      <div className="news-content">
                        <h3 className="news-title" style={{fontSize: '1.25rem'}}>{n.title}</h3>
                        <p style={{fontSize: '0.95rem'}}>{n.excerpt}</p>
                      </div>
                    </article>
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

          <div className="events-section">
            <h3 className="block-title" style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Evenemang</h3>
            {previewEvents.length > 0 ? (
              <>
                <div className="events-list">
                  {previewEvents.map(e => (
                    <div key={e.id} className="designed-event-card">
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
                    </div>
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
