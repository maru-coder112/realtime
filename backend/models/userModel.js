const pool = require('./db');

async function createUser({
  username,
  email,
  passwordHash,
  role = 'user',
  emailVerified = false,
  emailVerificationCode = null,
  emailVerificationExpires = null,
}) {
  const query = `
    INSERT INTO users (
      username,
      email,
      password_hash,
      role,
      email_verified,
      email_verification_code,
      email_verification_expires
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, username, email, role, email_verified
  `;
  const values = [
    username,
    email,
    passwordHash,
    role,
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
    'SELECT id, username, email, role, email_verified FROM users WHERE id = $1',
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
      RETURNING id, username, email, role, email_verified
    `,
    [email, code]
  );
  return rows[0];
}

module.exports = {
  createUser,
  findByEmail,
  findByUsername,
  findByEmailOrUsername,
  findById,
  setEmailVerificationCode,
  verifyEmailByCode,
};
