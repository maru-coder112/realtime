import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

function MetricCard({ label, value, tone = 'neutral', detail }) {
  return (
    <motion.div className="strategy-metric-card card" whileHover={{ y: -3 }} transition={{ duration: 0.16 }}>
      <p className="strategy-metric-label">{label}</p>
      <h4 className={tone}>{value}</h4>
      <p className="muted">{detail}</p>
    </motion.div>
  );
}

function clampNumber(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, value));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function buildTradeRows(tradeRows, sortKey, sortDir, page, pageSize) {
  const sorted = [...tradeRows].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    const comparison = typeof aValue === 'number' && typeof bValue === 'number'
      ? aValue - bValue
      : String(aValue).localeCompare(String(bValue));
    return sortDir === 'asc' ? comparison : -comparison;
  });
  const start = (page - 1) * pageSize;
  return sorted.slice(start, start + pageSize);
}

export default function StrategyAnalyticsPanel({
  backtest,
  compareBacktest,
  running,
  progress,
  onRun,
  onSave,
  onDownloadPdf,
  onDownloadCsv,
  onShare,
  onCompare,
}) {
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const metrics = backtest?.metrics || null;
  const tradeRows = backtest?.tradeRows || [];
  const pagedRows = buildTradeRows(tradeRows, sortKey, sortDir, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(tradeRows.length / pageSize));

  const equityData = useMemo(() => ({
    labels: metrics?.equityCurve?.map((point) => point.step) || [],
    datasets: [{
      label: 'Equity',
      data: metrics?.equityCurve?.map((point) => point.equity) || [],
      borderColor: '#0ecb81',
      backgroundColor: 'rgba(14, 203, 129, 0.18)',
      fill: true,
      pointRadius: 0,
      tension: 0.22,
    }],
  }), [metrics]);

  const drawdownData = useMemo(() => ({
    labels: backtest?.risk?.drawdownSeries?.map((point) => point.step) || [],
    datasets: [{
      label: 'Drawdown %',
      data: backtest?.risk?.drawdownSeries?.map((point) => point.drawdown) || [],
      borderColor: '#f6465d',
      backgroundColor: 'rgba(246, 70, 93, 0.16)',
      fill: true,
      pointRadius: 0,
      tension: 0.25,
    }],
  }), [backtest]);

  const equityOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(148, 163, 184, 0.08)' } },
      y: { grid: { color: 'rgba(148, 163, 184, 0.08)' } },
    },
  }), []);

  const riskScore = backtest?.risk?.riskScore || 0;
  const consistency = backtest?.risk?.consistency || 0;
  const volatility = backtest?.risk?.volatility || 0;
  const profitLoss = metrics ? (Number(metrics.finalEquity || 0) - Number(metrics.initialCapital || 0)) : 0;
  const profitTone = profitLoss >= 0 ? 'good' : 'bad';
  const winRateTone = Number(metrics?.winRate || 0) >= 50 ? 'good' : 'bad';

  return (
    <motion.section
      className="strategy-analytics-panel"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="strategy-results-header">
        <div>
          <p className="kicker">Backtest Execution</p>
          <h2>Results dashboard</h2>
          <p className="muted">Institutional analytics, trade quality metrics, and export actions.</p>
        </div>
        <div className="strategy-results-actions">
          <button type="button" className="nav-btn active" onClick={onRun} disabled={running}>
            {running ? 'Running...' : 'Run Backtest'}
          </button>
          <button type="button" className="nav-btn" onClick={onSave}>Save Strategy</button>
          <button type="button" className="nav-btn" onClick={onDownloadCsv} disabled={!backtest?.id}>Export Results (CSV)</button>
          <button type="button" className="nav-btn" onClick={onShare} disabled={!backtest?.id}>Share Strategy</button>
        </div>
      </div>

      {running && (
        <div className="strategy-backtest-banner">
          <div className="strategy-progress-track">
            <motion.div className="strategy-progress-fill" animate={{ width: `${clampNumber(progress, 5, 100)}%` }} transition={{ duration: 0.18 }} />
          </div>
          <p className="muted">Backtest engine calculating simulated fills, equity growth, and risk metrics.</p>
        </div>
      )}

      <div className="strategy-metrics-grid">
        <MetricCard label="Total Profit / Loss" value={`${profitLoss >= 0 ? '+' : '-'}$${formatCurrency(Math.abs(profitLoss))}`} tone={profitTone} detail="Net profit after fees and exits." />
        <MetricCard label="Net Return %" value={`${Number(metrics?.totalReturn || 0).toFixed(2)}%`} tone={profitTone} detail="Relative return from initial capital." />
        <MetricCard label="Win Rate" value={`${Number(metrics?.winRate || 0).toFixed(2)}%`} tone={winRateTone} detail="Closed trades that ended positive." />
        <MetricCard label="Total Trades" value={`${Number(metrics?.totalTrades || 0)}`} detail="Completed buy/sell cycles." />
        <MetricCard label="Sharpe Ratio" value={metrics?.sharpeRatio != null ? Number(metrics.sharpeRatio).toFixed(2) : 'N/A'} detail="Risk-adjusted return estimate." />
        <MetricCard label="Max Drawdown" value={`${Number(metrics?.maxDrawdown || 0).toFixed(2)}%`} tone="bad" detail="Largest peak-to-trough decline." />
        <MetricCard label="Risk-Reward Ratio" value={metrics?.profitFactor != null ? Number(metrics.profitFactor).toFixed(2) : 'N/A'} detail="Profit factor and reward balance." />
      </div>

      <div className="strategy-chart-grid">
        <motion.div className="card strategy-chart-card" whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
          <div className="strategy-card-heading">
            <div>
              <p className="kicker">Equity Curve</p>
              <h3>Portfolio growth</h3>
            </div>
          </div>
          <div className="strategy-chart-wrap">
            {metrics?.equityCurve?.length ? <Line data={equityData} options={equityOptions} /> : <div className="strategy-empty-chart">Run a backtest to render the equity curve.</div>}
          </div>
        </motion.div>

        <motion.div className="card strategy-chart-card" whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
          <div className="strategy-card-heading">
            <div>
              <p className="kicker">Risk Analysis</p>
              <h3>Drawdown profile</h3>
            </div>
          </div>
          <div className="strategy-chart-wrap">
            {backtest?.risk?.drawdownSeries?.length ? <Bar data={drawdownData} options={equityOptions} /> : <div className="strategy-empty-chart">Run a backtest to review drawdown behavior.</div>}
          </div>
          <div className="strategy-risk-grid">
            <div className="strategy-risk-tile">
              <span>Risk score</span>
              <strong>{riskScore.toFixed(1)}/100</strong>
            </div>
            <div className="strategy-risk-tile">
              <span>Volatility</span>
              <strong>{volatility.toFixed(1)}</strong>
            </div>
            <div className="strategy-risk-tile">
              <span>Consistency</span>
              <strong>{consistency.toFixed(1)}%</strong>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div className="card strategy-table-card" whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
        <div className="strategy-card-heading">
          <div>
            <p className="kicker">Trade History</p>
            <h3>Executed trades</h3>
          </div>
          <div className="strategy-sort-controls">
            <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}>
              <option value="tradeId">Trade ID</option>
              <option value="asset">Asset</option>
              <option value="entryPrice">Entry Price</option>
              <option value="exitPrice">Exit Price</option>
              <option value="profitLoss">Profit/Loss</option>
              <option value="date">Date</option>
              <option value="tradeType">Trade Type</option>
            </select>
            <button type="button" className="nav-btn" onClick={() => setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))}>
              {sortDir === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        </div>

        <div className="strategy-table-wrap">
          <table className="strategy-trade-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Asset</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>Profit/Loss</th>
                <th>Date</th>
                <th>Trade Type</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length ? pagedRows.map((row) => (
                <tr key={row.tradeId}>
                  <td>{row.tradeId}</td>
                  <td>{row.asset}</td>
                  <td>${formatCurrency(row.entryPrice)}</td>
                  <td>${formatCurrency(row.exitPrice)}</td>
                  <td className={row.profitLoss >= 0 ? 'status-good' : 'status-bad'}>{row.profitLoss >= 0 ? '+' : '-'}${formatCurrency(Math.abs(row.profitLoss))}</td>
                  <td>{row.date}</td>
                  <td>{row.tradeType}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="strategy-table-empty">Run a backtest to populate trade history.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="strategy-pagination">
          <button type="button" className="nav-btn" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button type="button" className="nav-btn" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</button>
        </div>
      </motion.div>

      <div className="strategy-bottom-grid">
        <motion.section className="card strategy-report-card" whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
          <div className="strategy-card-heading">
            <div>
              <p className="kicker">Report</p>
              <h3>Export and compare</h3>
            </div>
          </div>
          <div className="strategy-report-actions">
            <button type="button" className="nav-btn" onClick={onDownloadPdf} disabled={!backtest?.id}>Download Backtest Report (PDF)</button>
            <button type="button" className="nav-btn" onClick={onDownloadCsv} disabled={!backtest?.id}>Export Results (CSV)</button>
            <button type="button" className="nav-btn" onClick={onShare} disabled={!backtest?.id}>Share Strategy</button>
            <button type="button" className="nav-btn" onClick={onCompare}>Compare Strategies</button>
          </div>
          {compareBacktest ? (
            <div className="strategy-compare-grid">
              <div className="strategy-compare-card">
                <p className="muted">Current Strategy</p>
                <strong>{backtest?.strategyName || 'Active Strategy'}</strong>
                <span className="muted">Return {Number(metrics?.totalReturn || 0).toFixed(2)}%</span>
              </div>
              <div className="strategy-compare-card">
                <p className="muted">Comparison Strategy</p>
                <strong>{compareBacktest.strategy?.name || 'Selected Strategy'}</strong>
                {compareBacktest.metrics ? (
                  <span className="muted">Return {Number(compareBacktest.metrics.totalReturn || 0).toFixed(2)}% • Win Rate {Number(compareBacktest.metrics.winRate || 0).toFixed(2)}%</span>
                ) : (
                  <span className="muted">Use selected saved strategy for a side-by-side review.</span>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">Load at least two saved strategies to compare their backtest profiles.</p>
          )}
        </motion.section>

        <motion.section className="card strategy-summary-card" whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
          <div className="strategy-card-heading">
            <div>
              <p className="kicker">Execution Summary</p>
              <h3>Latest backtest status</h3>
            </div>
          </div>
          <div className="strategy-summary-stack">
            <div className="strategy-summary-row"><span>Strategy</span><strong>{backtest?.strategyName || 'Waiting for backtest'}</strong></div>
            <div className="strategy-summary-row"><span>Asset</span><strong>{backtest?.symbol || '—'}</strong></div>
            <div className="strategy-summary-row"><span>Trades</span><strong>{Number(metrics?.totalTrades || 0)}</strong></div>
            <div className="strategy-summary-row"><span>Win rate</span><strong>{Number(metrics?.winRate || 0).toFixed(2)}%</strong></div>
          </div>
        </motion.section>
      </div>
    </motion.section>
  );
}