const pool = require('../models/db');
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // support special 'default' id: find or create the user's default portfolio
    let portfolioId = req.params.id;
    let current;
    if (portfolioId === 'default') {
      const existing = await client.query('SELECT * FROM portfolios WHERE user_id = $1 ORDER BY id LIMIT 1', [req.user.id]);
      current = existing.rows[0];
      if (!current) {
        const created = await client.query(
          `INSERT INTO portfolios (user_id, name, holdings)
           VALUES ($1, $2, $3::jsonb)
           RETURNING *`,
          [req.user.id, 'Default Portfolio', JSON.stringify([])]
        );
        current = created.rows[0];
      }
      portfolioId = current.id;
    } else {
      const found = await client.query('SELECT * FROM portfolios WHERE id = $1 AND user_id = $2', [portfolioId, req.user.id]);
      current = found.rows[0];
    }
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const { symbol, amount, price, action = 'upsert' } = req.body;
  if (!symbol) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'symbol is required' });
    }

    const quantity = Number(amount || 0);
    const tradePrice = Number(price || 0);
    if (!quantity || quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'amount must be greater than zero' });
    }

    if (!tradePrice || tradePrice <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'price is required' });
    }

    const userResult = await client.query(
      'SELECT id, username, email, role, virtual_balance FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    const currentBalance = Number(user.virtual_balance) || 10000;
    const tradeValue = Number((quantity * tradePrice).toFixed(2));
    const balanceDelta = action === 'sell' ? tradeValue : -tradeValue;
    const nextBalance = Number((currentBalance + balanceDelta).toFixed(2));

    if (action !== 'sell' && tradeValue > currentBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient virtual balance' });
    }

    let holdings = Array.isArray(current.holdings) ? [...current.holdings] : [];
    const index = holdings.findIndex((h) => h.symbol === symbol);

    if (action === 'remove') {
      holdings = holdings.filter((h) => h.symbol !== symbol);
    } else if (index === -1) {
      holdings.push({ symbol, amount: quantity, currentPrice: tradePrice });
    } else if (action === 'sell') {
      const nextAmount = Number(holdings[index].amount || 0) - quantity;
      if (nextAmount <= 0) {
        holdings.splice(index, 1);
      } else {
        holdings[index] = { ...holdings[index], amount: Number(nextAmount.toFixed(8)), currentPrice: tradePrice };
      }
    } else {
      const nextAmount = Number(holdings[index].amount || 0) + quantity;
      holdings[index] = { ...holdings[index], amount: Number(nextAmount.toFixed(8)), currentPrice: tradePrice };
    }

    const holdingsJson = JSON.stringify(holdings);
    const updatedPortfolioResult = await client.query(
      `UPDATE portfolios
       SET holdings = $1::jsonb
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [holdingsJson, portfolioId, req.user.id]
    );

    const updatedUserResult = await client.query(
      `UPDATE users
       SET virtual_balance = $1
       WHERE id = $2
       RETURNING id, username, email, role, virtual_balance`,
      [nextBalance, req.user.id]
    );

    await client.query('COMMIT');

    const updated = updatedPortfolioResult.rows[0];
    const updatedUser = updatedUserResult.rows[0];

    sendUserEmailNotification(user, {
      subject: `Trade update: ${symbol}`,
      title: 'Portfolio updated',
      message: `Your ${action === 'remove' ? 'position was removed' : 'portfolio holding was updated'} for ${symbol}.`,
      details: [
        `Action: ${action}`,
        `Quantity: ${quantity}`,
        `Price: $${tradePrice.toFixed(2)}`,
        `Portfolio: ${updated?.name || 'Default Portfolio'}`,
      ],
    }).catch((error) => {
      console.error('portfolioController: failed to send portfolio notification', error?.message || error);
    });

    return res.json({ ...updated, user: updatedUser });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('portfolioController: rollback failed', rollbackError?.message || rollbackError);
    }
    return res.status(500).json({ message: error?.message || 'Could not update portfolio holding' });
  } finally {
    client.release();
  }
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
