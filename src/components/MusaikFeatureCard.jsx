import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './MusaikFeatureCard.css';

// Featured child-project block — currently used to highlight Musaik on the
// Flen Världsorkester section page. Visually distinct from the inline child
// page link below so it reads as a primary CTA, not "yet another link".
//
// Props:
//   logoSrc       - URL to the project logo (rendered with object-fit:contain)
//   logoAlt       - alt text for the logo
//   title         - card title, e.g. "Musaik Projektet"
//   description   - short description paragraph
//   ctaLabel      - text on the action button
//   ctaTo         - react-router target for the CTA

export default function MusaikFeatureCard({ logoSrc, logoAlt, title, description, ctaLabel, ctaTo }) {
  return (
    <section className="musaik-feature container" aria-label={title}>
      <div className="musaik-feature-card">
        <div className="musaik-feature-media">
          {logoSrc && (
            <img
              src={logoSrc}
              alt={logoAlt || title}
              width="800"
              height="800"
              loading="lazy"
              className="musaik-feature-logo"
            />
          )}
        </div>
        <div className="musaik-feature-body">
          <span className="musaik-feature-eyebrow">Utvalt projekt</span>
          <h2 className="musaik-feature-title">{title}</h2>
          {description && <p className="musaik-feature-description">{description}</p>}
          <Link to={ctaTo} className="musaik-feature-cta">
            {ctaLabel || 'Läs mer'}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
