import React, { useState, useEffect } from 'react';
import { contentRepository } from '../lib/cms/contentRepository';
import SocialCTA from '../components/SocialCTA';

export default function Contact() {
  const [globalContent, setGlobalContent] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const gContent = await contentRepository.getGlobalContent();
      setGlobalContent(gContent);
    }
    fetchData();
  }, []);

  if (!globalContent) return <div className="container" style={{padding: '40px 24px'}}>Laddar...</div>;

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '32px' }}>Kontakt & Praktisk Information</h1>
      
      <div style={{ display: 'grid', gap: '32px' }}>
        <div style={styles.card}>
          <h2 style={styles.title}>Hitta hit</h2>
          <p style={styles.text}>{globalContent.contactInfo?.address}</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.title}>Kontakta oss</h2>
          <p style={styles.text}><strong>E-post:</strong> {globalContent.contactInfo?.email}</p>
          <p style={styles.text}><strong>Telefon:</strong> {globalContent.contactInfo?.phone}</p>
        </div>

        {globalContent.contactInfo?.facebook && (
          <div style={styles.card}>
            <h2 style={styles.title}>Följ oss</h2>
            <a href={globalContent.contactInfo.facebook} target="_blank" rel="noreferrer" className="btn-secondary">
              Gå till Facebook-grupp
            </a>
          </div>
        )}
      </div>

      <div style={{ marginTop: '60px', marginLeft: '-24px', marginRight: '-24px' }}>
        <SocialCTA globalContent={globalContent} />
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#f9f9f9',
    padding: '32px',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '16px',
    fontFamily: 'var(--font-heading)'
  },
  text: {
    fontSize: '1.1rem',
    color: 'var(--color-text-main)',
    marginBottom: '8px'
  }
};
