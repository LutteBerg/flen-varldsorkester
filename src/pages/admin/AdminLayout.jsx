import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, FileText, Calendar, Globe, LogOut } from 'lucide-react';
import './Admin.css';

export default function AdminLayout() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

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
          <Link to="/" className="admin-nav-link">
            <LogOut size={20} />
            <span>Tillbaka till webbplatsen</span>
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>Administration</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.8rem', backgroundColor: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px' }}>
              Prototype: Sparar i webbläsaren
            </span>
            <div className="admin-user">Inloggad som Ägare</div>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
