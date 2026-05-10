import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dash' },
  { label: 'Live Trading', path: '/live-trading', icon: 'live' },
  { label: 'Wallet', path: '/wallet', icon: 'wallet' },
  { label: 'Strategy Lab', path: '/strategy', icon: 'strategy' },
  { label: 'AI Prediction', path: '/ai-prediction', icon: 'ai' },
  { label: 'Market News', path: '/news', icon: 'news' },
  { label: 'Admin', path: '/admin', icon: 'admin', adminOnly: true },
];

function Icon({ name }) {
  if (name === 'dash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h7v13H4zM13 5.5h7v7h-7zM13 14.5h7v4H13z" />
      </svg>
    );
  }

  if (name === 'strategy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M6 17l4-4 3 3 5-7" />
        <path d="M16 9h2v2" />
      </svg>
    );
  }

  if (name === 'ai') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 9h6v6H9z" />
        <path d="M4 12h2M18 12h2M12 4v2M12 18v2" />
        <path d="M7 7l-1.5-1.5M18.5 18.5 17 17M17 7l1.5-1.5M6.5 18.5 8 17" />
      </svg>
    );
  }

  if (name === 'news') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14v12H5z" />
        <path d="M8 9h8M8 12h8M8 15h5" />
      </svg>
    );
  }

  if (name === 'trade') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
        <path d="M9 10l3 3 3-3M9 14l3 3 3-3" />
      </svg>
    );
  }

  if (name === 'live') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12h4v-2H3v2zM7 7h10V5H7v2zm0 10h10v-2H7v2zM17 12h4v-2h-4v2z" />
      </svg>
    );
  }

  if (name === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
        <path d="M16 9v6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5c5.2 0 9.5 4.3 9.5 9.5S17.2 21.5 12 21.5 2.5 17.2 2.5 12 6.8 2.5 12 2.5Z" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

export default function SideNav({ open = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const items = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
    if (onClose) onClose();
  };

  return (
    <>
      <motion.button
        type="button"
        className={`shell-backdrop ${open ? 'visible' : ''}`}
        aria-label="Close navigation"
        onClick={onClose}
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
      />

      <motion.aside
        className={`side-nav ${open ? 'open' : ''}`}
        initial={false}
        animate={{ opacity: open ? 1 : 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="side-nav-brand">
          <div className="brand-mark">RT</div>
          <div>
            <p className="side-nav-label">Realtime Terminal</p>
            <p className="muted side-nav-subtitle">Market intelligence</p>
          </div>
        </div>

        <nav className="side-nav-links">
          {items.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.path}
                type="button"
                className={active ? 'side-nav-item active' : 'side-nav-item'}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="side-nav-icon"><Icon name={item.icon} /></span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-nav-footer card side-nav-footer-compact">
          <div className="side-nav-session">
            <p className="muted side-nav-session-label">Signed in</p>
            <p className="side-nav-user">{user?.username || 'Trader'}</p>
            <p className="muted side-nav-role">{user?.role || 'user'}</p>
          </div>
          <button type="button" className="nav-btn nav-logout-btn nav-logout-btn-compact" onClick={handleLogout}>
            <span aria-hidden>
              <svg viewBox="0 0 24 24">
                <path d="M10 17 15 12 10 7M15 12H5m10-7h4v14h-4" />
              </svg>
            </span>
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
