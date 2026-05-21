import React from 'react';
import './MediaTabs.css';

// Segmented tabs for Bilder | Video.
//
// Props:
//   activeTab  - 'bilder' | 'video'
//   onChange   - (tab) => void
//   hasImages  - bool; if false, Bilder tab is hidden entirely
//   hasVideos  - bool; if false, Video tab is hidden entirely
//
// If only one tab is visible we still render the segmented control so the user
// sees the type label — it just has nothing to switch to.

export default function MediaTabs({ activeTab, onChange, hasImages, hasVideos }) {
  if (!hasImages && !hasVideos) return null;

  return (
    <div className="media-tabs" role="tablist" aria-label="Mediakategorier">
      {hasImages && (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bilder'}
          className={`media-tab ${activeTab === 'bilder' ? 'is-active' : ''}`}
          onClick={() => onChange('bilder')}
        >
          Bilder
        </button>
      )}
      {hasVideos && (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'video'}
          className={`media-tab ${activeTab === 'video' ? 'is-active' : ''}`}
          onClick={() => onChange('video')}
        >
          Video
        </button>
      )}
    </div>
  );
}
