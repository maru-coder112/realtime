import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PremiumShell from '../components/PremiumShell';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const TAB_DEFS = [
  { id: 'overview', label: 'User Information', icon: 'user', hint: 'Identity and profile data' },
  { id: 'security', label: 'Security', icon: 'shield', hint: 'Password, 2FA, and devices' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', hint: 'Alerts and delivery channels' },
  { id: 'activity', label: 'Account Stats', icon: 'activity', hint: 'History and performance' },
];

function TabIcon({ name }) {
  const paths = {
    user: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8a7 7 0 0 1 14 0',
    shield: 'M12 3 5 6v6c0 4.4 3 8.5 7 9 4-0.5 7-4.6 7-9V6l-7-3Z',
    chart: 'M5 19V5m0 14h14M8 15l3-4 3 2 4-6',
    bell: 'M15 17H9a3 3 0 0 0 6 0Zm2-3H7l1.2-1.6A4.2 4.2 0 0 0 9 10V8a3 3 0 1 1 6 0v2a4.2 4.2 0 0 0 .8 2.4Z',
    palette: 'M12 4a8 8 0 1 0 0 16h1a2 2 0 0 0 0-4h-.6a1.4 1.4 0 0 1 0-2.8H14a2 2 0 0 0 0-4h-1.2a1.4 1.4 0 0 1 0-2.8H14a8 8 0 0 0-2-2.4Z',
    activity: 'M5 12h3l2-5 4 10 2-5h3',
    danger: 'M12 9v4m0 4h.01M10.2 4.5h3.6L20 15.3 18.2 19.5H5.8L4 15.3 10.2 4.5Z',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.user} />
    </svg>
  );
}

function ProfileGlyph({ name }) {
  const paths = {
    edit: 'M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4a2.1 2.1 0 0 0-3 0L3 14.5V20h1Zm9.5-13.5 4 4',
    lock: 'M8 11V8a4 4 0 0 1 8 0v3m-9 0h10v8H7v-8Zm3 4h4',
    devices: 'M4 7h10v10H4zM16 9h4v6h-4zM6 17h2m8-8h1',
    chart: 'M5 19V5m0 14h14M8 15l3-4 3 2 4-6',
    mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
    moon: 'M15 18a7 7 0 1 1 0-14 8.5 8.5 0 0 0 0 14Z',
    sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.3-6.3-1.4 1.4M7.1 16.9l-1.4 1.4m0-11.3 1.4 1.4m9.2 9.2 1.4 1.4',
    bell: 'M15 17H9a3 3 0 0 0 6 0Zm2-3H7l1.2-1.6A4.2 4.2 0 0 0 9 10V8a3 3 0 1 1 6 0v2a4.2 4.2 0 0 0 .8 2.4Z',
    palette: 'M12 4a8 8 0 1 0 0 16h1a2 2 0 0 0 0-4h-.6a1.4 1.4 0 0 1 0-2.8H14a2 2 0 0 0 0-4h-1.2a1.4 1.4 0 0 1 0-2.8H14a8 8 0 0 0-2-2.4Z',
    support: 'M12 18h.01M9.5 9a2.5 2.5 0 1 1 4.1 2c-.9.7-1.6 1.2-1.6 2.5',
    logout: 'M10 17 15 12 10 7M15 12H5m10-7h4v14h-4',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name] || paths.edit} />
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

function normalizeTab(section) {
  const value = String(section || 'overview').toLowerCase();
  if (TAB_DEFS.some((tab) => tab.id === value)) return value;
  if (value === 'account' || value === 'profile') return 'overview';
  if (value === 'settings') return 'appearance';
  return 'overview';
}

function formatDate(value) {
  if (!value) return 'Active member';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Active member';
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
}

