import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data.user);
      } catch (error) {
        // Only remove token on explicit auth failures (401/403).
        const status = error?.response?.status;
        console.error('AuthProvider bootstrap /api/auth/me failed', status, error && error.message);
        if (status === 401 || status === 403) {
          localStorage.removeItem('token');
        } else {
          // If the server failed (500) or is temporarily unreachable, attempt to decode
          // the JWT locally and set a minimal fallback user so the app doesn't log out on refresh.
          try {
            const payload = (token || '').split('.')[1] || '';
            if (payload) {
              const json = JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
              const fallback = {
                id: json.id || json.sub || null,
                email: json.email || null,
                role: json.role || 'user',
              };
              if (fallback.id) {
                setUser(fallback);
                console.warn('AuthProvider set fallback user from token payload');
              }
            }
          } catch (e) {
            console.warn('AuthProvider failed to decode token payload', e && e.message);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const login = ({ token, user: userData }) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch (err) {
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, logout, refreshUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
