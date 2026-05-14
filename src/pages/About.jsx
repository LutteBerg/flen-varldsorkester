import React, { useState, useEffect } from 'react';
import { contentRepository } from '../lib/cms/contentRepository';

export default function About() {
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
      <h1 style={{ fontSize: '3rem', marginBottom: '24px' }}>Om Amazon i Flen</h1>
      <div className="prose" style={{ fontSize: '1.15rem', lineHeight: '1.8' }}>
        <p>{globalContent.aboutText}</p>
      </div>
    </div>
  );
}
