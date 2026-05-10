import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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

export default function TopNav({ title, subtitle, className = '', onMenuToggle, menuOpen = false }) {
  const brandTitle = 'Realtime Finance Intelligence and Backtesting Strategy';
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const profileName = getDisplayName(user);
  const profileRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Trader';
  const profileInitials = getInitials(profileName);
  const profileAvatar = user?.avatarUrl || user?.photoUrl || user?.picture || '';

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
      <div className="nav-brand-block">
        <div className="nav-brand-row">
          {!!onMenuToggle && (
            <button
              type="button"
              className={`icon-btn nav-menu-btn ${menuOpen ? 'active' : ''}`.trim()}
              onClick={onMenuToggle}
              aria-label="Toggle navigation sidebar"
            >
              <NavGlyph name="menu" />
            </button>
          )}
          <div>
            <h1 className="nav-brand-title">{brandTitle}</h1>
            {!!title && <p className="nav-section-title">{title}</p>}
            {!!subtitle && <p className="muted">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="row gap actions nav-actions">
        <button
          type="button"
          className="nav-btn nav-theme-btn"
          onClick={toggleTheme}
        >
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* Logout moved to sidebar footer */}

        <div className="user-menu">
          <button
            type="button"
            className="profile-chip profile-chip-action"
            onClick={openProfilePage}
            aria-label={`${profileName}, ${profileRole}`}
            title="Open account settings"
          >
            <span className="profile-chip-avatar">
              {profileAvatar ? (
                <img src={profileAvatar} alt={profileName} />
              ) : (
                profileInitials
              )}
              <span className="profile-status-dot profile-status-dot-avatar" aria-hidden="true" />
            </span>
            <span className="profile-chip-copy">
              <span className="profile-chip-label">Account</span>
              <span className="profile-chip-meta">Settings</span>
            </span>
            <span className="profile-chip-chevron" aria-hidden="true">
              <NavGlyph name="chevron" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
