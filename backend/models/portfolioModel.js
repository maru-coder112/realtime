const pool = require('./db');

async function createPortfolio({ userId, name, holdings = [] }) {
  const query = `
    INSERT INTO portfolios (user_id, name, holdings)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [userId, name, holdings]);
  return rows[0];
}

async function getPortfolioById(id, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM portfolios WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0];
}

async function updateHoldings(id, userId, holdings) {
  const { rows } = await pool.query(
    `UPDATE portfolios
     SET holdings = $1
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [holdings, id, userId]
  );
  return rows[0];
}

module.exports = {
  createPortfolio,
  getPortfolioById,
  updateHoldings,
};
