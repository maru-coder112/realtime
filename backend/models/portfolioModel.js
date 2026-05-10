const pool = require('./db');

async function createPortfolio({ userId, name, holdings = [] }) {
  const query = `
    INSERT INTO portfolios (user_id, name, holdings)
    VALUES ($1, $2, $3::jsonb)
    RETURNING *
  `;
  const holdingsJson = JSON.stringify(holdings || []);
  const { rows } = await pool.query(query, [userId, name, holdingsJson]);
  return rows[0];
}

async function getPortfolioById(id, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0];
}

async function getPortfolioByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM portfolios WHERE user_id = $1 ORDER BY id LIMIT 1',
    [userId]
  );
  return rows[0];
}

async function createDefaultPortfolio(userId) {
  const query = `INSERT INTO portfolios (user_id, name, holdings)
     VALUES ($1, $2, $3::jsonb)
     RETURNING *`;
  const { rows } = await pool.query(query, [userId, 'Default Portfolio', JSON.stringify([])]);
  return rows[0];
}

async function updateHoldings(id, userId, holdings) {
  const query = `UPDATE portfolios
     SET holdings = $1::jsonb
     WHERE id = $2 AND user_id = $3
     RETURNING *`;
  const holdingsJson = JSON.stringify(holdings || []);
  const { rows } = await pool.query(query, [holdingsJson, id, userId]);
  return rows[0];
}

module.exports = {
  createPortfolio,
  getPortfolioById,
  updateHoldings,
  getPortfolioByUserId,
  createDefaultPortfolio,
};
