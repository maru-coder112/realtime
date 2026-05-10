const historicalDataModel = require('../models/historicalDataModel');
const { generateMockCandles } = require('../services/historicalDataService');
const { getAiPrediction } = require('../services/aiService');
const pool = require('../models/db');

async function predict(req, res) {
  const { symbol = 'BTCUSDT' } = req.body;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  let candles = await historicalDataModel.getHistoricalData(
    symbol,
    startDate.toISOString(),
    endDate.toISOString(),
    '1d'
  );

  if (!candles.length) {
    candles = generateMockCandles({ symbol, days: 30, startPrice: symbol === 'ETHUSDT' ? 2500 : 30000 });
  }

  const response = await getAiPrediction(candles, symbol);

  // find comparable symbols by computing correlation of daily returns
  try {
    const candidatesRes = await pool.query(
      `SELECT DISTINCT symbol FROM historical_data WHERE interval = '1d' AND symbol != $1 LIMIT 40`,
      [symbol]
    );
    const candidates = candidatesRes.rows.map((r) => r.symbol).slice(0, 40);

    function returnsFrom(candlesArr) {
      const closes = candlesArr.map((c) => Number(c.close));
      const rets = [];
      for (let i = 1; i < closes.length; i += 1) {
        if (closes[i - 1] === 0) continue;
        rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
      }
      return rets;
    }

    function pearson(a, b) {
      const n = Math.min(a.length, b.length);
      if (n < 2) return 0;
      const aSlice = a.slice(a.length - n);
      const bSlice = b.slice(b.length - n);
      const aMean = aSlice.reduce((s, v) => s + v, 0) / n;
      const bMean = bSlice.reduce((s, v) => s + v, 0) / n;
      let num = 0;
      let aVar = 0;
      let bVar = 0;
      for (let i = 0; i < n; i += 1) {
        const da = aSlice[i] - aMean;
        const db = bSlice[i] - bMean;
        num += da * db;
        aVar += da * da;
        bVar += db * db;
      }
      const denom = Math.sqrt(aVar * bVar);
      if (denom === 0) return 0;
      return num / denom;
    }

    const mainRets = returnsFrom(candles);
    const scored = [];
    for (const cand of candidates) {
      try {
        const other = await require('../models/historicalDataModel').getHistoricalData(
          cand,
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          new Date().toISOString(),
          '1d'
        );
        if (!other || !other.length) continue;
        const otherRets = returnsFrom(other);
        const corr = pearson(mainRets, otherRets);
        scored.push({ symbol: cand, corr: Math.abs(corr) });
      } catch (err) {
        // ignore
      }
    }

    scored.sort((a, b) => b.corr - a.corr);
    const top = scored.slice(0, 3).map((s) => s.symbol);
    response.comparables = top;
  } catch (err) {
    // don't fail the prediction if comparables computation errors
    response.comparables = [];
  }

  return res.json(response);
}

module.exports = {
  predict,
};
