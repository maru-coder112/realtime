import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '../components/GoogleIcon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function passwordChecks(password) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    receiveUpdates: true,
  });
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const checks = passwordChecks(form.password);
  const isPasswordStrong = Object.values(checks).every(Boolean);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorText('');
    setInfoText('');

    const username = form.username.trim();
    const email = form.email.trim();

    if (username.length < 3) {
      setErrorText('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorText('Username can contain letters, numbers, and underscore only.');
      return;
    }

    if (!isPasswordStrong) {
      setErrorText('Password does not meet security requirements.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }

    if (!form.acceptTerms) {
      setErrorText('Please accept the terms and privacy policy.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username,
        email: email.toLowerCase(),
        password: form.password,
      };
      const { data } = await api.post('/api/auth/register', payload);
      login(data);
      navigate('/dashboard');
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-page">
      <section className="auth-visual-side">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <h1>Build Your Trading Workspace</h1>
          <p>Join to track markets, run strategies, and review AI-backed insights in one place.</p>
          <div className="auth-visual-metrics">
            <span>10 symbols</span>
            <span>Live charting</span>
            <span>Strategy lab</span>
            <span>News feed</span>
          </div>
        </div>
      </section>

      <section className="auth-form-side">
        <form className="card auth-card auth-standalone-card" onSubmit={handleSubmit}>
          <h2>Create Account</h2>
          <p className="muted">Sign up with Google or email.</p>

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

          <div className="auth-divider"><span>or signup with email</span></div>

          <label>Full Name</label>
          <input
            value={form.fullName}
            onChange={(e) => updateForm('fullName', e.target.value)}
            placeholder="e.g. Alex Morgan"
          />

          <label>Username</label>
          <input
            value={form.username}
            onChange={(e) => updateForm('username', e.target.value)}
            placeholder="e.g. trader_pro"
            required
          />

          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateForm('email', e.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateForm('password', e.target.value)}
            required
          />

          <div className="password-checks">
            <span className={checks.length ? 'status-good' : 'muted'}>8+ chars</span>
            <span className={checks.upper ? 'status-good' : 'muted'}>Uppercase</span>
            <span className={checks.lower ? 'status-good' : 'muted'}>Lowercase</span>
            <span className={checks.number ? 'status-good' : 'muted'}>Number</span>
            <span className={checks.symbol ? 'status-good' : 'muted'}>Symbol</span>
          </div>

          <label>Confirm Password</label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => updateForm('confirmPassword', e.target.value)}
            required
          />

          <label className="auth-check-row">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => updateForm('acceptTerms', e.target.checked)}
            />
            <span>I agree to the Terms and Privacy Policy</span>
          </label>

          <label className="auth-check-row">
            <input
              type="checkbox"
              checked={form.receiveUpdates}
              onChange={(e) => updateForm('receiveUpdates', e.target.checked)}
            />
            <span>Send me market updates and product news</span>
          </label>

          <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
          <p>
            Already have account? <Link to="/login">Login</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
