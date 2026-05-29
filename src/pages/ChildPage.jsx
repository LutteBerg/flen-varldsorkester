import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import HeroVideoSection from '../components/HeroVideoSection';

// Child-page renderer (e.g. /flen-varldsorkester/musaik-projektet).
//
// Phase 4 change: this page used to render a different hero implementation
// (`VideoEmbed` mode="background" inside `.section-hero.has-video-bg.is-light`)
// with a flat dark overlay covering the whole video and an early
// listener-removing auto-unmute. That made the video almost invisible and
// caused the "sound first visit, no sound on reload" bug.
//
// Now both the parent section AND its child pages use HeroVideoSection,
// with the same bottom-ribbon design and the same auto-unmute logic. The
// only difference is `variant="light"`, which keeps the surrounding page
// background white and removes the bottom divider.

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
  const hasHeroVideo = !!leadVideo;

  return (
    <div className={`section-page animate-fade-in${hasHeroVideo ? ' section-page--has-hero-video' : ''}`}>

      {hasHeroVideo ? (
        <HeroVideoSection
          video={leadVideo}
          title={childPage.title}
          backTo={{ to: `/${slug}`, label: `Tillbaka till ${section.title}` }}
          fallbackImage={childPage.coverImage}
          variant="light"
        />
      ) : (
        <div className="container" style={{paddingTop: '80px'}}>
          <Link to={`/${slug}`} className="back-link">
            <ArrowLeft size={20} />
            <span className="text-uppercase">Tillbaka till {section.title}</span>
          </Link>
          <h1 className="section-title" style={{marginBottom: '32px'}}>{childPage.title}</h1>
        </div>
      )}

      <div className="container" style={{paddingBottom: '80px'}}>
        {childPage.shortDescription && (
          <p className="section-body-lead">{childPage.shortDescription}</p>
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
                  <img src={img.src} alt={img.alt || img.caption || "Galleri bild"} loading="lazy" />
                  {img.caption && <div className="gallery-caption">{img.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <div style={{ marginTop: '60px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}
