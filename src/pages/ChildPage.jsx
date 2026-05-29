import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import HeroVideoSection from '../components/HeroVideoSection';
import MediaTabs from '../components/MediaTabs';
import MediaPreviewGrid from '../components/MediaPreviewGrid';
import VideoModal from '../components/VideoModal';
import '../pages/Section.css';

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
  // Phase 4.1: unify gallery presentation with Section.jsx — same tabs and
  // modal lightbox as the parent section page so child pages don't lose
  // uploaded videos and feel visually different.
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
  const videos = [...(childPage.videos || [])].sort(byPinnedThenOrder);
  const images = [...(childPage.galleryImages || [])].sort(byPinnedThenOrder);
  const leadVideo = videos[0];
  const hasHeroVideo = !!leadVideo;

  const hasImages = images.length > 0;
  const hasVideos = videos.length > 0;
  // Auto-switch the tab if the chosen one has no content but the other does.
  const effectiveTab = (mediaTab === 'bilder' && !hasImages && hasVideos)
    ? 'video'
    : (mediaTab === 'video' && !hasVideos && hasImages)
      ? 'bilder'
      : mediaTab;

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

      </div>

      {/* Unified gallery — same Video/Foto tabs as the parent section. Shows
          every uploaded image AND every uploaded video for this child page,
          including the hero video itself so it can be re-opened in the
          modal. Fixes the bug where videos uploaded to a child page (e.g.
          Musaik) appeared nowhere on the public site. */}
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
              <MediaPreviewGrid
                items={images}
                type="bilder"
                maxItems={100}
                onImageClick={setActiveImage}
              />
            )}

            {effectiveTab === 'video' && (
              <MediaPreviewGrid
                items={videos}
                type="video"
                maxItems={100}
                onVideoClick={setActiveVideo}
              />
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

      <div style={{ marginTop: '60px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}

function byPinnedThenOrder(a, b) {
  if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}
