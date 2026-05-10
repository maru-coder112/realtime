const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/userModel');
const strategyModel = require('../models/strategyModel');
const backtestModel = require('../models/backtestModel');
const { sendUserEmailNotification } = require('../services/notificationService');

let googleStrategyConfigured = false;

function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

function getServerBaseUrl() {
  return process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
}

function getGoogleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || `${getServerBaseUrl()}/api/auth/google/callback`;
}

function redirectWithGoogleError(res, message) {
  const target = `${getClientUrl()}/login?googleError=${encodeURIComponent(message)}`;
  return res.redirect(target);
}

function isGoogleOauthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
  );
}

function getMissingGoogleOauthVars() {
  const missing = [];
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  return missing;
}

function toUsernameBase(input) {
  const cleaned = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned.slice(0, 24) || 'trader';
}

function toSafeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.email_verified,
    avatarUrl: user.avatar_url,
    fullName: user.full_name,
    phone: user.phone,
    country: user.country,
    bio: user.bio,
    profileSettings: user.profile_settings || {},
    virtualBalance: parseFloat(user.virtual_balance) || 10000,
  };
}

async function buildUniqueUsername(seed) {
  const base = toUsernameBase(seed);
  let candidate = base;
  let counter = 1;

  // Find a unique username for first-time Google users.
  while (await userModel.findByUsername(candidate)) {
    const suffix = `_${counter}`;
    const maxBaseLen = Math.max(3, 24 - suffix.length);
    candidate = `${base.slice(0, maxBaseLen)}${suffix}`;
    counter += 1;
  }

  return candidate;
}

function ensureGoogleStrategyConfigured() {
  if (googleStrategyConfigured) return true;
  if (!isGoogleOauthConfigured()) return false;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;
          if (!email) {
            return done(new Error('Google account does not provide an email address'));
          }

          const normalizedEmail = email.toLowerCase();
          const existing = await userModel.findByEmail(normalizedEmail);
          if (existing) {
            return done(null, toSafeUser(existing));
          }

          const displayName = profile?.displayName || normalizedEmail.split('@')[0];
          const username = await buildUniqueUsername(displayName);
          const passwordHash = await bcrypt.hash(`google-oauth-${Date.now()}-${Math.random()}`, 10);
          const created = await userModel.createUser({
            username,
            email: normalizedEmail,
            passwordHash,
            emailVerified: true,
          });

          return done(null, toSafeUser(created));
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  googleStrategyConfigured = true;
  return true;
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function register(req, res) {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email and password are required' });
  }

  const existing = await userModel.findByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const existingUsername = await userModel.findByUsername(username);
  if (existingUsername) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({
    username,
    email,
    passwordHash,
    emailVerified: true,
  });

  const safeUser = toSafeUser(user);
  const token = signToken(safeUser);

  return res.status(201).json({
    token,
    user: safeUser,
  });
}

async function login(req, res) {
  const { email, username, identifier, password } = req.body;
  const loginIdentifier = String(identifier || email || username || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: 'username/email and password are required' });
  }

  const user = await userModel.findByEmailOrUsername(loginIdentifier);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const safeUser = toSafeUser(user);
  const token = signToken(safeUser);
  return res.json({ token, user: safeUser });
}

