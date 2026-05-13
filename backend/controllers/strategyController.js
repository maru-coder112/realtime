const strategyModel = require('../models/strategyModel');
const backtestModel = require('../models/backtestModel');
const historicalDataModel = require('../models/historicalDataModel');
const userModel = require('../models/userModel');
const { generateMockCandles } = require('../services/historicalDataService');
const { runSmaCrossoverBacktest } = require('../services/backtestService');
const { sendUserEmailNotification } = require('../services/notificationService');

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

  const user = await userModel.findById(req.user.id);
  if (user) {
    sendUserEmailNotification(user, {
      subject: `Strategy saved: ${strategy.name}`,
      title: 'Strategy saved',
      message: `Your strategy "${strategy.name}" was saved successfully.`,
      details: [
        strategy.description ? `Description: ${strategy.description}` : null,
        `Strategy ID: ${strategy.id}`,
      ],
    }).catch((error) => {
      console.error('strategyController: failed to send strategy saved notification', error?.message || error);
    });
  }

  return res.status(201).json(strategy);
}

async function listStrategies(req, res) {
  const strategies = await strategyModel.getStrategiesByUser(req.user.id);
  return res.json(strategies);
}

async function updateStrategy(req, res) {
  const strategyId = Number(req.params.id);
  const { name, description, parameters } = req.body;
  const updated = await strategyModel.updateStrategy(strategyId, req.user.id, {
    name,
    description,
    parameters,
  });

  if (!updated) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  const user = await userModel.findById(req.user.id);
  if (user) {
    sendUserEmailNotification(user, {
      subject: `Strategy updated: ${updated.name}`,
      title: 'Strategy updated',
      message: `Your strategy "${updated.name}" was updated successfully.`,
      details: [`Strategy ID: ${updated.id}`],
    }).catch((error) => {
      console.error('strategyController: failed to send strategy updated notification', error?.message || error);
    });
  }

  return res.json(updated);
}

async function deleteStrategy(req, res) {
  const strategyId = Number(req.params.id);
  const deleted = await strategyModel.deleteStrategy(strategyId, req.user.id);

  if (!deleted) {
    return res.status(404).json({ message: 'Strategy not found' });
  }

  return res.json({ message: 'Strategy deleted', id: strategyId });
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

  const user = await userModel.findById(req.user.id);
  await sendUserEmailNotification(user, {
    subject: `Backtest completed: ${strategy.name}`,
    title: 'Backtest completed',
    message: `Your backtest for "${strategy.name}" finished successfully.`,
    details: [
      `Symbol: ${symbol}`,
      `Interval: ${interval}`,
      `Return: ${result.metrics?.returnPct != null ? `${Number(result.metrics.returnPct).toFixed(2)}%` : 'N/A'}`,
      `Sharpe: ${result.metrics?.sharpeRatio != null ? Number(result.metrics.sharpeRatio).toFixed(2) : 'N/A'}`,
    ],
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
  updateStrategy,
  deleteStrategy,
  runBacktest,
  getStrategyPerformance,
};
