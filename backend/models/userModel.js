const pool = require('./db');

async function createUser({
  username,
  email,
  passwordHash,
  role = 'user',
  emailVerified = false,
  emailVerificationCode = null,
  emailVerificationExpires = null,
  fullName = null,
  avatarUrl = null,
  phone = null,
  country = null,
  bio = null,
  profileSettings = {},
  virtualBalance = 10000,
}) {
  const query = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      role,
      avatar_url,
      full_name,
      phone,
      country,
      bio,
      profile_settings,
      virtual_balance,
      email_verified,
      email_verification_code,
      email_verification_expires
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)
    RETURNING id, username, email, role, email_verified, avatar_url, full_name, phone, country, bio, profile_settings, virtual_balance
  `;
  const values = [
    username,
    email,
    passwordHash,
    role,
    avatarUrl,
    fullName,
    phone,
    country,
    bio,
    JSON.stringify(profileSettings || {}),
    virtualBalance,
    emailVerified,
    emailVerificationCode,
    emailVerificationExpires,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

async function findByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return rows[0];
}

async function findByEmailOrUsername(identifier) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1',
    [identifier]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        username,
        email,
        role,
        email_verified,
        avatar_url,
        full_name,
        phone,
        country,
        bio,
        profile_settings,
        virtual_balance
      FROM users
      WHERE id = $1
    `,
    [id]
  );
  return rows[0];
}

async function setEmailVerificationCode(userId, code, expiresAt) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET email_verification_code = $2,
          email_verification_expires = $3,
          email_verified = FALSE
      WHERE id = $1
      RETURNING id, username, email, role, email_verified
    `,
    [userId, code, expiresAt]
  );
  return rows[0];
}

async function verifyEmailByCode(email, code) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET email_verified = TRUE,
          email_verification_code = NULL,
          email_verification_expires = NULL
      WHERE LOWER(email) = LOWER($1)
        AND email_verification_code = $2
        AND email_verification_expires > NOW()
      RETURNING id, username, email, role, email_verified, avatar_url, full_name, phone, country, bio, profile_settings
    `,
    [email, code]
  );
  return rows[0];
}

async function updateProfileSettings(userId, updates) {
  const {
    username,
    email,
    avatarUrl,
    fullName,
    phone,
    country,
    bio,
    profileSettings,
    emailVerified,
  } = updates;

  const { rows } = await pool.query(
    `
      UPDATE users
      SET username = COALESCE($2, username),
          email = COALESCE($3, email),
          avatar_url = $4,
          full_name = $5,
          phone = $6,
          country = $7,
          bio = $8,
          profile_settings = COALESCE($9::jsonb, profile_settings),
          email_verified = COALESCE($10, email_verified)
      WHERE id = $1
      RETURNING id, username, email, role, email_verified, avatar_url, full_name, phone, country, bio, profile_settings
    `,
    [
      userId,
      username ?? null,
      email ?? null,
      avatarUrl ?? null,
      fullName ?? null,
      phone ?? null,
      country ?? null,
      bio ?? null,
      JSON.stringify(profileSettings || {}),
      typeof emailVerified === 'boolean' ? emailVerified : null,
    ]
  );

  return rows[0];
}

async function updateVirtualBalance(userId, amount) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET virtual_balance = $2
      WHERE id = $1
      RETURNING id, username, email, role, virtual_balance
    `,
    [userId, amount]
  );
  return rows[0];
}

async function resetAllUsersVirtualBalance(amount = 10000) {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET virtual_balance = $1
      WHERE role = 'user'
      RETURNING id, username, email, virtual_balance
    `,
    [amount]
  );
  return rows;
}

module.exports = {
  createUser,
  findByEmail,
  findByUsername,
  findByEmailOrUsername,
  findById,
  setEmailVerificationCode,
  verifyEmailByCode,
  updateProfileSettings,
  updateVirtualBalance,
  resetAllUsersVirtualBalance,
};
