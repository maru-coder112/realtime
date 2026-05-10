const pool = require('./db');

async function createTrade({ userId, asset, side, type, entryPrice, qty, sl, tp, riskPct, metadata = {} }) {
  const now = new Date();
  const trade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    asset,
    side,
    type,
    entryPrice,
    qty,
    sl,
    tp,
    riskPct,
    metadata,
    status: 'open',
    created_at: now,
  };

  const sql = `INSERT INTO trades (user_id, trade_id, trade_data, created_at) VALUES ($1, $2, $3::jsonb, $4) RETURNING id, trade_id, trade_data`;
  const values = [userId, trade.id, JSON.stringify(trade), now];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

async function getTradesByUser(userId, limit = 100, offset = 0) {
  const sql = `SELECT id, trade_id, trade_data FROM trades WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3`;
  const { rows } = await pool.query(sql, [userId, limit, offset]);
  return rows.map((r) => ({ id: r.id, tradeId: r.trade_id, ...r.trade_data }));
}

module.exports = { createTrade, getTradesByUser };
