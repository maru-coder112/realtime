const portfolioModel = require('../models/portfolioModel');

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
  const current = await portfolioModel.getPortfolioById(req.params.id, req.user.id);
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

  const updated = await portfolioModel.updateHoldings(req.params.id, req.user.id, holdings);
  return res.json(updated);
}

async function getPortfolioById(req, res) {
  const portfolio = await portfolioModel.getPortfolioById(req.params.id, req.user.id);
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
