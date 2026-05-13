import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PremiumShell from '../components/PremiumShell';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PAGE_SIZE = 5;

const SIMULATION_TRANSACTIONS = [
  { id: 1, date: '2026-05-12', type: 'Backtest', asset: 'BTCUSDT', amountImpact: 420.5, profitLoss: 420.5, status: 'Settled' },
  { id: 2, date: '2026-05-11', type: 'Trade Simulation', asset: 'ETHUSDT', amountImpact: -180.0, profitLoss: -180.0, status: 'Recorded' },
  { id: 3, date: '2026-05-10', type: 'Backtest', asset: 'AAPL', amountImpact: 95.25, profitLoss: 95.25, status: 'Settled' },
  { id: 4, date: '2026-05-09', type: 'Trade Simulation', asset: 'TSLA', amountImpact: 240.0, profitLoss: 240.0, status: 'Recorded' },
  { id: 5, date: '2026-05-08', type: 'Backtest', asset: 'NVDA', amountImpact: -62.4, profitLoss: -62.4, status: 'Settled' },
  { id: 6, date: '2026-05-07', type: 'Trade Simulation', asset: 'MSFT', amountImpact: 132.1, profitLoss: 132.1, status: 'Recorded' },
  { id: 7, date: '2026-05-06', type: 'Backtest', asset: 'EURUSD', amountImpact: -40.8, profitLoss: -40.8, status: 'Settled' },
  { id: 8, date: '2026-05-05', type: 'Trade Simulation', asset: 'SOLUSDT', amountImpact: 315.0, profitLoss: 315.0, status: 'Recorded' },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function WalletMetricCard({ label, value, tone = 'neutral', hint }) {
  return (
    <motion.div className="wallet-metric-card" whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <span className="wallet-metric-label">{label}</span>
      <strong className={`wallet-metric-value ${tone}`}>{value}</strong>
      {hint ? <p className="wallet-metric-hint">{hint}</p> : null}
    </motion.div>
  );
}

function WalletTableHeader({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey;
  return (
    <th>
      <button type="button" className={`wallet-sort-btn ${active ? 'active' : ''}`} onClick={() => onSort(sortKey)}>
        <span>{label}</span>
        <span className="wallet-sort-arrow">{active ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </th>
  );
}

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState({ holdings: [] });
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [loadingBacktest, setLoadingBacktest] = useState(true);
  const [latestBacktestId, setLatestBacktestId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;

    async function loadPortfolio() {
      try {
        const { data } = await api.get('/api/portfolio/default');
        if (mounted) {
          setPortfolio(data || { holdings: [] });
        }
      } catch {
        if (mounted) {
          setPortfolio({ holdings: [] });
        }
      } finally {
        if (mounted) {
          setLoadingPortfolio(false);
        }
      }
    }

    loadPortfolio();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleGlobalSearch = (event) => {
      const query = String(event?.detail?.query || '');
      setSearchQuery(query);
      setCurrentPage(1);
    };

    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadLatestBacktest() {
      try {
        const { data } = await api.get('/api/strategies');
        const strategies = Array.isArray(data) ? data : [];

        for (const strategy of strategies) {
          try {
            const performance = await api.get(`/api/strategies/${strategy.id}/performance`);
            if (performance?.data?.backtestId) {
              if (mounted) {
                setLatestBacktestId(performance.data.backtestId);
              }
              break;
            }
          } catch {
            // Try the next strategy in the library.
          }
        }
      } catch {
        if (mounted) {
          setLatestBacktestId(null);
        }
      } finally {
        if (mounted) {
          setLoadingBacktest(false);
        }
      }
    }

    loadLatestBacktest();

    return () => {
      mounted = false;
    };
  }, []);

  const virtualBalance = Number(user?.virtualBalance ?? 10000);

  const portfolioValue = useMemo(() => {
    return (portfolio?.holdings || []).reduce((sum, holding) => {
      const amount = Number(holding.amount || 0);
      const currentPrice = Number(holding.currentPrice || 0);
      return sum + amount * currentPrice;
    }, 0);
  }, [portfolio]);

  const totalAccountEquity = virtualBalance + portfolioValue;

  const summary = useMemo(() => {
    const totalProfit = SIMULATION_TRANSACTIONS.filter((row) => row.profitLoss > 0).reduce((sum, row) => sum + row.profitLoss, 0);
    const totalLoss = Math.abs(SIMULATION_TRANSACTIONS.filter((row) => row.profitLoss < 0).reduce((sum, row) => sum + row.profitLoss, 0));
    const netPerformance = totalProfit - totalLoss;
    const totalTrades = SIMULATION_TRANSACTIONS.length;

    return [
      { label: 'Total Profit', value: formatCurrency(totalProfit), tone: 'good', hint: 'Simulation gains only' },
      { label: 'Total Loss', value: formatCurrency(totalLoss), tone: 'bad', hint: 'Absorbed drawdowns' },
      { label: 'Net Performance', value: formatCurrency(netPerformance), tone: netPerformance >= 0 ? 'good' : 'bad', hint: 'Profit minus loss' },
      { label: 'Total Trades', value: String(totalTrades), tone: 'neutral', hint: 'Trade simulation events' },
      { label: 'Current Portfolio Value', value: formatCurrency(portfolioValue), tone: 'neutral', hint: 'Holdings marked to market' },
    ];
  }, [portfolioValue]);

  const sortedTransactions = useMemo(() => {
    const items = [...SIMULATION_TRANSACTIONS];
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    items.sort((left, right) => {
      let leftValue = left[key];
      let rightValue = right[key];

      if (key === 'date') {
        leftValue = new Date(leftValue).getTime();
        rightValue = new Date(rightValue).getTime();
      } else if (key === 'amountImpact' || key === 'profitLoss') {
        leftValue = Number(leftValue);
        rightValue = Number(rightValue);
      } else {
        leftValue = String(leftValue || '').toLowerCase();
        rightValue = String(rightValue || '').toLowerCase();
      }

      if (leftValue < rightValue) return -1 * multiplier;
      if (leftValue > rightValue) return 1 * multiplier;
      return 0;
    });

    return items;
  }, [sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleTransactions = sortedTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const isAdmin = user?.role === 'admin';
  const createdDate = user?.createdAt || user?.created_at;
  const accountCreatedLabel = createdDate ? formatDate(createdDate) : 'Pending backend timestamp';

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  const handleSort = (key) => {
    setCurrentPage(1);
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <PremiumShell>
      <div className="wallet-page">

        <motion.section
          className="wallet-balance-panel card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.04 }}
        >
          <div className="wallet-balance-panel-inner">
            <div>
              <p className="kicker">Virtual Funds</p>
              <h1 className="wallet-balance-title">${virtualBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</h1>
              <p className="wallet-balance-currency">USD</p>
            </div>
            <div className="wallet-balance-copy">
              <p>This balance is used only for simulation and backtesting.</p>
              <span>Institutional virtual capital model</span>
            </div>
          </div>
        </motion.section>

        <section className="wallet-summary-grid" aria-label="Wallet summary metrics">
          {summary.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.08 + index * 0.04 }}
            >
              <WalletMetricCard {...item} />
            </motion.div>
          ))}
        </section>

        <motion.section
          className="wallet-history card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.12 }}
        >
          <div className="wallet-section-head">
            <div>
              <p className="kicker">Transaction History</p>
              <h2>Simulation ledger</h2>
              <p className="muted">Sortable history of virtual backtests and trade simulations.</p>
            </div>
            <div className="wallet-table-meta">
              <span className="wallet-pill">Page {safePage} of {totalPages}</span>
              <span className="wallet-pill">{SIMULATION_TRANSACTIONS.length} entries</span>
            </div>
          </div>

          <div className="wallet-table-wrap">
            <table className="wallet-table">
              <thead>
                <tr>
                  <WalletTableHeader label="Date" sortKey="date" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                  <WalletTableHeader label="Type" sortKey="type" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                  <WalletTableHeader label="Asset" sortKey="asset" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                  <WalletTableHeader label="Amount Impact" sortKey="amountImpact" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                  <WalletTableHeader label="Profit / Loss" sortKey="profitLoss" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                  <WalletTableHeader label="Status" sortKey="status" activeKey={sortConfig.key} direction={sortConfig.direction} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {loadingPortfolio || loadingBacktest ? (
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={`wallet-skeleton-${index}`} className="wallet-row-skeleton">
                      <td colSpan={6}>
                        <div className="wallet-skeleton-line" />
                      </td>
                    </tr>
                  ))
                ) : (
                  visibleTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.date)}</td>
                      <td>{transaction.type}</td>
                      <td>{transaction.asset}</td>
                      <td className={transaction.amountImpact >= 0 ? 'tone-good' : 'tone-bad'}>{formatCurrency(transaction.amountImpact)}</td>
                      <td className={transaction.profitLoss >= 0 ? 'tone-good' : 'tone-bad'}>{formatCurrency(transaction.profitLoss)}</td>
                      <td>
                        <span className={`wallet-status ${transaction.profitLoss >= 0 ? 'positive' : 'negative'}`}>{transaction.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="wallet-pagination">
            <button type="button" className="nav-btn" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage === 1}>
              Previous
            </button>
            <div className="wallet-pagination-copy">Page {safePage} of {totalPages}</div>
            <button type="button" className="nav-btn" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage === totalPages}>
              Next
            </button>
          </div>
        </motion.section>

        <section className="wallet-double-grid">
          <motion.section
            className="wallet-card card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.14 }}
          >
            <div className="wallet-section-head compact">
              <div>
                <p className="kicker">Account Information</p>
                <h2>Virtual account details</h2>
              </div>
            </div>

            <div className="wallet-details-grid">
              <div className="wallet-detail-row">
                <span>Account Type</span>
                <strong>Virtual</strong>
              </div>
              <div className="wallet-detail-row">
                <span>Created Date</span>
                <strong>{accountCreatedLabel}</strong>
              </div>
              <div className="wallet-detail-row">
                <span>User Role</span>
                <strong>{user?.role || 'trader'}</strong>
              </div>
              <div className="wallet-detail-row">
                <span>Security Status</span>
                <strong className="tone-good">Server-authenticated</strong>
              </div>
              <div className="wallet-detail-row">
                <span>System Status</span>
                <strong className="tone-neutral">Simulation online</strong>
              </div>
              <div className="wallet-detail-row">
                <span>Account Equity</span>
                <strong>{formatCurrency(totalAccountEquity)}</strong>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="wallet-card card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.18 }}
          >
            <div className="wallet-section-head compact">
              <div>
                <p className="kicker">Actions</p>
                <h2>Simulation controls</h2>
                <p className="muted">Cash movement is disabled because this wallet is strictly educational.</p>
              </div>
            </div>

            <div className="wallet-action-grid">
              <button type="button" className="wallet-action-btn disabled" disabled title="Deposits are disabled in the simulation wallet.">
                Deposit
              </button>
              <button type="button" className="wallet-action-btn disabled" disabled title="Withdrawals are disabled in the simulation wallet.">
                Withdraw
              </button>
              <button
                type="button"
                className="wallet-action-btn"
                disabled={!isAdmin}
                onClick={() => navigate('/admin')}
                title={isAdmin ? 'Open the admin panel to manage virtual balances.' : 'Admin only'}
              >
                Reset Virtual Balance
              </button>
              <button
                type="button"
                className="wallet-action-btn"
                disabled={!latestBacktestId}
                onClick={() => navigate(`/backtests/${latestBacktestId}`)}
                title={latestBacktestId ? 'Open the latest backtesting report.' : 'Run a backtest first.'}
              >
                View Backtesting Results
              </button>
              <button type="button" className="wallet-action-btn primary" onClick={() => navigate('/strategy')}>
                Go to Strategy Builder
              </button>
            </div>
          </motion.section>
        </section>

        {/* Risk & Disclaimer removed per user request */}
      </div>
    </PremiumShell>
  );
}
