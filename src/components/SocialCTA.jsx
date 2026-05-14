import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Mail } from 'lucide-react';

export default function SocialCTA({ globalContent }) {
  if (!globalContent) return null;

  const fbLink = globalContent.socialLinks?.find(link => link.platform === 'Facebook')?.url;

  return (
    <div className="social-cta-wrapper">
      <div className="container">
        <div className="social-cta-box">
          <div className="social-cta-text">
            <h2>Vill du följa vad som händer härnäst? Följ oss på Facebook för aktuella konserter, workshops och nyheter.</h2>
          </div>
          <div className="social-cta-actions">
            {fbLink && (
              <a href={fbLink} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <ExternalLink size={20} style={{ marginRight: '8px' }} />
                Följ på Facebook
              </a>
            )}
            <Link to="/contact" className="btn-secondary">
              <Mail size={20} style={{ marginRight: '8px' }} />
              Kontakta oss
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
