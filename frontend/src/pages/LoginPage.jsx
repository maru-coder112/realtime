import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import TradingBackground from '../components/TradingBackground';
import MarketChart from '../components/MarketChart';
import MarketOverviewPanel from '../components/MarketOverviewPanel';
import DashboardNews from '../components/DashboardNews';
import { MARKET_SYMBOLS } from '../constants/markets';
import GoogleIcon from '../components/GoogleIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [selectedSymbol, setSelectedSymbol] = useState(MARKET_SYMBOLS[0].value);
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledGoogleLogin = useRef(false);

  useEffect(() => {
    const googleError = searchParams.get('googleError');
    if (googleError) {
      setErrorText(googleError);
    }
  }, [searchParams]);

  useEffect(() => {
    async function completeGoogleLogin() {
      const googleToken = searchParams.get('googleToken');
      if (!googleToken || handledGoogleLogin.current) return;

      handledGoogleLogin.current = true;
      setErrorText('');
      setInfoText('Signing in with Google...');

      localStorage.setItem('token', googleToken);
      try {
        const { data } = await api.get('/api/auth/me');
        login({ token: googleToken, user: data.user });
        navigate('/dashboard');
      } catch (error) {
        localStorage.removeItem('token');
        setInfoText('');
        setErrorText('Google sign in completed, but session could not be restored. Please try again.');
        handledGoogleLogin.current = false;
      }
    }

    completeGoogleLogin();
  }, [login, navigate, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText('');
    setInfoText('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', form);
      login(data);
      navigate('/dashboard');
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="layout dashboard-layout auth-dashboard-page">
      <TradingBackground />

      <header className="topbar nav-topbar card terminal-nav auth-nav">
        <div>
          <h1>Realtime Finance Intelligence and Backtesting Strategy</h1>
          <p className="muted">Live market dashboard preview. Login to unlock strategy and backtesting workspace.</p>
        </div>
        <div className="row gap actions nav-actions auth-nav-actions">
          <button type="button" className="nav-btn" onClick={toggleTheme}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <Link className="nav-btn" to="/register">Register</Link>
        </div>
      </header>

      <div className="dashboard-top full-width">
        <MarketChart selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      </div>

      <div className="dashboard-grid full-width">
        <MarketOverviewPanel selectedSymbol={selectedSymbol} onSelectSymbol={setSelectedSymbol} />

        <form className="card auth-card auth-login-card" onSubmit={handleSubmit}>
          <h2>Login</h2>
          <p className="muted">Use your username or email to enter your dashboard.</p>

          {errorText && <p className="auth-error">{errorText}</p>}
          {infoText && <p className="auth-info">{infoText}</p>}

          <button
            type="button"
            className="auth-google-btn"
            onClick={() => {
              setInfoText('Redirecting to Google...');
              window.location.href = `${API_BASE_URL}/api/auth/google`;
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="auth-divider"><span>or login with email</span></div>

          <label>Username or Email</label>
          <input
            type="text"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button type="submit" disabled={loading}>{loading ? 'Loading...' : 'Login'}</button>
          <p>
            No account? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>

      <DashboardNews limit={6} title="Market Headlines" />
    </div>
  );
}
