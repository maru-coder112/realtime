import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 45230, change: 2.4 },
  { symbol: 'ETH', name: 'Ethereum', price: 2580, change: -1.2 },
  { symbol: 'AAPL', name: 'Apple', price: 185.5, change: 1.8 },
  { symbol: 'TSLA', name: 'Tesla', price: 245.8, change: 3.2 },
  { symbol: 'AMZN', name: 'Amazon', price: 165.2, change: 0.9 },
  { symbol: 'GOOGL', name: 'Google', price: 140.35, change: 2.1 },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function PortfolioPage() {
  const { user, refreshUser } = useAuth();
  const { notify } = useNotifications();
  const [portfolio, setPortfolio] = useState({ holdings: [] });
  const [virtualBalance, setVirtualBalance] = useState(Number(user?.virtualBalance || 10000));
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [orderHistory, setOrderHistory] = useState([]);
  const [marketQuery, setMarketQuery] = useState('');

  useEffect(() => {
    loadPortfolio();
  }, []);

  useEffect(() => {
    const nextBalance = Number(user?.virtualBalance);
    if (Number.isFinite(nextBalance)) {
      setVirtualBalance(nextBalance);
    }
  }, [user?.virtualBalance]);

  const loadPortfolio = async () => {
    try {
      const { data } = await api.get('/api/portfolio/default');
      setPortfolio(data || { holdings: [] });
    } catch {
      setPortfolio({ holdings: [] });
    }
  };

  const marketAssets = useMemo(() => {
    const query = marketQuery.trim().toLowerCase();
    if (!query) return ASSETS;
    return ASSETS.filter((asset) => asset.symbol.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query));
  }, [marketQuery]);

  const portfolioHoldings = portfolio.holdings || [];
  const portfolioValue = useMemo(() => (
    portfolioHoldings.reduce((sum, holding) => {
      const currentPrice = Number(holding.currentPrice || ASSETS.find((asset) => asset.symbol === holding.symbol)?.price || 0);
      return sum + Number(holding.amount || 0) * currentPrice;
    }, 0)
  ), [portfolioHoldings]);

  const totalValue = virtualBalance + portfolioValue;
  const selectedQuantity = Number(quantity) || 0;
  const selectedHolding = selectedAsset
    ? portfolioHoldings.find((holding) => holding.symbol === selectedAsset.symbol)
    : null;
  const selectedTotal = selectedAsset ? selectedAsset.price * selectedQuantity : 0;
  const availableToSell = Number(selectedHolding?.amount || 0);
  const canExecute = Boolean(selectedAsset) && selectedQuantity > 0;

  const headlineMetrics = [
    { label: 'Cash Balance', value: virtualBalance, tone: 'good' },
    { label: 'Portfolio Value', value: portfolioValue, tone: 'neutral' },
    { label: 'Total Equity', value: totalValue, tone: 'neutral' },
    { label: 'Open Positions', value: portfolioHoldings.length, tone: 'neutral' },
  ];

  const quickSelectHolding = (holding) => {
    const assetInfo = ASSETS.find((asset) => asset.symbol === holding.symbol) || {
      symbol: holding.symbol,
      name: holding.symbol,
      price: holding.currentPrice || 0,
      change: 0,
    };

    setSelectedAsset({ ...assetInfo, price: holding.currentPrice || assetInfo.price });
    setTradeType('sell');
    setQuantity(String(holding.amount || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executeTrade = async () => {
    if (!selectedAsset || !selectedQuantity) {
      notify({
        title: 'Trade validation',
        message: 'Choose an asset and enter a quantity.',
        variant: 'warning',
        kind: 'trade',
      });
      return;
    }

    const totalCost = selectedAsset.price * selectedQuantity;

    if (tradeType === 'buy' && totalCost > virtualBalance) {
      notify({
        title: 'Insufficient balance',
        message: 'Insufficient virtual balance.',
        variant: 'warning',
        kind: 'trade',
      });
      return;
    }

    if (tradeType === 'sell' && (!selectedHolding || Number(selectedHolding.amount) < selectedQuantity)) {
      notify({
        title: 'Insufficient holdings',
        message: 'Insufficient holdings to sell.',
        variant: 'warning',
        kind: 'trade',
      });
      return;
    }

    try {
      const action = tradeType === 'buy' ? 'upsert' : 'sell';
      const { data } = await api.put(`/api/portfolio/${portfolio.id || 'default'}/holding`, {
        symbol: selectedAsset.symbol,
        amount: selectedQuantity,
        action,
        price: selectedAsset.price,
      });

      if (data) {
        setPortfolio(data);
      } else {
        await loadPortfolio();
      }

      const nextBalance = Number(data?.user?.virtualBalance ?? data?.virtual_balance);
      if (Number.isFinite(nextBalance)) {
        setVirtualBalance(nextBalance);
      } else if (tradeType === 'buy') {
        setVirtualBalance((current) => Number((current - totalCost).toFixed(2)));
      } else {
        setVirtualBalance((current) => Number((current + totalCost).toFixed(2)));
      }

      await refreshUser();

      setOrderHistory((current) => [
        {
          id: Date.now(),
          asset: selectedAsset.symbol,
          type: tradeType,
          quantity: selectedQuantity,
          price: selectedAsset.price,
          total: totalCost,
          timestamp: new Date().toLocaleString(),
        },
        ...current,
      ]);

      setQuantity('');
      notify({
        title: 'Trade completed',
        message: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${selectedQuantity} ${selectedAsset.symbol}.`,
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

  return (
    <PremiumShell title="Trading Desk" subtitle="Simulation execution with virtual capital only">
      <div className="trading-page trading-desk">
        <motion.section
          className="trading-hero card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div>
            <p className="kicker">Virtual Wallet</p>
            <h2>Trading desk overview</h2>
            <p className="muted">A focused simulation workspace for buying, selling, and reviewing virtual positions.</p>
          </div>
          <div className="trading-hero-badges">
            <span className="wallet-chip positive">Simulation only</span>
            <span className="wallet-chip muted">No real-money transfers</span>
          </div>
        </motion.section>

        <section className="trading-summary-grid">
          {headlineMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              className="balance-card trading-metric-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 + index * 0.03 }}
            >
              <p className="balance-label">{metric.label}</p>
              <p className={`balance-value ${metric.tone}`}>{formatCurrency(metric.value)}</p>
            </motion.div>
          ))}
        </section>

        <div className="trading-desk-grid">
          <div className="trading-main-column">
            <motion.section
              className="trading-card card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
            >
              <div className="trading-header">
                <div>
                  <p className="kicker">Market Browser</p>
                  <h2>Available assets</h2>
                </div>
                <input
                  className="trading-search"
                  type="search"
                  placeholder="Search symbol or asset"
                  value={marketQuery}
                  onChange={(e) => setMarketQuery(e.target.value)}
                />
              </div>

              <div className="assets-grid compact-grid">
                {marketAssets.map((asset) => (
                  <motion.button
                    key={asset.symbol}
                    type="button"
                    className={`asset-card ${selectedAsset?.symbol === asset.symbol ? 'active' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
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
                    <p className="asset-price">{formatCurrency(asset.price)}</p>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <motion.section
              className="trading-card card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.08 }}
            >
              <div className="trading-header">
                <div>
                  <p className="kicker">Holdings</p>
                  <h2>Open positions</h2>
                </div>
                <span className="wallet-chip">{portfolioHoldings.length} positions</span>
              </div>

              <div className="holdings-list compact-holdings">
                {portfolioHoldings.length ? (
                  portfolioHoldings.map((holding) => {
                    const currentPrice = Number(holding.currentPrice || ASSETS.find((asset) => asset.symbol === holding.symbol)?.price || 0);
                    const holdingValue = Number(holding.amount || 0) * currentPrice;

                    return (
                      <motion.button
                        key={holding.symbol}
                        type="button"
                        className="holding-item holding-selectable"
                        onClick={() => quickSelectHolding(holding)}
                        whileHover={{ y: -1 }}
                      >
                        <div className="holding-left">
                          <p className="holding-symbol">{holding.symbol}</p>
                          <p className="holding-amount">{Number(holding.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })} units</p>
                        </div>
                        <div className="holding-right">
                          <p className="holding-price">{formatCurrency(currentPrice)}</p>
                          <p className="holding-value">{formatCurrency(holdingValue)}</p>
                          <span className="quick-sell-btn">Quick Sell</span>
                        </div>
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="empty-state compact">
                    <p className="muted">No open positions. Select an asset to start a simulation trade.</p>
                  </div>
                )}
              </div>
            </motion.section>

            {orderHistory.length > 0 && (
              <motion.section
                className="trading-card card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.1 }}
              >
                <div className="trading-header">
                  <div>
                    <p className="kicker">Order Activity</p>
                    <h2>Recent trades</h2>
                  </div>
                </div>
                <div className="order-list compact-orders">
                  {orderHistory.slice(0, 6).map((order) => (
                    <div key={order.id} className={`order-item order-${order.type}`}>
                      <div className="order-info">
                        <p className="order-asset">{order.asset}</p>
                        <p className="order-meta">{order.timestamp}</p>
                      </div>
                      <div className="order-details">
                        <p className="order-qty">{order.quantity} @ {formatCurrency(order.price)}</p>
                        <p className={`order-total ${order.type === 'buy' ? 'buy' : 'sell'}`}>
                          {order.type === 'buy' ? '-' : '+'}{formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          <div className="trading-side-column">
            <motion.section
              className="trading-card card trade-panel sticky-ticket"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.06 }}
            >
              <div className="trading-header">
                <div>
                  <p className="kicker">Trade Ticket</p>
                  <h2>{selectedAsset ? `${selectedAsset.name} (${selectedAsset.symbol})` : 'Select an asset'}</h2>
                </div>
              </div>

              {selectedAsset ? (
                <div className="trade-controls">
                  <div className="trade-type-tabs">
                    <button
                      type="button"
                      className={`trade-tab ${tradeType === 'buy' ? 'active buy' : ''}`}
                      onClick={() => setTradeType('buy')}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      className={`trade-tab ${tradeType === 'sell' ? 'active sell' : ''}`}
                      onClick={() => setTradeType('sell')}
                    >
                      Sell
                    </button>
                  </div>

                  <div className="trade-focus-card">
                    <div>
                      <span>Selected price</span>
                      <strong>{formatCurrency(selectedAsset.price)}</strong>
                    </div>
                    <div>
                      <span>{tradeType === 'buy' ? 'Available balance' : 'Available to sell'}</span>
                      <strong>
                        {tradeType === 'buy'
                          ? formatCurrency(virtualBalance)
                          : `${availableToSell.toLocaleString('en-US', { maximumFractionDigits: 4 })} units`}
                      </strong>
                    </div>
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
                        <span>Order type</span>
                        <strong>{tradeType === 'buy' ? 'Buy simulation' : 'Sell simulation'}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Estimated value</span>
                        <strong>{formatCurrency(selectedTotal)}</strong>
                      </div>
                    </div>
                    <button className={`trade-btn ${tradeType}`} type="button" onClick={executeTrade} disabled={!canExecute}>
                      {tradeType === 'buy' ? 'Execute Buy' : 'Execute Sell'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state compact">
                  <p className="muted">Choose an asset from the market browser to open the trade ticket.</p>
                </div>
              )}
            </motion.section>

            <motion.section
              className="trading-card card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.09 }}
            >
              <div className="trading-header">
                <div>
                  <p className="kicker">Platform Notice</p>
                  <h2>Virtual money only</h2>
                </div>
              </div>
              <p className="muted notice-copy">This trading desk is strictly for education and simulation. No deposits, withdrawals, or real-money settlement are supported.</p>
            </motion.section>
          </div>
        </div>
      </div>
    </PremiumShell>
  );
}