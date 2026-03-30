CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_code VARCHAR(12),
  email_verification_expires TIMESTAMP,
  role VARCHAR(50) NOT NULL DEFAULT 'user'
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(12);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP;

CREATE TABLE IF NOT EXISTS historical_data (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  open NUMERIC(18, 8) NOT NULL,
  high NUMERIC(18, 8) NOT NULL,
  low NUMERIC(18, 8) NOT NULL,
  close NUMERIC(18, 8) NOT NULL,
  volume NUMERIC(18, 8) NOT NULL,
  interval VARCHAR(20) NOT NULL,
  UNIQUE(symbol, timestamp, interval)
);

CREATE TABLE IF NOT EXISTS strategies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS backtest_results (
  id SERIAL PRIMARY KEY,
  strategy_id INTEGER NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  metrics JSONB NOT NULL,
  trades JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  holdings JSONB NOT NULL DEFAULT '[]'::jsonb
);
