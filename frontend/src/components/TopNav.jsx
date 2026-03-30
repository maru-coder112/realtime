import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function TopNav({ title, subtitle, className = '' }) {
  const brandTitle = 'Realtime Finance Intelligence and Backtesting Strategy';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <header className={`topbar nav-topbar card ${className}`.trim()}>
      <div>
        <h1 className="nav-brand-title">{brandTitle}</h1>
        {!!title && <p className="nav-section-title">{title}</p>}
        {!!subtitle && <p className="muted">{subtitle}</p>}
      </div>

      <div className="row gap actions nav-actions">
        <button
          type="button"
          className={location.pathname === '/dashboard' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={location.pathname === '/strategy' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => navigate('/strategy')}
        >
          Strategy
        </button>
        <button
          type="button"
          className={location.pathname === '/news' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => navigate('/news')}
        >
          News
        </button>
        <button
          type="button"
          className={location.pathname === '/ai-prediction' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => navigate('/ai-prediction')}
        >
          AI Prediction
        </button>
        {user?.role === 'admin' && (
          <button
            type="button"
            className={location.pathname === '/admin' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => navigate('/admin')}
          >
            Admin
          </button>
        )}
        <button
          type="button"
          className="nav-btn"
          onClick={toggleTheme}
        >
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <div className="user-menu" ref={menuRef}>
          <button
            type="button"
            className={menuOpen ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            User
          </button>

          {menuOpen && (
            <div className="user-dropdown">
              <p className="user-name">{user?.username || 'Trader'}</p>
              <p className="muted user-email">{user?.email || 'No email available'}</p>
              <hr />
              <button
                type="button"
                className="user-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/strategy');
                }}
              >
                Strategy Workspace
              </button>
              <button
                type="button"
                className="user-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/news');
                }}
              >
                Market News
              </button>
              {user?.role === 'admin' && (
                <button
                  type="button"
                  className="user-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/admin');
                  }}
                >
                  Admin Console
                </button>
              )}
              <button
                type="button"
                className="user-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  navigate('/login');
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
