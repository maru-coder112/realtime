const strategyModel = require('../models/strategyModel');
const backtestModel = require('../models/backtestModel');
const historicalDataModel = require('../models/historicalDataModel');
const { generateMockCandles } = require('../services/historicalDataService');
const { runSmaCrossoverBacktest } = require('../services/backtestService');

async function createStrategy(req, res) {
  const { name, description, parameters } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Strategy name is required' });
  }

  const strategy = await strategyModel.createStrategy({
    userId: req.user.id,
    name,
    description,
    parameters,
  });

  return res.status(201).json(strategy);
}

async function listStrategies(req, res) {
  const strategies = await strategyModel.getStrategiesByUser(req.user.id);
  return res.json(strategies);
}

async function runBacktest(req, res) {
  const { strategyId, symbol = 'BTCUSDT', startDate, endDate, interval = '1d', parameters = {} } = req.body;

  if (!strategyId || !startDate || !endDate) {
    return res.status(400).json({ message: 'strategyId, startDate and endDate are required' });
  }

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: 'startDate must be before or equal to endDate' });
  }

  const strategy = await strategyModel.getStrategyById(strategyId, req.user.id);
  if (!strategy) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  let candles = await historicalDataModel.getHistoricalData(symbol, startDate, endDate, interval);
  if (!candles.length) {
    candles = generateMockCandles({ symbol, days: 180, startPrice: symbol === 'ETHUSDT' ? 2500 : 30000 });
  }

  const mergedParameters = {
    ...(strategy.parameters || {}),
    ...(parameters || {}),
  };

  const result = runSmaCrossoverBacktest(candles, mergedParameters);
  const saved = await backtestModel.saveBacktestResult({
    strategyId,
    userId: req.user.id,
    startDate,
    endDate,
    metrics: result.metrics,
    trades: result.trades,
  });

  return res.status(201).json(saved);
}

async function getStrategyPerformance(req, res) {
  const strategyId = Number(req.params.id);
  const strategy = await strategyModel.getStrategyById(strategyId, req.user.id);

  if (!strategy) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  const latestBacktest = await backtestModel.getLatestBacktestForStrategy(strategyId, req.user.id);
  if (!latestBacktest) {
    return res.json({ strategyId, backtestId: null, metrics: null, trades: [] });
  }

  return res.json({
    strategyId,
    backtestId: latestBacktest.id,
    metrics: latestBacktest.metrics,
    trades: latestBacktest.trades,
  });
}

module.exports = {
  listStrategies,
  createStrategy,
  runBacktest,
  getStrategyPerformance,
};
