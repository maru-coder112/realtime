const portfolioModel = require('../models/portfolioModel');
const userModel = require('../models/userModel');
const { sendUserEmailNotification } = require('../services/notificationService');

async function createPortfolio(req, res) {
  const { name, holdings = [] } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Portfolio name is required' });
  }

  const portfolio = await portfolioModel.createPortfolio({
    userId: req.user.id,
    name,
    holdings,
  });

  return res.status(201).json(portfolio);
}

async function updatePortfolioHolding(req, res) {
  // support special 'default' id: find or create the user's default portfolio
  let portfolioId = req.params.id;
  let current;
  if (portfolioId === 'default') {
    current = await portfolioModel.getPortfolioByUserId(req.user.id);
    if (!current) {
      current = await portfolioModel.createDefaultPortfolio(req.user.id);
    }
    portfolioId = current.id;
  } else {
    current = await portfolioModel.getPortfolioById(portfolioId, req.user.id);
  }
  if (!current) {
    return res.status(404).json({ message: 'Portfolio not found' });
  }

  const { symbol, amount, action = 'upsert' } = req.body;
  if (!symbol) {
    return res.status(400).json({ message: 'symbol is required' });
  }

  let holdings = Array.isArray(current.holdings) ? [...current.holdings] : [];
  const index = holdings.findIndex((h) => h.symbol === symbol);

  if (action === 'remove') {
    holdings = holdings.filter((h) => h.symbol !== symbol);
  } else if (index === -1) {
    holdings.push({ symbol, amount: Number(amount || 0) });
  } else {
    holdings[index] = { ...holdings[index], amount: Number(amount || 0) };
  }

  const updated = await portfolioModel.updateHoldings(portfolioId, req.user.id, holdings);

  const user = await userModel.findById(req.user.id);
  await sendUserEmailNotification(user, {
    subject: `Trade update: ${symbol}`,
    title: 'Portfolio updated',
    message: `Your ${action === 'remove' ? 'position was removed' : 'portfolio holding was updated'} for ${symbol}.`,
    details: [
      `Action: ${action}`,
      `Quantity: ${Number(amount || 0)}`,
      `Portfolio: ${updated?.name || 'Default Portfolio'}`,
    ],
  });

  return res.json(updated);
}

async function getPortfolioById(req, res) {
  let portfolioId = req.params.id;
  let portfolio;
  if (portfolioId === 'default') {
    portfolio = await portfolioModel.getPortfolioByUserId(req.user.id);
    if (!portfolio) {
      portfolio = await portfolioModel.createDefaultPortfolio(req.user.id);
    }
  } else {
    portfolio = await portfolioModel.getPortfolioById(portfolioId, req.user.id);
  }
  if (!portfolio) {
    return res.status(404).json({ message: 'Portfolio not found' });
  }

  return res.json(portfolio);
}

module.exports = {
  createPortfolio,
  updatePortfolioHolding,
  getPortfolioById,
};
