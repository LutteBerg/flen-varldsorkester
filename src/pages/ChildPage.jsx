import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';

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

  return (
    <div className="section-page animate-fade-in" style={{paddingTop: '80px', paddingBottom: '80px'}}>
      <div className="container">
        <Link to={`/${slug}`} className="back-link">
          <ArrowLeft size={20} />
          <span className="text-uppercase">Tillbaka till {section.title}</span>
        </Link>
        <h1 className="section-title" style={{marginBottom: '32px'}}>{childPage.title}</h1>
        <p className="section-lead" style={{marginBottom: '48px'}}>{childPage.shortDescription}</p>

        {childPage.videos && childPage.videos.length > 0 && (
          <div className="featured-media-block" style={{marginBottom: '60px'}}>
            <YouTubeEmbed url={childPage.videos[0].url} />
          </div>
        )}

        <div className="prose">
          <p>{childPage.body}</p>
        </div>

        {childPage.galleryImages && childPage.galleryImages.length > 0 && (
          <div className="gallery-section" style={{marginTop: '60px', marginBottom: '60px'}}>
            <h2 className="block-title">Bildgalleri</h2>
            <div className="gallery-grid">
              {childPage.galleryImages.map((img, idx) => (
                <div key={idx} className="gallery-item">
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
