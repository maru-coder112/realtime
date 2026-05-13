const { fetchMarketHistory, fetchMarketSummary, fetchCryptoNews } = require('../services/marketDataService');

const ALLOWED_SYMBOLS = new Set([
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'MATICUSDT',
  'LTCUSDT',
]);
const ALLOWED_INTERVALS = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);

async function getMarketHistory(req, res) {
  const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
  const interval = String(req.query.interval || '1h');
  const limit = Number(req.query.limit || 120);

  if (!ALLOWED_SYMBOLS.has(symbol)) {
    return res.status(400).json({ message: 'Unsupported symbol. Please choose one from the dashboard symbol list.' });
  }

  if (!ALLOWED_INTERVALS.has(interval)) {
    return res.status(400).json({ message: 'Invalid interval. Use 1m, 5m, 15m, 1h, 4h, 1d' });
  }

  const safeLimit = Math.min(Math.max(limit, 30), 500);
  const candles = await fetchMarketHistory({ symbol, interval, limit: safeLimit });

  return res.json({ symbol, interval, candles });
}

async function getMarketSummary(req, res) {
  const data = await fetchMarketSummary();
  return res.json(data);
}

async function getMarketNews(req, res) {
  const limit = Number(req.query.limit || 20);
  const data = await fetchCryptoNews(limit);
  return res.json(data);
}

module.exports = {
  getMarketHistory,
  getMarketSummary,
  getMarketNews,
};
