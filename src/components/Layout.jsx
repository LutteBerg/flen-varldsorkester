import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { contentRepository } from '../lib/cms/contentRepository';
import './Layout.css';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalContent, setGlobalContent] = useState(null);
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    async function fetchGlobal() {
      const data = await contentRepository.getGlobalContent();
      setGlobalContent(data);
    }
    fetchGlobal();
  }, []);

  if (!globalContent) return null;

  return (
    <div className="layout-wrapper">
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <img src="/assets/fvo_logo.png" alt={globalContent.siteTitle} style={{ height: '40px', width: 'auto' }} />
          </Link>

          <nav className="desktop-nav">
            <Link to="/" className="nav-link">Hem</Link>
            <Link to="/about" className="nav-link">Om Huset</Link>
            <Link to="/contact" className="nav-link">Kontakt</Link>
          </nav>

          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="mobile-nav">
            <Link to="/" className="mobile-nav-link">Hem</Link>
            <Link to="/about" className="mobile-nav-link">Om Huset</Link>
            <Link to="/contact" className="mobile-nav-link">Kontakt</Link>
          </div>
        )}
      </header>

      <main className="main-content page-transition">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <h3>&copy; {globalContent.siteTitle}</h3>
            <p>En levande kulturell mötesplats i Flen.</p>
          </div>
          <div className="footer-links">
            <Link to="/about" className="footer-link">Om oss</Link>
            <Link to="/contact" className="footer-link">Kontakt</Link>
            {globalContent.contactInfo?.facebook && (
               <a href={globalContent.contactInfo.facebook} target="_blank" rel="noreferrer" className="footer-link">Facebook</a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