function createDefaultDraft(user, isDark) {
  const displayName = getDisplayName(user);
  const persisted = user?.profileSettings || user?.profile_settings || {};
  const persistedProfile = persisted.profile || {};
  const persistedSecurity = persisted.security || {};
  const persistedTrading = persisted.trading || {};
  const persistedNotifications = persisted.notifications || {};
  const persistedAppearance = persisted.appearance || {};

  return {
    profile: {
      fullName: persistedProfile.fullName || user?.fullName || user?.name || displayName,
      email: persistedProfile.email || user?.email || '',
      username: persistedProfile.username || user?.username || '',
      phone: persistedProfile.phone || user?.phone || '+1 (555) 019-2026',
      region: persistedProfile.region || user?.country || user?.region || 'United States',
      bio: persistedProfile.bio || user?.bio || 'Institutional trading, systematic execution, and disciplined risk management.',
    },
    security: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      twoFactor: Boolean(persistedSecurity.twoFactor ?? true),
      emailVerified: Boolean(user?.emailVerified ?? persistedSecurity.emailVerified ?? true),
      loginAlerts: Boolean(persistedSecurity.loginAlerts ?? true),
    },
    trading: {
      assets: persistedTrading.assets || ['BTC/USD', 'ETH/USD', 'NASDAQ 100', 'EUR/USD'],
      defaultChart: persistedTrading.defaultChart || 'Candlestick',
      currency: persistedTrading.currency || 'USD',
      timezone: persistedTrading.timezone || 'UTC',
      riskMode: persistedTrading.riskMode || 'Balanced',
      leverage: persistedTrading.leverage || '1x',
    },
    notifications: {
      email: Boolean(persistedNotifications.email ?? true),
      push: Boolean(persistedNotifications.push ?? true),
      tradeAlerts: Boolean(persistedNotifications.tradeAlerts ?? true),
      aiAlerts: Boolean(persistedNotifications.aiAlerts ?? true),
      weeklyReport: Boolean(persistedNotifications.weeklyReport ?? true),
    },
    appearance: {
      theme: persistedAppearance.theme || (isDark ? 'dark' : 'light'),
      accent: persistedAppearance.accent || '#00c896',
      layout: persistedAppearance.layout || 'Dense',
      sidebar: persistedAppearance.sidebar || 'Expanded',
    },
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="profile-field">
      <span className="profile-field-label">{label}</span>
      {children}
      {hint ? <span className="profile-field-hint">{hint}</span> : null}
    </label>
  );
}

