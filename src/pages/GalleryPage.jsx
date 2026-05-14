import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';

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

export default function GalleryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentTab = searchParams.get('tab') || 'bilder';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const s = await contentRepository.getSectionBySlug(slug);
      setSection(s);
      setLoading(false);
    }
    fetchData();
  }, [slug]);

  if (loading) return <div className="container" style={{padding: '80px 32px'}}>Laddar...</div>;
  if (!section) return <div className="container" style={{padding: '80px 32px'}}>Sektionen hittades inte.</div>;

  const hasBilder = section.galleryImages && section.galleryImages.length > 0;
  const hasVideos = section.videos && section.videos.length > 0;

  return (
    <div className="section-page animate-fade-in" style={{paddingTop: '80px', paddingBottom: '80px'}}>
      <div className="container">
        <Link to={`/${slug}`} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till {section.title}</span>
        </Link>
        <h1 className="section-title" style={{marginBottom: '32px'}}>Galleri</h1>

        <div style={{display: 'flex', gap: '16px', marginBottom: '48px', borderBottom: '1px solid #ddd'}}>
          <button 
            onClick={() => setSearchParams({ tab: 'bilder' })}
            style={{
              background: 'none', border: 'none', padding: '12px 24px', fontSize: '1.1rem', cursor: 'pointer',
              borderBottom: currentTab === 'bilder' ? '3px solid var(--color-orange)' : '3px solid transparent',
              fontWeight: currentTab === 'bilder' ? 'bold' : 'normal',
              color: currentTab === 'bilder' ? 'var(--color-text-main)' : 'var(--color-text-muted)'
            }}
          >
            Bilder
          </button>
          <button 
            onClick={() => setSearchParams({ tab: 'video' })}
            style={{
              background: 'none', border: 'none', padding: '12px 24px', fontSize: '1.1rem', cursor: 'pointer',
              borderBottom: currentTab === 'video' ? '3px solid var(--color-orange)' : '3px solid transparent',
              fontWeight: currentTab === 'video' ? 'bold' : 'normal',
              color: currentTab === 'video' ? 'var(--color-text-main)' : 'var(--color-text-muted)'
            }}
          >
            Video
          </button>
        </div>

        {currentTab === 'bilder' && (
          <div className="animate-fade-in">
            {hasBilder ? (
              <div className="gallery-grid">
                {section.galleryImages.map((img, idx) => (
                  <div key={idx} className="gallery-item">
                    <img src={img.src} alt={img.caption || "Galleri bild"} />
                    {img.caption && <div className="gallery-caption">{img.caption}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Inga bilder uppladdade just nu.</p>
            )}
          </div>
        )}

        {currentTab === 'video' && (
          <div className="animate-fade-in">
            {hasVideos ? (
              <div className="video-grid">
                {section.videos.map((vid, idx) => (
                  <div key={idx} className="video-item">
                    <YouTubeEmbed url={vid.url} />
                    {vid.title && <h4 className="video-caption">{vid.title}</h4>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">Inga videor uppladdade just nu.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
