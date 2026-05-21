import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // In dev (SeedAdapter mode) there is no /api/admin/login endpoint to call.
  const isDevReadOnly = !import.meta.env.PROD && import.meta.env.VITE_USE_API !== 'true';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      // Clear immediately, regardless of outcome — password never lingers in state.
      setPassword('');
      if (r.status === 401) {
        setError('Fel lösenord.');
        return;
      }
      if (r.status === 500) {
        setError('Servern är felkonfigurerad — kontakta administratör.');
        return;
      }
      if (!r.ok) {
        setError('Inloggning misslyckades. Försök igen.');
        return;
      }
      navigate('/admin');
    } catch {
      setError('Nätverksfel. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <h2>Lutte Berg Admin</h2>
        <p className="login-sub">Logga in för att redigera webbplatsens innehåll.</p>

        {isDevReadOnly && (
          <div className="admin-readonly-banner" style={{ marginBottom: 16 }}>
            Utvecklingsläge (read-only) — inloggning kräver Pages Functions.
          </div>
        )}

        {error && <div className="admin-login-error" role="alert">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="admin-password">Lösenord</label>
          <input
            id="admin-password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={submitting || !password} style={{ width: '100%' }}>
          {submitting ? 'Loggar in...' : 'Logga in'}
        </button>
      </form>
    </div>
  );
}
