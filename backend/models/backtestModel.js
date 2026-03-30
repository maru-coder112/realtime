const pool = require('./db');

async function saveBacktestResult({ strategyId, userId, startDate, endDate, metrics, trades }) {
  const query = `
    INSERT INTO backtest_results (strategy_id, user_id, start_date, end_date, metrics, trades)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
    RETURNING *
  `;
  const safeMetrics = JSON.stringify(metrics || {});
  const safeTrades = JSON.stringify(trades || []);
  const values = [strategyId, userId, startDate, endDate, safeMetrics, safeTrades];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function getBacktestById(id, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM backtest_results WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0];
}

async function getBacktestByIdAnyUser(id) {
  const { rows } = await pool.query(
    'SELECT * FROM backtest_results WHERE id = $1',
    [id]
  );
  return rows[0];
}

async function getLatestBacktestForStrategy(strategyId, userId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM backtest_results
     WHERE strategy_id = $1 AND user_id = $2
     ORDER BY id DESC
     LIMIT 1`,
    [strategyId, userId]
  );

  return rows[0] || null;
}

module.exports = {
  saveBacktestResult,
  getBacktestById,
  getBacktestByIdAnyUser,
  getLatestBacktestForStrategy,
};
