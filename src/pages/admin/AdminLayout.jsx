import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Calendar, Globe, LogOut, Layers } from 'lucide-react';
import { contentRepository } from '../../lib/cms/contentRepository';
import './Admin.css';

// In dev (SeedAdapter), there is no real session/login flow — render directly.
// In prod (ApiAdapter), check /api/admin/session on mount; on 401, redirect to /admin/login.

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const readOnly = contentRepository.isReadOnly();
  const [authState, setAuthState] = useState(readOnly ? 'ready' : 'checking');

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/admin/session', { credentials: 'include' });
        if (cancelled) return;
        if (r.ok) {
          setAuthState('ready');
        } else {
          navigate('/admin/login', { replace: true });
        }
      } catch {
        if (!cancelled) navigate('/admin/login', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [readOnly, navigate]);

  const isActive = (path) => (location.pathname === path ? 'active' : '');

  async function handleLogout() {
    if (readOnly) {
      navigate('/admin/login');
      return;
    }
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch { /* swallow — we redirect either way */ }
    navigate('/admin/login', { replace: true });
  }

  if (authState === 'checking') {
    return <div style={{ padding: 48, fontFamily: 'var(--font-body)' }}>Kontrollerar inloggning…</div>;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link to="/">Lutte Berg Admin</Link>
        </div>

        <nav className="admin-nav">
          <Link to="/admin" className={`admin-nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Översikt</span>
          </Link>
          <Link to="/admin/global" className={`admin-nav-link ${isActive('/admin/global')}`}>
            <Globe size={20} />
            <span>Globala Texter</span>
          </Link>
          <Link to="/admin/sections" className={`admin-nav-link ${isActive('/admin/sections')}`}>
            <Settings size={20} />
            <span>Sektioner</span>
          </Link>
          <Link to="/admin/child-pages" className={`admin-nav-link ${isActive('/admin/child-pages')}`}>
            <Layers size={20} />
            <span>Undersidor</span>
          </Link>
          <Link to="/admin/news" className={`admin-nav-link ${isActive('/admin/news')}`}>
            <FileText size={20} />
            <span>Nyheter</span>
          </Link>
          <Link to="/admin/events" className={`admin-nav-link ${isActive('/admin/events')}`}>
            <Calendar size={20} />
            <span>Evenemang</span>
          </Link>
        </nav>

        <div className="admin-bottom-nav">
          <button onClick={handleLogout} className="admin-nav-link" style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}>
            <LogOut size={20} />
            <span>Logga ut</span>
          </button>
          <Link to="/" className="admin-nav-link">
            <span style={{ marginLeft: 32 }}>Tillbaka till webbplatsen</span>
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>Administration</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {readOnly && (
              <span className="admin-readonly-banner">
                Utvecklingsläge — read-only
              </span>
            )}
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
