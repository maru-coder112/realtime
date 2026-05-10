const tradeModel = require('../models/tradeModel');

async function postTrade(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Authentication required' });

  const { asset, side, type = 'market', price, qty, sl, tp, riskPct } = req.body;
  if (!asset || !side || !qty) return res.status(400).json({ message: 'asset, side and qty are required' });

  const entryPrice = type === 'market' ? (price || null) : price || null;

  const record = await tradeModel.createTrade({ userId, asset, side, type, entryPrice, qty, sl, tp, riskPct, metadata: { ip: req.ip } });
  return res.status(201).json({ trade: record });
}

async function listTrades(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Authentication required' });
  const trades = await tradeModel.getTradesByUser(userId, 200, 0);
  return res.json({ trades });
}

module.exports = { postTrade, listTrades };
