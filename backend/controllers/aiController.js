const historicalDataModel = require('../models/historicalDataModel');
const { generateMockCandles } = require('../services/historicalDataService');
const { getAiPrediction } = require('../services/aiService');

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
  return res.json(response);
}

module.exports = {
  predict,
};
