import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import './Section.css';

function YouTubeEmbed({ url }) {
  if (!url) return null;
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  }
  
  if (!videoId) return null;
  
  return (
    <div className="video-wrapper">
      <iframe 
        width="100%" 
        height="100%" 
        src={`https://www.youtube.com/embed/${videoId}?rel=0`} 
        title="YouTube video player" 
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen
      ></iframe>
    </div>
  );
}

function VideoThumbnail({ url }) {
  if (!url) return null;
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  }
  
  if (!videoId) return null;
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="video-thumb-wrapper">
      <img src={thumbUrl} alt="Video thumbnail" />
      <div className="play-indicator">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </div>
    </div>
  );
}

function YouTubeBackgroundHero({ url }) {
  if (!url) return null;
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  }
  
  if (!videoId) return null;

  return (
    <div className="video-hero-wrapper">
      <div className="video-hero-overlay"></div>
      <iframe
        className="video-hero-iframe"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0&modestbranding=1&playsinline=1`}
        title="Background video"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        tabIndex="-1"
      ></iframe>
    </div>
  );
}

export default function Section() {
  const { slug } = useParams();
  const [section, setSection] = useState(null);
  const [globalContent, setGlobalContent] = useState(null);
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const isVideoHero = section.heroMediaType === 'video' && section.videos?.find(v => v.pinned);
  const pinnedVideo = section.videos?.find(v => v.pinned);
  
  // Previews
  const previewEvents = events.slice(0, 3);
  const previewNews = news.slice(0, 2);
  const previewGallery = section.galleryImages ? section.galleryImages.slice(0, 3) : [];
  const previewVideos = section.videos ? section.videos.filter(v => !v.pinned).slice(0, 2) : [];
  
  const hasMoreGallery = (section.galleryImages?.length > 3) || (section.videos?.length > (pinnedVideo ? 1 : 0));

  return (
    <div className="section-page animate-fade-in">
      
      {/* Top Split Hero */}
      <section className={`section-hero ${isVideoHero ? 'has-video-bg' : ''}`}>
        {isVideoHero && <YouTubeBackgroundHero url={pinnedVideo.url} />}
        
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
                <img src={section.coverImage} alt={section.title} className="img-documentary" />
              ) : (
                <div className="accent-block"></div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Content Area */}
      <section className="section-content-grid container">
        <div className="main-col">
          
          <div className="prose">
            <p>{section.fullDescription}</p>
          </div>

          {/* Child Pages Preview (e.g. Musaik) */}
          {section.childPages && section.childPages.map(child => (
            <div key={child.slug} className="musaik-section">
              <h2 className="block-title" style={{fontSize: '1.75rem'}}>{child.title}</h2>
              <p className="prose" style={{marginBottom: '24px', fontSize: '1.1rem'}}>{child.shortDescription}</p>
              <Link to={`/${slug}/${child.slug}`} className="btn-secondary">Läs mer om {child.title}</Link>
            </div>
          ))}

          {/* News Preview */}
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

      {/* Full-width Media Preview */}
      {(previewGallery.length > 0 || previewVideos.length > 0) && (
        <section className="container">
          <div className="media-section">
            <h2 className="block-title">Galleri & Video</h2>
            <div className="gallery-grid">
              {previewVideos.map((vid, idx) => (
                <Link to={`/${slug}/galleri?tab=video`} key={`v-${idx}`} className="gallery-item video-item">
                  <VideoThumbnail url={vid.url} />
                </Link>
              ))}
              {previewGallery.map((img, idx) => (
                <Link to={`/${slug}/galleri?tab=bilder`} key={`i-${idx}`} className="gallery-item">
                  <img src={img.src} alt={img.caption || "Galleri bild"} />
                </Link>
              ))}
            </div>
            <div style={{marginTop: '32px', textAlign: 'center'}}>
              <Link to={`/${slug}/galleri`} className="btn-secondary">Se hela galleriet</Link>
            </div>
          </div>
        </section>
      )}

      <div style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '40px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}
