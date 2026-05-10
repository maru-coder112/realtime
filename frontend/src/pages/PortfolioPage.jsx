import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 45230, change: 2.4 },
  { symbol: 'ETH', name: 'Ethereum', price: 2580, change: -1.2 },
  { symbol: 'AAPL', name: 'Apple', price: 185.50, change: 1.8 },
  { symbol: 'TSLA', name: 'Tesla', price: 245.80, change: 3.2 },
  { symbol: 'AMZN', name: 'Amazon', price: 165.20, change: 0.9 },
  { symbol: 'GOOGL', name: 'Google', price: 140.35, change: 2.1 },
];

export default function PortfolioPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [portfolio, setPortfolio] = useState({ holdings: [] });
  const [virtualBalance, setVirtualBalance] = useState(user?.virtualBalance || 10000);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const { data } = await api.get('/api/portfolio/default');
      setPortfolio(data || { holdings: [] });
    } catch {
      setPortfolio({ holdings: [] });
    }
  };

  const executeTrade = async () => {
    if (!selectedAsset || !quantity || Number(quantity) <= 0) {
      notify({
        title: 'Trade validation',
        message: 'Please select an asset and enter a valid quantity.',
        variant: 'warning',
        kind: 'trade',
      });
      return;
    }

    const totalCost = selectedAsset.price * Number(quantity);
    // validate funds for buy
    if (tradeType === 'buy' && totalCost > virtualBalance) {
      notify({
        title: 'Insufficient balance',
        message: 'Insufficient virtual balance.',
        variant: 'warning',
        kind: 'trade',
      });
      return;
    }

    // validate holdings for sell
    if (tradeType === 'sell') {
      const holding = (portfolio?.holdings || []).find((h) => h.symbol === selectedAsset.symbol);
      if (!holding || Number(holding.amount) < Number(quantity)) {
        notify({
          title: 'Insufficient holdings',
          message: 'Insufficient holdings to sell.',
          variant: 'warning',
          kind: 'trade',
        });
        return;
      }
    }

    try {
      const action = tradeType === 'buy' ? 'upsert' : 'sell';
      const { data } = await api.put(`/api/portfolio/${portfolio.id || 'default'}/holding`, {
        symbol: selectedAsset.symbol,
        amount: Number(quantity),
        action,
        price: selectedAsset.price,
      });

      // server returns updated portfolio; fall back to local update if missing
      const newPortfolio = data || { holdings: [] };
      if (!data) {
        // update holdings locally
        const copy = { ...(portfolio || {}), holdings: [...(portfolio.holdings || [])] };
        const idx = copy.holdings.findIndex((h) => h.symbol === selectedAsset.symbol);
        if (action === 'upsert') {
          if (idx >= 0) {
            copy.holdings[idx] = { ...copy.holdings[idx], amount: copy.holdings[idx].amount + Number(quantity), currentPrice: selectedAsset.price };
          } else {
            copy.holdings.push({ symbol: selectedAsset.symbol, amount: Number(quantity), currentPrice: selectedAsset.price });
          }
        } else {
          if (idx >= 0) {
            copy.holdings[idx] = { ...copy.holdings[idx], amount: copy.holdings[idx].amount - Number(quantity) };
            if (copy.holdings[idx].amount <= 0) copy.holdings.splice(idx, 1);
          }
        }
        setPortfolio(copy);
      } else {
        setPortfolio(newPortfolio);
      }

      if (tradeType === 'buy') {
        setVirtualBalance((v) => Number((v - totalCost).toFixed(2)));
      } else {
        setVirtualBalance((v) => Number((v + totalCost).toFixed(2)));
      }

      setOrderHistory([
        {
          id: Date.now(),
          asset: selectedAsset.symbol,
          type: tradeType,
          quantity: Number(quantity),
          price: selectedAsset.price,
          total: totalCost,
          timestamp: new Date().toLocaleString(),
        },
        ...orderHistory,
      ]);

      setShowTradeModal(false);
      setQuantity('');
      notify({
        title: 'Trade completed',
        message: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${selectedAsset.symbol}.`,
        variant: 'success',
        kind: 'trade',
      });
    } catch (error) {
      notify({
        title: 'Trade failed',
        message: error.response?.data?.message || 'Trade failed',
        variant: 'error',
        kind: 'trade',
      });
    }
  };

  const portfolioValue = (portfolio.holdings || []).reduce((sum, h) => sum + ((h.amount || 0) * (h.currentPrice || ASSETS.find(a => a.symbol === h.symbol)?.price || 0)), 0);
  const totalValue = virtualBalance + portfolioValue;

  const quickSelectHolding = (holding) => {
    // find matching asset info to use price
    const assetInfo = ASSETS.find((a) => a.symbol === holding.symbol) || { symbol: holding.symbol, price: holding.currentPrice || 0, name: holding.symbol };
    setSelectedAsset({ ...assetInfo, price: holding.currentPrice || assetInfo.price });
    setTradeType('sell');
    setQuantity(String(holding.amount));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PremiumShell title="Trading" subtitle="Buy and sell assets with virtual money">
      <div className="trading-page">
        {/* Wallet Summary */}
        <motion.section
          className="trading-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="trading-header">
            <div>
              <p className="kicker">Virtual Wallet</p>
              <h2>Trading Balance</h2>
            </div>
          </div>
          <div className="trading-balance-grid">
            <div className="balance-card">
              <p className="balance-label">Cash Balance</p>
              <p className="balance-value">${virtualBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}USD</p>
            </div>
            <div className="balance-card">
              <p className="balance-label">Portfolio Value</p>
              <p className="balance-value">${portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}USD</p>
            </div>
            <div className="balance-card highlight">
              <p className="balance-label">Total Value</p>
              <p className="balance-value">${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}USD</p>
            </div>
          </div>
        </motion.section>

        {/* Current Holdings */}
        <motion.section
          className="trading-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.06 }}
        >
          <div className="trading-header">
            <div>
              <p className="kicker">Holdings</p>
              <h2>Current Positions</h2>
            </div>
          </div>
          <div className="holdings-list">
            {portfolio.holdings && portfolio.holdings.length ? (
              portfolio.holdings.map((h) => (
                <div key={h.symbol} className="holding-item">
                  <div className="holding-left">
                    <p className="holding-symbol">{h.symbol}</p>
                    <p className="holding-amount">{h.amount} units</p>
                  </div>
                  <div className="holding-right">
                    <p className="holding-price">${(h.currentPrice || ASSETS.find(a => a.symbol === h.symbol)?.price || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                    <p className="holding-value">${(((h.amount || 0) * (h.currentPrice || ASSETS.find(a => a.symbol === h.symbol)?.price || 0))).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                    <div className="holding-actions">
                      <button className="quick-sell-btn" onClick={() => quickSelectHolding(h)}>Quick Sell</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No current holdings.</p>
            )}
          </div>
        </motion.section>

        {/* Market Assets */}
        <motion.section
          className="trading-card card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.06 }}
        >
          <div className="trading-header">
            <div>
              <p className="kicker">Market Assets</p>
              <h2>Available for trading</h2>
            </div>
          </div>
          <div className="assets-grid">
            {ASSETS.map((asset) => (
              <motion.button
                key={asset.symbol}
                className={`asset-card ${selectedAsset?.symbol === asset.symbol ? 'active' : ''}`}
                onClick={() => setSelectedAsset(asset)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="asset-header">
                  <div>
                    <p className="asset-symbol">{asset.symbol}</p>
                    <p className="asset-name">{asset.name}</p>
                  </div>
                  <span className={`asset-change ${asset.change >= 0 ? 'positive' : 'negative'}`}>
                    {asset.change >= 0 ? '+' : ''}{asset.change}%
                  </span>
                </div>
                <p className="asset-price">${asset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
              </motion.button>
            ))}
          </div>
        </motion.section>

        {/* Trade Panel */}
        {selectedAsset && (
          <motion.section
            className="trading-card card trade-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.08 }}
          >
            <div className="trading-header">
              <div>
                <p className="kicker">Execute Trade</p>
                <h2>{selectedAsset.name} ({selectedAsset.symbol})</h2>
              </div>
            </div>

            <div className="trade-controls">
              <div className="trade-type-tabs">
                <button
                  className={`trade-tab ${tradeType === 'buy' ? 'active buy' : ''}`}
                  onClick={() => setTradeType('buy')}
                >
                  Buy
                </button>
                <button
                  className={`trade-tab ${tradeType === 'sell' ? 'active sell' : ''}`}
                  onClick={() => setTradeType('sell')}
                >
                  Sell
                </button>
              </div>

              <div className="trade-form">
                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="trade-summary">
                  <div className="summary-row">
                    <span>Price per unit</span>
                    <strong>${selectedAsset.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total cost</span>
                    <strong>${(selectedAsset.price * (Number(quantity) || 0)).toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
                <button className={`trade-btn ${tradeType}`} onClick={executeTrade}>
                  {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.symbol}
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Recent Orders */}
        {orderHistory.length > 0 && (
          <motion.section
            className="trading-card card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.1 }}
          >
            <div className="trading-header">
              <div>
                <p className="kicker">Order History</p>
                <h2>Recent trades</h2>
              </div>
            </div>
            <div className="order-list">
              {orderHistory.slice(0, 10).map((order) => (
                <div key={order.id} className={`order-item order-${order.type}`}>
                  <div className="order-info">
                    <p className="order-asset">{order.asset}</p>
                    <p className="order-meta">{order.timestamp}</p>
                  </div>
                  <div className="order-details">
                    <p className="order-qty">{order.quantity} @ ${order.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                    <p className={`order-total ${order.type === 'buy' ? 'buy' : 'sell'}`}>
                      {order.type === 'buy' ? '-' : '+'}${order.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </PremiumShell>
  );
}
