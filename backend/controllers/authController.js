const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const userModel = require('../models/userModel');

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
  const user = await userModel.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: toSafeUser(user) });
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
  googleStart,
  googleCallback,
};
