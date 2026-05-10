import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '../components/GoogleIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
    <div className="auth-split-page">
      <section className="auth-visual-side">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <h1>Welcome Back</h1>
          <p>Access your trading workspace, portfolio, and AI-powered insights in one place.</p>
          <div className="auth-visual-metrics">
            <span>Real-time Data</span>
            <span>AI Predictions</span>
            <span>Strategy Lab</span>
            <span>Backtesting</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <form className="card auth-card auth-standalone-card" onSubmit={handleSubmit}>
          <h2>Sign In</h2>
          <p className="muted">Login with Google or email.</p>

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

          <label>Email or Username</label>
          <input
            type="text"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            placeholder="you@example.com or trader_pro"
            required
            disabled={loading}
          />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter your password"
            required
            disabled={loading}
          />

          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          <p>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