function ToggleRow({ label, description, checked, onToggle }) {
  return (
    <div className="profile-toggle-row">
      <div>
        <p className="profile-toggle-label">{label}</p>
        <p className="profile-toggle-description">{description}</p>
      </div>
      <button
        type="button"
        className={checked ? 'profile-switch on' : 'profile-switch'}
        aria-pressed={checked}
        onClick={onToggle}
      >
        <span className="profile-switch-knob" />
      </button>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="profile-stat-card">
      <span className="profile-stat-label">{label}</span>
      <strong className="profile-stat-value">{value}</strong>
      {hint ? <span className="profile-stat-hint">{hint}</span> : null}
    </div>
  );
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const { notify } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(normalizeTab(location.state?.section));
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saveState, setSaveState] = useState({ status: 'idle', message: 'Ready to save changes.' });
  const [draft, setDraft] = useState(() => createDefaultDraft(user, isDark));

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);
  const profileAvatar = avatarPreview || user?.avatarUrl || user?.photoUrl || user?.picture || '';
  const joinDate = formatDate(user?.createdAt || user?.created_at || user?.joinedAt);

  useEffect(() => {
    setDraft(createDefaultDraft(user, isDark));
    setAvatarPreview(user?.avatarUrl || user?.photoUrl || user?.picture || '');
  }, [isDark, user]);

  useEffect(() => {
    const nextTab = normalizeTab(location.state?.section);
    setActiveTab(nextTab);
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileSettings() {
      try {
        const { data } = await api.get('/api/auth/profile-settings');
        if (cancelled) return;

        const settings = data?.settings || data?.user?.profileSettings || {};
        const draftFromServer = createDefaultDraft(data?.user || user, isDark);
        setDraft({
          ...draftFromServer,
          profile: { ...draftFromServer.profile, ...(settings.profile || {}) },
          security: { ...draftFromServer.security, ...(settings.security || {}) },
          trading: { ...draftFromServer.trading, ...(settings.trading || {}) },
          notifications: { ...draftFromServer.notifications, ...(settings.notifications || {}) },
          appearance: { ...draftFromServer.appearance, ...(settings.appearance || {}) },
        });
        setAvatarPreview(data?.user?.avatarUrl || data?.user?.avatar_url || '');
        if (data?.savedStrategies) setSavedStrategiesState(data.savedStrategies);
        if (data?.backtestHistory) setBacktestHistoryState(data.backtestHistory);
      } catch {
        if (!cancelled) {
          setDraft(createDefaultDraft(user, isDark));
          setAvatarPreview(user?.avatarUrl || user?.photoUrl || user?.picture || '');
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadProfileSettings();

    return () => {
      cancelled = true;
    };
  }, [isDark, user]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      appearance: {
        ...current.appearance,
        theme: isDark ? 'dark' : 'light',
      },
    }));
  }, [isDark]);

  const [accountStatsState, setAccountStatsState] = useState([
    { label: 'Join date', value: joinDate, hint: 'Account onboarding' },
    { label: 'Backtests run', value: '0', hint: 'Strategy research history' },
    { label: 'Virtual balance', value: `$${user?.virtualBalance?.toFixed?.(2) || '0.00'}`, hint: 'Current simulated funds' },
  ]);

  const [savedStrategiesState, setSavedStrategiesState] = useState([]);
  const [backtestHistoryState, setBacktestHistoryState] = useState([]);
  const [strategyDetails, setStrategyDetails] = useState({});
  const [openStrategyId, setOpenStrategyId] = useState(null);
  const [strategyLoading, setStrategyLoading] = useState(null);
  const [backtestDetails, setBacktestDetails] = useState({});
  const [openBacktestId, setOpenBacktestId] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(null);

  const accentSwatches = ['#00c896', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const updateProfileField = (field, value) => {
    setDraft((current) => ({
      ...current,
      profile: {
        ...current.profile,
        [field]: value,
      },
    }));
  };

  const updateSectionField = (section, field, value) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const toggleValue = (section, field) => {
    setDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: !current[section][field],
      },
    }));
  };

  const toggleAsset = (asset) => {
    setDraft((current) => {
      const assets = current.trading.assets.includes(asset)
        ? current.trading.assets.filter((item) => item !== asset)
        : [...current.trading.assets, asset];

      return {
        ...current,
        trading: {
          ...current.trading,
          assets,
        },
      };
    });
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result || ''));
      setSaveState({ status: 'dirty', message: 'New avatar loaded. Save to sync it to the backend.' });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaveState({ status: 'saving', message: 'Saving settings to the backend...' });
    try {
      const { data } = await api.put('/api/auth/profile-settings', {
        profile: draft.profile,
        security: draft.security,
        trading: draft.trading,
        notifications: draft.notifications,
        appearance: draft.appearance,
        avatarUrl: avatarPreview || null,
      });

      const nextUser = data?.user || {};
      const nextSettings = data?.settings || {};
      setDraft((current) => ({
        ...current,
        profile: { ...current.profile, ...(nextSettings.profile || {}) },
        security: { ...current.security, ...(nextSettings.security || {}) },
        trading: { ...current.trading, ...(nextSettings.trading || {}) },
        notifications: { ...current.notifications, ...(nextSettings.notifications || {}) },
        appearance: { ...current.appearance, ...(nextSettings.appearance || {}) },
      }));
      setAvatarPreview(nextUser.avatarUrl || nextUser.avatar_url || avatarPreview || '');
      // refresh global authenticated user so avatar and settings persist across refresh
      try {
        await refreshUser();
      } catch (e) {
        // ignore
      }
      notify({
        title: 'Notification preferences saved',
        message: 'Your notification settings are now active.',
        variant: 'success',
        kind: 'system',
      });
      setSaveState({ status: 'saved', message: data?.message || 'Profile settings saved to the backend.' });
    } catch (error) {
      notify({
        title: 'Profile save failed',
        message: error.response?.data?.message || 'Unable to save profile settings right now.',
        variant: 'error',
        kind: 'system',
      });
      setSaveState({
        status: 'dirty',
        message: error.response?.data?.message || 'Unable to save profile settings right now.',
      });
    }
  };

  const handleReset = async () => {
    try {
      const { data } = await api.get('/api/auth/profile-settings');
      const settings = data?.settings || data?.user?.profileSettings || {};
      const freshDraft = createDefaultDraft(data?.user || user, isDark);
      setDraft({
        ...freshDraft,
        profile: { ...freshDraft.profile, ...(settings.profile || {}) },
        security: { ...freshDraft.security, ...(settings.security || {}) },
        trading: { ...freshDraft.trading, ...(settings.trading || {}) },
        notifications: { ...freshDraft.notifications, ...(settings.notifications || {}) },
        appearance: { ...freshDraft.appearance, ...(settings.appearance || {}) },
      });
      setAvatarPreview(data?.user?.avatarUrl || data?.user?.avatar_url || '');
      if (data?.savedStrategies) setSavedStrategiesState(data.savedStrategies);
      if (data?.backtestHistory) setBacktestHistoryState(data.backtestHistory);
      notify({
        title: 'Profile reset',
        message: 'Loaded the latest saved settings from the backend.',
        variant: 'info',
        kind: 'system',
      });
      setSaveState({ status: 'idle', message: 'Reverted to the latest backend values.' });
    } catch {
      setDraft(createDefaultDraft(user, isDark));
      setAvatarPreview(user?.avatarUrl || user?.photoUrl || user?.picture || '');
      notify({
        title: 'Profile reset',
        message: 'Reset to locally cached defaults.',
        variant: 'warning',
        kind: 'system',
      });
      setSaveState({ status: 'idle', message: 'Reset to defaults.' });
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

        
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(draft.profile.email);
      setSaveState({ status: 'saved', message: 'Email copied to clipboard.' });
    } catch {
      setSaveState({ status: 'dirty', message: 'Unable to copy email on this browser.' });
    }
  };

  const handleStrategyClick = async (strategyId) => {
    if (!strategyId) return;
    if (openStrategyId === strategyId) {
      setOpenStrategyId(null);
      return;
    }
    if (strategyDetails[strategyId]) {
      setOpenStrategyId(strategyId);
      return;
    }
    setStrategyLoading(strategyId);
    try {
      const { data } = await api.get(`/api/strategies/${strategyId}/performance`);
      setStrategyDetails((prev) => ({ ...prev, [strategyId]: data || {} }));
      setOpenStrategyId(strategyId);
    } catch (err) {
      console.error('Unable to fetch strategy performance', err);
      setSaveState({ status: 'dirty', message: 'Unable to load strategy details.' });
    } finally {
      setStrategyLoading(null);
    }
  };

  const handleBacktestClick = async (backtestId) => {
    if (!backtestId) return;
    if (openBacktestId === backtestId) {
      setOpenBacktestId(null);
      return;
    }
    if (backtestDetails[backtestId]) {
      setOpenBacktestId(backtestId);
      return;
    }
    setBacktestLoading(backtestId);
    try {
      const { data } = await api.get(`/api/backtests/${backtestId}`);
      setBacktestDetails((prev) => ({ ...prev, [backtestId]: data || {} }));
      setOpenBacktestId(backtestId);
    } catch (err) {
      console.error('Unable to fetch backtest details', err);
      setSaveState({ status: 'dirty', message: 'Unable to load backtest details.' });
    } finally {
      setBacktestLoading(null);
    }
  };

  const renderOverview = () => (
    <div className="profile-content-grid">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">User Information</p>
            <h2>Identity and contact details</h2>
          </div>
          <button type="button" className="profile-inline-btn" onClick={handleCopyEmail}>
            <ProfileGlyph name="mail" />
            Copy email
          </button>
          <button type="button" className="profile-inline-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>

        <div className="profile-identity-row">
          <div className="profile-avatar-block">
            <div className="profile-avatar profile-avatar-xl">
              {profileAvatar ? <img src={profileAvatar} alt={displayName} /> : initials}
              <span className="profile-status-dot profile-status-dot-large" aria-hidden="true" />
            </div>
            <div className="profile-avatar-actions">
              <button type="button" className="profile-inline-btn" onClick={triggerAvatarUpload}>
                <ProfileGlyph name="edit" />
                Upload photo
              </button>
              <button type="button" className="profile-ghost-btn" onClick={handleReset}>
                Reset draft
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="profile-form-grid">
            <Field label="Full name" hint="Visible on invoices and reports.">
              <input
                type="text"
                value={draft.profile.fullName}
                onChange={(event) => updateProfileField('fullName', event.target.value)}
              />
            </Field>
            <Field label="Email address" hint="Used for secure account notifications.">
              <input
                type="email"
                value={draft.profile.email}
                onChange={(event) => updateProfileField('email', event.target.value)}
              />
            </Field>
            <Field label="Username" hint="Your public platform handle.">
              <input
                type="text"
                value={draft.profile.username}
                onChange={(event) => updateProfileField('username', event.target.value)}
              />
            </Field>
            <Field label="Phone number" hint="Used for account recovery and alerts.">
              <input
                type="tel"
                value={draft.profile.phone}
                onChange={(event) => updateProfileField('phone', event.target.value)}
              />
            </Field>
            <Field label="Country / region" hint="Localizes timezone and compliance settings.">
              <input
                type="text"
                value={draft.profile.region}
                onChange={(event) => updateProfileField('region', event.target.value)}
              />
            </Field>
            <Field label="Bio / about" hint="Brief professional summary for your workspace.">
              <textarea
                rows="4"
                value={draft.profile.bio}
                onChange={(event) => updateProfileField('bio', event.target.value)}
              />
            </Field>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.04 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Account Statistics</p>
            <h2>Trading performance at a glance</h2>
          </div>
          <button type="button" className="profile-inline-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>
        <div className="profile-stat-grid">
          {accountStatsState.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </motion.section>
    </div>
  );

  const renderSecurity = () => (
    <div className="profile-section-stack">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Account Security</p>
            <h2>Password, 2FA and verification</h2>
          </div>
          <span className={draft.security.emailVerified ? 'profile-badge success' : 'profile-badge warning'}>
            {draft.security.emailVerified ? 'Email verified' : 'Email pending'}
          </span>
          <button type="button" className="profile-inline-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>

        <div className="profile-form-grid profile-form-grid-compact">
          <Field label="Current password">
            <input
              type="password"
              value={draft.security.currentPassword}
              onChange={(event) => updateSectionField('security', 'currentPassword', event.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              value={draft.security.newPassword}
              onChange={(event) => updateSectionField('security', 'newPassword', event.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              value={draft.security.confirmPassword}
              onChange={(event) => updateSectionField('security', 'confirmPassword', event.target.value)}
            />
          </Field>
          <div className="profile-form-actions profile-form-actions-inline">
            <button type="button" className="profile-save-btn" onClick={handleSave}>
              Change password
            </button>
          </div>
        </div>

        <div className="profile-toggle-stack">
          <ToggleRow
            label="Two-factor authentication"
            description="Adds an extra security layer to sign-in and withdrawals."
            checked={draft.security.twoFactor}
            onToggle={() => toggleValue('security', 'twoFactor')}
          />
          <ToggleRow
            label="Login activity alerts"
            description="Receive a secure email when a new device signs in."
            checked={draft.security.loginAlerts}
            onToggle={() => toggleValue('security', 'loginAlerts')}
          />
        </div>
      </motion.section>
    </div>
  );

  const renderTrading = () => (
    <div className="profile-section-stack">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Trading Preferences</p>
            <h2>Assets, charts and execution defaults</h2>
          </div>
        </div>

        <div className="profile-chip-grid">
          {['BTC/USD', 'ETH/USD', 'NASDAQ 100', 'EUR/USD', 'Gold', 'US 10Y'].map((asset) => (
            <button
              key={asset}
              type="button"
              className={draft.trading.assets.includes(asset) ? 'asset-chip active' : 'asset-chip'}
              onClick={() => toggleAsset(asset)}
            >
              {asset}
            </button>
          ))}
        </div>

        <div className="profile-form-grid profile-form-grid-compact">
          <Field label="Default chart style">
            <select
              value={draft.trading.defaultChart}
              onChange={(event) => updateSectionField('trading', 'defaultChart', event.target.value)}
            >
              <option>Candlestick</option>
              <option>Line</option>
              <option>Area</option>
              <option>Heikin Ashi</option>
            </select>
          </Field>
          <Field label="Base currency">
            <select
              value={draft.trading.currency}
              onChange={(event) => updateSectionField('trading', 'currency', event.target.value)}
            >
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>JPY</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select
              value={draft.trading.timezone}
              onChange={(event) => updateSectionField('trading', 'timezone', event.target.value)}
            >
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
              <option>Asia/Singapore</option>
            </select>
          </Field>
          <Field label="Risk profile">
            <select
              value={draft.trading.riskMode}
              onChange={(event) => updateSectionField('trading', 'riskMode', event.target.value)}
            >
              <option>Conservative</option>
              <option>Balanced</option>
              <option>Aggressive</option>
            </select>
          </Field>
          <Field label="Leverage preference">
            <select
              value={draft.trading.leverage}
              onChange={(event) => updateSectionField('trading', 'leverage', event.target.value)}
            >
              <option>1x</option>
              <option>2x</option>
              <option>5x</option>
              <option>10x</option>
            </select>
          </Field>
        </div>
      </motion.section>
    </div>
  );

  const renderNotifications = () => (
    <div className="profile-section-stack">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Notification Settings</p>
            <h2>Manage delivery channels for market intelligence</h2>
          </div>
          <button type="button" className="profile-inline-btn" onClick={handleSave}>
            Save changes
          </button>
        </div>

        <div className="profile-toggle-stack">
          <ToggleRow
            label="Email notifications"
            description="Receive account, security, and market updates by email."
            checked={draft.notifications.email}
            onToggle={() => toggleValue('notifications', 'email')}
          />
          <ToggleRow
            label="Push notifications"
            description="Show alerts on desktop and mobile web sessions."
            checked={draft.notifications.push}
            onToggle={() => toggleValue('notifications', 'push')}
          />
          <ToggleRow
            label="Trade alerts"
            description="Get notified when positions or watchlists move sharply."
            checked={draft.notifications.tradeAlerts}
            onToggle={() => toggleValue('notifications', 'tradeAlerts')}
          />
          <ToggleRow
            label="AI market insight alerts"
            description="Receive signal summaries from the AI research desk."
            checked={draft.notifications.aiAlerts}
            onToggle={() => toggleValue('notifications', 'aiAlerts')}
          />
          <ToggleRow
            label="Weekly performance report"
            description="A compact summary of your trading and backtest results."
            checked={draft.notifications.weeklyReport}
            onToggle={() => toggleValue('notifications', 'weeklyReport')}
          />
        </div>
      </motion.section>
    </div>
  );

  const renderAppearance = () => (
    <div className="profile-section-stack">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Appearance Settings</p>
            <h2>Dark, light, and workspace density controls</h2>
          </div>
        </div>

        <div className="profile-appearance-grid">
          <button type="button" className={isDark ? 'appearance-card active' : 'appearance-card'} onClick={() => !isDark && toggleTheme()}>
            <ProfileGlyph name="moon" />
            <strong>Dark mode</strong>
            <span>Optimized for trading sessions and low-light environments.</span>
          </button>
          <button type="button" className={!isDark ? 'appearance-card active' : 'appearance-card'} onClick={() => isDark && toggleTheme()}>
            <ProfileGlyph name="sun" />
            <strong>Light mode</strong>
            <span>High clarity layout for daytime research and review.</span>
          </button>
        </div>

        <div className="profile-form-grid profile-form-grid-compact">
          <Field label="Accent color">
            <div className="accent-swatch-row">
              {accentSwatches.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  className={draft.appearance.accent === accent ? 'accent-swatch active' : 'accent-swatch'}
                  style={{ background: accent }}
                  onClick={() => updateSectionField('appearance', 'accent', accent)}
                  aria-label={`Select accent color ${accent}`}
                />
              ))}
            </div>
          </Field>
          <Field label="Dashboard density">
            <select
              value={draft.appearance.layout}
              onChange={(event) => updateSectionField('appearance', 'layout', event.target.value)}
            >
              <option>Compact</option>
              <option>Dense</option>
              <option>Comfortable</option>
            </select>
          </Field>
          <Field label="Sidebar width">
            <select
              value={draft.appearance.sidebar}
              onChange={(event) => updateSectionField('appearance', 'sidebar', event.target.value)}
            >
              <option>Collapsed</option>
              <option>Expanded</option>
            </select>
          </Field>
        </div>
      </motion.section>
    </div>
  );

  const renderActivity = () => (
    <div className="profile-section-stack">
      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Saved Strategies</p>
            <h2>Your strategy library</h2>
          </div>
        </div>
        <div className="profile-history-list profile-saved-list compact">
          {savedStrategiesState.length ? savedStrategiesState.map((strategy) => (
            <div
              key={strategy.id}
              className={`profile-history-item clickable ${openStrategyId === strategy.id ? 'expanded' : ''} ${strategyLoading === strategy.id ? 'loading' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => handleStrategyClick(strategy.id)}
            >
              <div>
                <p className="profile-history-title">{strategy.name}</p>
                <p className="profile-history-meta">{strategy.description || 'No description provided'}</p>
                <p className="profile-history-meta">
                  {Object.keys(strategy.parameters || {}).length ? `${Object.keys(strategy.parameters).length} parameter(s)` : 'Default parameters'}
                </p>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <strong className="profile-history-value">Saved</strong>
              </div>
              {openStrategyId === strategy.id && strategyDetails[strategy.id] ? (
                <div className="saved-strategy-details">
                  <div className="saved-strategy-metrics">
                    <div><strong>Return:</strong> {strategyDetails[strategy.id].metrics?.returnPct ?? '—'}</div>
                    <div><strong>Win rate:</strong> {strategyDetails[strategy.id].metrics?.winRate ?? '—'}</div>
                    <div><strong>Sharpe:</strong> {strategyDetails[strategy.id].metrics?.sharpeRatio ?? '—'}</div>
                    <div><strong>Trades:</strong> {Array.isArray(strategyDetails[strategy.id].trades) ? strategyDetails[strategy.id].trades.length : strategyDetails[strategy.id].tradesCount ?? '—'}</div>
                  </div>
                  {Array.isArray(strategyDetails[strategy.id].trades) && strategyDetails[strategy.id].trades.length ? (
                    <details className="saved-strategy-trades">
                      <summary>Show sample trades ({strategyDetails[strategy.id].trades.length})</summary>
                      <pre>{JSON.stringify(strategyDetails[strategy.id].trades.slice(0, 10), null, 2)}</pre>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          )) : (
            <p className="profile-save-copy">No saved strategies yet.</p>
          )}
        </div>
      </motion.section>

      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Backtesting History</p>
            <h2>Latest result for each strategy</h2>
          </div>
        </div>
        <p className="profile-save-copy" style={{ marginBottom: 10 }}>
          Saved strategies with the latest backtest snapshot where available.
        </p>
        <div className="profile-history-list">
            {backtestHistoryState.map((entry) => {
              const backtestId = entry.id;
              const isOpen = openBacktestId === backtestId;
              return (
                <div
                  key={`${entry.strategy}-${entry.period || entry.id}`}
                  className={`profile-history-item clickable ${isOpen ? 'expanded' : ''} ${backtestLoading === backtestId ? 'loading' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBacktestClick(backtestId)}
                >
                  <div>
                    <p className="profile-history-title">{entry.strategy}</p>
                    <p className="profile-history-meta">{entry.period}</p>
                    {entry.info ? <p className="profile-history-meta">{entry.info}</p> : null}
                  </div>
                  <strong className={entry.result && entry.result.toString().startsWith('+') ? 'profile-history-value good' : 'profile-history-value'}>
                    {entry.result}
                  </strong>
                  {isOpen && backtestDetails[backtestId] ? (
                    <div className="saved-strategy-details">
                      <div className="saved-strategy-metrics">
                        <div><strong>Return:</strong> {backtestDetails[backtestId].metrics?.returnPct ?? '—'}</div>
                        <div><strong>Win rate:</strong> {backtestDetails[backtestId].metrics?.winRate ?? '—'}</div>
                        <div><strong>Sharpe:</strong> {backtestDetails[backtestId].metrics?.sharpeRatio ?? '—'}</div>
                        <div><strong>Trades:</strong> {Array.isArray(backtestDetails[backtestId].trades) ? backtestDetails[backtestId].trades.length : backtestDetails[backtestId].tradesCount ?? '—'}</div>
                      </div>
                      {Array.isArray(backtestDetails[backtestId].trades) && backtestDetails[backtestId].trades.length ? (
                        <details className="saved-strategy-trades">
                          <summary>Show sample trades ({backtestDetails[backtestId].trades.length})</summary>
                          <pre>{JSON.stringify(backtestDetails[backtestId].trades.slice(0, 10), null, 2)}</pre>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      </motion.section>

      <motion.section
        className="profile-card card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <div className="profile-card-head">
          <div>
            <p className="kicker">Account Statistics</p>
            <h2>Performance summary</h2>
          </div>
        </div>
        <div className="profile-stat-grid profile-stat-grid-wide">
          {accountStatsState.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      </motion.section>
    </div>
  );

  const renderSection = () => {
    switch (activeTab) {
      case 'security':
        return renderSecurity();
      case 'trading':
        return renderTrading();
      case 'notifications':
        return renderNotifications();
      case 'appearance':
        return renderAppearance();
      case 'activity':
        return renderActivity();
      case 'overview':
      default:
        return renderOverview();
    }
  };

  // Safely attempt to render the active section to avoid a blank page on render errors
  let sectionContent = null;
  try {
    sectionContent = renderSection();
  } catch (err) {
    console.error('ProfilePage renderSection error', err && err.stack ? err.stack : err);
    sectionContent = (
      <div className="profile-error card">
        <h3>Unable to render profile</h3>
        <p>There was an unexpected error while rendering your profile. Check the console for details.</p>
      </div>
    );
  }

  return (
    <PremiumShell title="Account Center" subtitle="Premium profile, security and trading controls">
      <div className="profile-page">
        {!hydrated ? (
          <div className="profile-skeleton-shell">
            <div className="profile-skeleton-hero card">
              <div className="profile-skeleton-avatar skeleton-card" />
              <div className="profile-skeleton-copy">
                <div className="skeleton-card skeleton-line" />
                <div className="skeleton-card skeleton-line short" />
                <div className="skeleton-card skeleton-line short" />
              </div>
            </div>
            <div className="profile-skeleton-grid">
              <div className="skeleton-card profile-skeleton-panel" />
              <div className="skeleton-card profile-skeleton-panel" />
            </div>
          </div>
        ) : (
          <>
            <div className="profile-account-bar card">
              <div className="profile-account-bar-copy">
                <p className="kicker">Account Center</p>
                <h2>Manage your profile, security, and alerts</h2>
              </div>
              <div className="profile-account-bar-actions">
                <div className="profile-tabs profile-tabs-top">
                  {TAB_DEFS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={activeTab === tab.id ? 'profile-tab active' : 'profile-tab'}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="profile-tab-icon">
                        <TabIcon name={tab.icon} />
                      </span>
                      <span className="profile-tab-copy">
                        <strong>{tab.label}</strong>
                        <span>{tab.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <button type="button" className="profile-inline-btn profile-signout-btn" onClick={handleLogout}>
                  <ProfileGlyph name="logout" />
                  Sign out
                </button>
              </div>
            </div>

            <main className="profile-panel">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {sectionContent}
                </motion.div>
              </AnimatePresence>
            </main>
          </>
        )}
      </div>
    </PremiumShell>
  );
}
