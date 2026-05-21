import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import VideoEmbed from '../components/VideoEmbed';

export default function ChildPage() {
  const { slug, childSlug } = useParams();
  const [section, setSection] = useState(null);
  const [childPage, setChildPage] = useState(null);
  const [globalContent, setGlobalContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const g = await contentRepository.getGlobalContent();
      const s = await contentRepository.getSectionBySlug(slug);

      setGlobalContent(g);
      setSection(s);

      if (s && s.childPages) {
        const c = s.childPages.find(p => p.slug === childSlug);
        setChildPage(c);
      }
      setLoading(false);
    }
    fetchData();
  }, [slug, childSlug]);

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section || !childPage) return <div className="container" style={{padding: '80px 32px'}}>Sidan hittades inte.</div>;

  // Pinned-first; API already sorts but normalize again for safety.
  const videos = [...(childPage.videos || [])].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
  const leadVideo = videos[0];

  const isVideoHero = !!leadVideo;

  return (
    <div className={`section-page animate-fade-in${isVideoHero ? ' section-page--has-hero-video' : ''}`}>

      {isVideoHero && (
        <section className="section-hero has-video-bg is-light">
          <VideoEmbed
            videoId={leadVideo.videoId}
            url={leadVideo.url}
            embedUrl={leadVideo.embedUrl}
            mode="background"
            title={leadVideo.title || childPage.title}
          />
          <div className="container hero-container" style={{ position: 'relative', zIndex: 2 }}>
            <div className="hero-text-side">
              <Link to={`/${slug}`} className="back-link">
                <ArrowLeft size={20} />
                <span className="text-uppercase">Tillbaka till {section.title}</span>
              </Link>
              <h1 className="section-title">{childPage.title}</h1>
              <p className="section-lead">{childPage.shortDescription}</p>
            </div>
          </div>
        </section>
      )}

      <div className="container" style={{paddingTop: isVideoHero ? '0' : '80px', paddingBottom: '80px'}}>
        {!isVideoHero && (
          <>
            <Link to={`/${slug}`} className="back-link">
              <ArrowLeft size={20} />
              <span className="text-uppercase">Tillbaka till {section.title}</span>
            </Link>
            <h1 className="section-title" style={{marginBottom: '32px'}}>{childPage.title}</h1>
            <p className="section-lead" style={{marginBottom: '48px'}}>{childPage.shortDescription}</p>
          </>
        )}

        <div className="prose">
          <p>{childPage.body}</p>
        </div>

        {childPage.galleryImages && childPage.galleryImages.length > 0 && (
          <div className="gallery-section" style={{marginTop: '60px', marginBottom: '60px'}}>
            <h2 className="block-title">Bildgalleri</h2>
            <div className="gallery-grid">
              {childPage.galleryImages.map((img) => (
                <div key={img.id} className="gallery-item">
                  <img src={img.src} alt={img.caption || "Galleri bild"} />
                  {img.caption && <div className="gallery-caption">{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <div style={{ marginLeft: '-24px', marginRight: '-24px', marginTop: '60px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}