async function me(req, res) {
  try {
    const user = await userModel.findById(req.user && req.user.id);
    if (!user) {
      console.error('authController.me: user not found for id', req.user && req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: toSafeUser(user) });
  } catch (err) {
    console.error('authController.me error', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Unable to load user profile' });
  }
}

async function profileSettings(req, res) {
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // compute simple account statistics and recent backtests
  const pool = require('../models/db');
  try {
    const strategies = await strategyModel.getStrategiesByUser(user.id);
    const recentRes = await pool.query(
      `SELECT br.id, br.strategy_id, br.metrics, br.start_date, br.end_date
       FROM backtest_results br
       WHERE br.user_id = $1
       ORDER BY br.id DESC`,
      [user.id]
    );

    const latestBacktestByStrategy = new Map();
    (recentRes.rows || []).forEach((row) => {
      if (!latestBacktestByStrategy.has(row.strategy_id)) {
        latestBacktestByStrategy.set(row.strategy_id, row);
      }
    });

    const backtestHistory = strategies.map((strategy) => {
      const latest = latestBacktestByStrategy.get(strategy.id) || null;
      return {
        id: latest?.id || strategy.id,
        strategy: strategy.name || `Strategy ${strategy.id}`,
        result: latest?.metrics?.returnPct != null
          ? `${Number(latest.metrics.returnPct).toFixed(2)}%`
          : 'Not run yet',
        period: latest?.start_date && latest?.end_date
          ? `${new Date(latest.start_date).toLocaleDateString()} - ${new Date(latest.end_date).toLocaleDateString()}`
          : 'No backtest yet',
        info: latest
          ? [
              latest.metrics?.winRate != null ? `Win rate ${Number(latest.metrics.winRate).toFixed(1)}%` : null,
              latest.metrics?.sharpeRatio != null ? `Sharpe ${Number(latest.metrics.sharpeRatio).toFixed(2)}` : null,
              latest.metrics?.trades != null ? `${Number(latest.metrics.trades)} trades` : null,
            ].filter(Boolean).join(' · ')
          : 'Saved strategy waiting for a backtest run',
      };
    });

    const backtestCount = recentRes.rows?.length || 0;

    const accountStats = [
      { label: 'Join date', value: new Date(user.created_at || user.createdAt || Date.now()).toLocaleDateString(), hint: 'Account onboarding' },
      { label: 'Virtual balance', value: `$${(Number(user.virtual_balance) || 0).toFixed(2)}`, hint: 'Current simulated funds' },
      { label: 'Backtests run', value: String(backtestCount), hint: 'Strategy research history' },
    ];

    return res.json({
      user: toSafeUser(user),
      settings: user.profile_settings || {},
      accountStats,
      savedStrategies: strategies.map((strategy) => ({
        id: strategy.id,
        name: strategy.name,
        description: strategy.description || '',
        parameters: strategy.parameters || {},
      })),
      backtestHistory,
    });
  } catch (err) {
    return res.json({
      user: toSafeUser(user),
      settings: user.profile_settings || {},
    });
  }
}

async function updateProfileSettings(req, res) {
  const currentUser = await userModel.findById(req.user.id);
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  const profile = req.body.profile || {};
  const security = req.body.security || {};
  const trading = req.body.trading || {};
  const notifications = req.body.notifications || {};
  const appearance = req.body.appearance || {};

  const nextUsername = String(profile.username || currentUser.username || '').trim();
  const nextEmail = String(profile.email || currentUser.email || '').trim().toLowerCase();
  const nextFullName = String(profile.fullName || '').trim();
  const nextPhone = String(profile.phone || '').trim();
  const nextCountry = String(profile.region || '').trim();
  const nextBio = String(profile.bio || '').trim();
  const nextAvatarUrl = String(req.body.avatarUrl || profile.avatarUrl || currentUser.avatar_url || '').trim() || null;

  if (!nextUsername || !nextEmail) {
    return res.status(400).json({ message: 'username and email are required' });
  }

  if (nextUsername.toLowerCase() !== String(currentUser.username || '').toLowerCase()) {
    const existingUsername = await userModel.findByUsername(nextUsername);
    if (existingUsername && existingUsername.id !== currentUser.id) {
      return res.status(409).json({ message: 'Username already taken' });
    }
  }

  if (nextEmail.toLowerCase() !== String(currentUser.email || '').toLowerCase()) {
    const existingEmail = await userModel.findByEmail(nextEmail);
    if (existingEmail && existingEmail.id !== currentUser.id) {
      return res.status(409).json({ message: 'Email already registered' });
    }
  }

  const profileSettings = {
    profile: {
      fullName: nextFullName,
      email: nextEmail,
      username: nextUsername,
      phone: nextPhone,
      region: nextCountry,
      bio: nextBio,
    },
    security,
    trading,
    notifications,
    appearance,
    updatedAt: new Date().toISOString(),
  };

  const updatedUser = await userModel.updateProfileSettings(req.user.id, {
    username: nextUsername,
    email: nextEmail,
    avatarUrl: nextAvatarUrl,
    fullName: nextFullName,
    phone: nextPhone,
    country: nextCountry,
    bio: nextBio,
    profileSettings,
    emailVerified: nextEmail !== String(currentUser.email || '').toLowerCase() ? false : currentUser.email_verified,
  });

  await sendUserEmailNotification(updatedUser, {
    subject: 'Profile settings updated',
    title: 'Profile settings saved',
    message: 'Your account settings and notification preferences were updated successfully.',
    details: [
      updatedUser?.email_verified === false ? 'Email address pending verification' : null,
      `Notifications enabled: ${profileSettings.notifications?.email ? 'Yes' : 'No'}`,
    ],
  });

  return res.json({
    user: toSafeUser(updatedUser),
    settings: profileSettings,
    message: 'Profile settings saved successfully',
  });
}

function googleStart(req, res, next) {
  if (!ensureGoogleStrategyConfigured()) {
    const missingVars = getMissingGoogleOauthVars();
    const detail = missingVars.length ? ` Missing: ${missingVars.join(', ')}` : '';
    return redirectWithGoogleError(res, `Google sign in is not configured on server.${detail}`);
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
}

function googleCallback(req, res, next) {
  if (!ensureGoogleStrategyConfigured()) {
    const missingVars = getMissingGoogleOauthVars();
    const detail = missingVars.length ? ` Missing: ${missingVars.join(', ')}` : '';
    return redirectWithGoogleError(res, `Google sign in is not configured on server.${detail}`);
  }

  return passport.authenticate('google', { session: false }, (error, user) => {
    if (error || !user) {
      return redirectWithGoogleError(res, 'Google authentication failed');
    }

    const token = signToken(user);
    const target = `${getClientUrl()}/login?googleToken=${encodeURIComponent(token)}`;
    return res.redirect(target);
  })(req, res, next);
}

module.exports = {
  register,
  login,
  me,
  profileSettings,
  updateProfileSettings,
  googleStart,
  googleCallback,
};
