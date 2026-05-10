const pool = require('../models/db');

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS virtual_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(12);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';
    
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trade_id VARCHAR(64) NOT NULL,
      trade_data JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}

module.exports = ensureSchema;