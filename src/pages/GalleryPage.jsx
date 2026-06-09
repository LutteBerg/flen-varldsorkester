import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import { VideoThumbnail } from '../components/VideoEmbed';
import VideoModal from '../components/VideoModal';
import MediaTabs from '../components/MediaTabs';

const VALID_TABS = new Set(['bilder', 'video']);

export default function GalleryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const rawTab = searchParams.get('tab');
  const currentTab = VALID_TABS.has(rawTab) ? rawTab : 'bilder';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const s = await contentRepository.getSectionBySlug(slug);
      setSection(s);
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  function switchTab(next) {
    if (next === currentTab) return;
    setSearchParams({ tab: next }, { replace: true });
  }

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section) return <div className="container" style={{padding: '80px 32px'}}>Sektionen hittades inte.</div>;

  const sortedImages = [...(section.galleryImages || [])].sort(byPinnedThenOrder);
  const sortedVideos = [...(section.videos || [])].sort(byPinnedThenOrder);

  const hasImages = sortedImages.length > 0;
  const hasVideos = sortedVideos.length > 0;

  // If the current tab has no content but the other does, render the other
  // automatically so we never show a stranded empty pane on /galleri.
  const renderTab = (currentTab === 'bilder' && !hasImages && hasVideos)
    ? 'video'
    : (currentTab === 'video' && !hasVideos && hasImages)
      ? 'bilder'
      : currentTab;

  return (
    <div className="section-page animate-fade-in" style={{paddingTop: '80px', paddingBottom: '80px'}}>
      <div className="container">
        <Link to={`/${slug}`} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till {section.title}</span>
        </Link>
        <h1 className="section-title" style={{marginBottom: '32px'}}>Galleri</h1>

        <MediaTabs
          activeTab={renderTab}
          onChange={switchTab}
          hasImages={hasImages}
          hasVideos={hasVideos}
        />

        {renderTab === 'bilder' && (
          <div className="animate-fade-in">
            {hasImages ? (
              <div className="gallery-grid">
                {sortedImages.map((img) => (
                  <button
                    type="button"
                    key={img.id}
                    className="gallery-item gallery-item-button"
                    onClick={() => setActiveImage(img)}
                    aria-label={img.caption ? `Visa bild: ${img.caption}` : 'Visa bild i full storlek'}
                  >
                    <img src={img.src} alt={img.caption || "Galleri bild"} loading="lazy" />
                    {img.caption && <div className="gallery-caption">{img.caption}</div>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">Inga bilder uppladdade just nu.</p>
            )}
          </div>
        )}

        {renderTab === 'video' && (
          <div className="animate-fade-in">
            {hasVideos ? (
              <div className="video-grid">
                {sortedVideos.map((vid) => (
                  <button
                    type="button"
                    key={vid.id}
                    className="video-item video-card-button"
                    onClick={() => setActiveVideo(vid)}
                    aria-label={vid.title ? `Spela video: ${vid.title}` : 'Spela video'}
                  >
                    <VideoThumbnail videoId={vid.videoId} url={vid.url} />
                    {vid.title && <h4 className="video-caption">{vid.title}</h4>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-state">Inga videor uppladdade just nu.</p>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}

function byPinnedThenOrder(a, b) {
  if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}
