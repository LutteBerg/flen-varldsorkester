import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';
import './Home.css';

export default function Home() {
  const [globalContent, setGlobalContent] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const gContent = await contentRepository.getGlobalContent();
      const sContent = await contentRepository.getSections();
      setGlobalContent(gContent);
      setSections(sContent);
    }
    fetchData();
  }, []);

  if (!globalContent) return null;

  // Determine card style based on index to create the alternating pattern:
  //   Card 0 (1st): white   Card 1 (2nd): orange
  //   Card 2 (3rd): orange  Card 3 (4th): white
  const getCardStyleClass = (index) => {
    if (index === 1 || index === 2) return 'card-orange';
    return 'card-white';
  };

  return (
    <div className="home-page animate-fade-in">
      <section className="hero-section container">
        <h1 className="hero-title">{globalContent.siteTitle}</h1>
        <p className="hero-intro">{globalContent.homeIntro}</p>

        {globalContent.socialLinks && globalContent.socialLinks.length > 0 && (
          <div style={{marginTop: '24px', display: 'flex', gap: '16px'}}>
            <a href={globalContent.socialLinks[0].url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{display: 'inline-flex', alignItems: 'center'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              Följ på Facebook
            </a>
          </div>
        )}
      </section>

      <section className="cards-section container">
        <div className="cards-grid">
          {sections.map((section, index) => (
            <Link
              to={`/${section.slug}`}
              key={section.id}
              className={`split-card ${getCardStyleClass(index)}`}
            >
              <div className="card-image-side">
                {section.coverImage ? (
                  <img
                    src={section.coverImage}
                    alt={section.title}
                    className="img-documentary"
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding={index === 0 ? 'sync' : 'async'}
                  />
                ) : (
                  <div className="img-placeholder">Bild kommer</div>
                )}
              </div>
              <div className="card-text-side">
                <div className="card-content-inner">
                  <h2 className="card-title">{section.title}</h2>
                  <p className="card-desc">{section.shortDescription}</p>
                </div>
                <div className="card-footer">
                  <span className="text-uppercase">Läs mer</span>
                  <ArrowRight className="card-icon" size={24} strokeWidth={1.5} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SocialCTA globalContent={globalContent} />
    </div>
  );
}
