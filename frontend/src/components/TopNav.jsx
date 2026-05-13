import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect, useRef } from 'react';

function NavGlyph({ name }) {
  const paths = {
    menu: 'M4 7h16M4 12h16M4 17h16',
    chevron: 'M6 9l6 6 6-6',
    profile: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0',
    settings: 'M12 15.5a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 15.5Zm0 0 3.2 1.8 1.3-2.2 2.3.2.4-3.1-2.1-1.2.1-2.5 2.1-1.3-1.1-2.9-2.4.3-1.6-1.9-2.9 1.1-.2 2.2-2.3 1.3-2-1.2-2.2 2.2 1.2 2.1-.2 2.3-2.3 1.3 1 2.9 2.5-.3 1.5 1.9 2.8-1.1Z',
    shield: 'M12 3 5 6v6c0 4.4 3 8.5 7 9 4-0.5 7-4.6 7-9V6l-7-3Z',
    bell: 'M15 17H9a3 3 0 0 0 6 0Zm2-3H7l1.2-1.6A4.2 4.2 0 0 0 9 10V8a3 3 0 1 1 6 0v2a4.2 4.2 0 0 0 .8 2.4Z',
    palette: 'M12 4a8 8 0 1 0 0 16h1a2 2 0 0 0 0-4h-.6a1.4 1.4 0 0 1 0-2.8H14a2 2 0 0 0 0-4h-1.2a1.4 1.4 0 0 1 0-2.8H14a8 8 0 0 0-2-2.4Z',
    chart: 'M5 19V5m0 14h14M8 15l3-4 3 2 4-6',
    help: 'M12 18h.01M9.5 9a2.5 2.5 0 1 1 4.1 2c-.9.7-1.6 1.2-1.6 2.5m-2.5-7.1A4 4 0 1 1 15 9c0 1.4-.8 2.1-1.8 2.8-.8.5-1.2 1-1.2 2.2',
    logout: 'M10 17 15 12 10 7M15 12H5m10-7h4v14h-4',
    search: 'M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.menu} />
    </svg>
  );
}

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.displayName || user?.username || 'Trader';
}

function getInitials(name) {
  return String(name || 'TR')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TR';
}

export default function TopNav({ title, subtitle, className = '' }) {
  const brandTitle = 'Realtime Finance Intelligence and Backtesting Strategy';
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const profileName = getDisplayName(user);
  const profileRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Trader';
  const profileInitials = getInitials(profileName);
  const profileAvatar = user?.avatarUrl || user?.photoUrl || user?.picture || '';

  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('global-search', { detail: { query: searchQuery } }));
      } catch (err) {
        // ignore in non-browser environments
      }
    }, 220);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.isContentEditable !== true) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openProfilePage = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      console.debug('openProfilePage click', { user, token });

      if (!user) {
        if (token && refreshUser) {
          const refreshed = await refreshUser();
          console.debug('openProfilePage refreshUser result', refreshed);
          if (refreshed) {
            navigate('/profile');
            return;
          }
          navigate('/login');
          return;
        }

        navigate('/login');
        return;
      }

      navigate('/profile');
    } catch (err) {
      console.error('openProfilePage error', err && err.message);
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`topbar nav-topbar card ${className}`.trim()}>
      <div className="nav-brand-block" aria-hidden="true" />

      <div className="row gap actions nav-actions">
        <div className="topbar-search" role="search">
          <button
            type="button"
            className="icon-btn topbar-search-btn"
            onClick={() => searchRef.current?.focus()}
            aria-label="Focus search"
            title="Focus search"
          >
            <NavGlyph name="search" />
          </button>
          <input
            ref={searchRef}
            className="topbar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                try { window.dispatchEvent(new CustomEvent('global-search-submit', { detail: { query: searchQuery } })); } catch (_) {}
              }
            }}
            placeholder="Search site... (press / to focus)"
            aria-label="Global search"
          />
        </div>

        <button
          type="button"
          className="icon-btn nav-theme-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          <NavGlyph name="palette" />
        </button>

        <button
          type="button"
          className="icon-btn profile-icon-btn"
          onClick={openProfilePage}
          aria-label={`${profileName}, ${profileRole}`}
          title="Account settings"
        >
          {profileAvatar ? (
            <img src={profileAvatar} alt={profileName} className="profile-icon-image" />
          ) : (
            <span className="profile-initials">{profileInitials}</span>
          )}
        </button>
      </div>
    </header>
  );
}
