import React from 'react';
import { VideoThumbnail } from './VideoEmbed';
import './MediaPreviewGrid.css';

// Compact preview grid for Section landing pages.
// Always renders up to maxItems items in a 3-column tile layout.
//
// Props:
//   items     - array of media items (already sorted)
//   type      - 'bilder' | 'video'
//   maxItems  - cap (default 3)
//   onVideoClick - (item) => void; required when type === 'video'
//                  to open the VideoModal lightbox

export default function MediaPreviewGrid({ items, type, maxItems = 3, onVideoClick }) {
  const preview = (items || []).slice(0, maxItems);
  if (preview.length === 0) return null;

  if (type === 'video') {
    return (
      <div className="media-preview-grid">
        {preview.map((vid) => (
          <button
            type="button"
            key={`v-${vid.id}`}
            className="media-preview-tile media-preview-video"
            onClick={() => onVideoClick && onVideoClick(vid)}
            aria-label={vid.title ? `Spela video: ${vid.title}` : 'Spela video'}
          >
            <VideoThumbnail videoId={vid.videoId} url={vid.url} />
            {vid.title && <div className="media-preview-caption">{vid.title}</div>}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="media-preview-grid">
      {preview.map((img) => (
        <div key={`i-${img.id}`} className="media-preview-tile">
          <img src={img.src} alt={img.caption || 'Galleribild'} loading="lazy" />
          {img.caption && <div className="media-preview-caption">{img.caption}</div>}
        </div>
      ))}
    </div>
  );
}
