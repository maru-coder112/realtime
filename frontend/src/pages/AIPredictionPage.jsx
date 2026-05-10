import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import AIPredictionChart from '../components/ai-prediction/AIPredictionChart';
import useAIPredictionDashboard from '../hooks/useAIPredictionDashboard';
import { MARKET_SYMBOLS } from '../constants/markets';
import { useNotifications } from '../context/NotificationContext';

function formatDateTime(value) {
  if (!value) return 'Waiting for update';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function infoRow(label, value) {
  return (
    <div className="ai-info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <motion.div className="ai-metric-card card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <p className="ai-metric-label">{label}</p>
      <h4>{value}</h4>
      <p className="muted">{detail}</p>
    </motion.div>
  );
}

export default function AIPredictionPage() {
  const { notify } = useNotifications();
  const {
    symbol,
    setSymbol,
    timeframe,
    setTimeframe,
    indicatorState,
    setIndicatorState,
    loading,
    generating,
    error,
    lastUpdated,
    refresh,
    chartPayload,
    prediction,
    modelInfo,
    performance,
    availableSymbols,
  } = useAIPredictionDashboard();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredSymbols = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableSymbols;
    return availableSymbols.filter((item) => (
      item.value.toLowerCase().includes(query) || item.label.toLowerCase().includes(query)
    ));
  }, [availableSymbols, search]);

  const selectedAsset = MARKET_SYMBOLS.find((item) => item.value === symbol) || availableSymbols[0];
  const trendTone = prediction?.trend === 'Bullish' ? 'good' : prediction?.trend === 'Bearish' ? 'bad' : 'neutral';
  const confidencePct = Number((Number(prediction?.confidence || 0) * 100).toFixed(1));
  const projectedGap = chartPayload.candles.length
    ? ((prediction?.projectedValue || chartPayload.candles[chartPayload.candles.length - 1].close) - chartPayload.candles[chartPayload.candles.length - 1].close)
    : 0;
  const projectedGapPct = chartPayload.candles.length && chartPayload.candles[chartPayload.candles.length - 1].close
    ? (projectedGap / chartPayload.candles[chartPayload.candles.length - 1].close) * 100
    : 0;

  const toggleIndicator = (key) => {
    setIndicatorState((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleExportReport = () => {
    const reportWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!reportWindow) {
      notify({ title: 'Export blocked', message: 'Allow popups to export the report.', variant: 'warning', kind: 'push' });
      return;
    }

    const reportHtml = `<!doctype html><html><head><title>AI Market Prediction Report</title><style>
      body{font-family:Inter,Segoe UI,sans-serif;background:#0b1120;color:#e5eefc;padding:28px;}
      .card{background:rgba(17,24,39,.92);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:16px;}
      h1,h2,h3,p{margin:0 0 10px;}
      .muted{color:#94a3b8;}
      .row{display:flex;gap:12px;flex-wrap:wrap;}
      .pill{display:inline-block;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;margin-right:8px;}
      .good{color:#0ecb81}.bad{color:#f6465d}.neutral{color:#6ea8fe}
      table{width:100%;border-collapse:collapse;} td{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);}
    </style></head><body>
      <div class="card"><h1>AI Market Prediction</h1><p class="muted">Educational trading insight snapshot</p></div>
      <div class="card"><h2>${selectedAsset?.label || symbol}</h2><div class="row"><span class="pill ${trendTone}">${prediction?.trend || 'Neutral'}</span><span class="pill">Confidence ${confidencePct}%</span><span class="pill">Risk ${prediction?.riskLevel || 'Medium'}</span></div></div>
      <div class="card"><h3>Summary</h3><p>${(prediction?.explanation || '').replace(/</g, '&lt;')}</p></div>
      <div class="card"><h3>Model</h3><table><tr><td>Model Type</td><td>${modelInfo.type}</td></tr><tr><td>Data Source</td><td>${modelInfo.dataSource}</td></tr><tr><td>Backtest Accuracy</td><td>${modelInfo.backtestAccuracy}</td></tr><tr><td>Version</td><td>${modelInfo.version}</td></tr></table></div>
      <script>window.print();</script>
    </body></html>`;

    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    notify({ title: 'Report opened', message: 'Use the browser print dialog to save as PDF.', variant: 'success', kind: 'push' });
  };

  const handleSaveToStrategy = () => {
    const snapshot = {
      symbol,
      timeframe,
      trend: prediction?.trend,
      confidence: prediction?.confidence,
      savedAt: new Date().toISOString(),
    };
    const saved = JSON.parse(localStorage.getItem('aiSavedStrategies') || '[]');
    saved.unshift(snapshot);
    localStorage.setItem('aiSavedStrategies', JSON.stringify(saved.slice(0, 12)));
    notify({ title: 'Saved to strategy', message: 'Prediction snapshot saved locally.', variant: 'success', kind: 'push' });
  };

  const handleAddToWatchlist = () => {
    const watchlist = JSON.parse(localStorage.getItem('aiWatchlist') || '[]');
    if (!watchlist.includes(symbol)) {
      watchlist.unshift(symbol);
      localStorage.setItem('aiWatchlist', JSON.stringify(watchlist.slice(0, 20)));
    }
    notify({ title: 'Watchlist updated', message: `${symbol} added to your watchlist.`, variant: 'success', kind: 'push' });
  };

  const handleCompareActualData = async () => {
    await refresh();
    notify({
      title: 'Comparison refreshed',
      message: 'Updated the latest market data against the current prediction.',
      variant: 'info',
      kind: 'push',
    });
  };

  return (
    <PremiumShell
      title="AI Market Prediction"
      subtitle="AI-powered analysis for educational trading insights"
    >
      <div className="ai-page-layout full-width">
        <motion.section
          className="card ai-controls-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="ai-controls-header">
            <div>
              <p className="kicker">Prediction Desk</p>
              <h2>Controls</h2>
            </div>
            <div className="ai-control-status">
              <span className={`chip ${trendTone}`}>{prediction?.trend || 'Neutral'}</span>
              <span className="chip">{generating ? 'Generating...' : loading ? 'Syncing data...' : 'Ready'}</span>
              <span className="chip">Updated {formatDateTime(lastUpdated)}</span>
            </div>
          </div>

          <div className="ai-controls-grid">
            <label className="ai-control-group">
              <span>Search asset</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbols or markets"
              />
            </label>

            <label className="ai-control-group">
              <span>Asset selector</span>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                {filteredSymbols.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="ai-control-group">
              <span>Timeframe</span>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                <option value="15m">15m</option>
                <option value="1h">1H</option>
                <option value="4h">4H</option>
                <option value="1d">1D</option>
              </select>
            </label>

            <label className="ai-control-group">
              <span>Date range start</span>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((current) => ({ ...current, start: e.target.value }))}
              />
            </label>

            <label className="ai-control-group">
              <span>Date range end</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((current) => ({ ...current, end: e.target.value }))}
              />
            </label>

            <motion.button
              className="ai-generate-btn"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={refresh}
              disabled={generating}
            >
              {generating ? 'Generating Prediction...' : 'Generate Prediction'}
            </motion.button>
          </div>

          <div className="ai-controls-meta">
            <div className="chip">Selected: {selectedAsset?.label || symbol}</div>
            <div className="chip">Requested range: {dateRange.start || 'Any'} to {dateRange.end || 'Any'}</div>
            <div className="chip">Source: live market history + AI forecast API</div>
          </div>
        </motion.section>

        <motion.section
          className="card ai-indicators-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.03 }}
        >
          <div className="ai-section-heading">
            <div>
              <p className="kicker">Technical Indicators</p>
              <h3>Optional overlays on chart</h3>
            </div>
            <p className="muted">Toggle indicator layers without leaving the chart view.</p>
          </div>
          <div className="ai-toggle-row">
            {[
              ['movingAverage', 'Moving Average'],
              ['rsi', 'RSI'],
              ['macd', 'MACD'],
              ['volume', 'Volume'],
              ['atr', 'ATR'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`ai-toggle-pill ${indicatorState[key] ? 'active' : ''}`}
                onClick={() => toggleIndicator(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.section>

        <div className="ai-main-grid">
          <AIPredictionChart
            chartPayload={chartPayload}
            prediction={prediction}
            indicatorState={indicatorState}
            loading={loading && !chartPayload.candles.length}
          />

          <motion.aside
            className="card ai-summary-card"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className="ai-summary-top">
              <div>
                <p className="kicker">Prediction Summary</p>
                <h3>{selectedAsset?.label || symbol}</h3>
              </div>
              <span className={`trend-badge ${trendTone}`}>{prediction?.trend || 'Neutral'}</span>
            </div>

            {loading && !prediction ? (
              <div className="ai-summary-skeleton">
                <div className="skeleton-card" />
                <div className="skeleton-card" />
                <div className="skeleton-card" />
              </div>
            ) : (
              <>
                <div className="ai-confidence-meter">
                  <div className="ai-confidence-header">
                    <span>Confidence Score</span>
                    <strong>{confidencePct}%</strong>
                  </div>
                  <div className="ai-confidence-track">
                    <motion.div
                      className="ai-confidence-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${confidencePct}%` }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <div className="ai-summary-copy">
                  <p className="muted">Expected Price Direction</p>
                  <h4>{prediction?.expectedDirection || 'Sideways'}</h4>
                  <p className="ai-summary-text">{prediction?.explanation || 'Awaiting AI forecast response.'}</p>
                </div>

                <div className="ai-summary-list">
                  {infoRow('Predicted Trend', prediction?.trend || 'Neutral')}
                  {infoRow('Risk Level', prediction?.riskLevel || 'Medium')}
                  {infoRow('Last Updated', formatDateTime(lastUpdated))}
                  {infoRow('Projected Move', `${projectedGap >= 0 ? '+' : ''}${projectedGap.toFixed(2)} (${projectedGapPct >= 0 ? '+' : ''}${projectedGapPct.toFixed(2)}%)`)}
                </div>

                {error && <p className="ai-inline-error">{error}</p>}
              </>
            )}
          </motion.aside>
        </div>

        <div className="ai-bottom-grid">
          <motion.section className="card ai-model-card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
            <div className="ai-section-heading">
              <div>
                <p className="kicker">Model Information</p>
                <h3>AI model details</h3>
              </div>
            </div>
            <div className="ai-info-list">
              {infoRow('AI Model Type', modelInfo.type)}
              {infoRow('Data Source', modelInfo.dataSource)}
              {infoRow('Training Period', modelInfo.trainingPeriod)}
              {infoRow('Backtest Accuracy', modelInfo.backtestAccuracy)}
              {infoRow('Version', modelInfo.version)}
            </div>
            <div className="ai-metric-inline-grid">
              {modelInfo.metrics.map((metric) => (
                <div key={metric.label} className="ai-inline-metric">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section className="card ai-performance-card" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
            <div className="ai-section-heading">
              <div>
                <p className="kicker">Performance Metrics</p>
                <h3>Historical quality checks</h3>
              </div>
            </div>
            <div className="ai-metrics-grid">
              <MetricCard label="Accuracy" value={`${performance.accuracy.toFixed(1)}%`} detail="Model direction hit rate on recent windows" />
              <MetricCard label="Error Rate" value={`${performance.errorRate.toFixed(1)}%`} detail="Complement of the current accuracy estimate" />
              <MetricCard label="Backtesting Results" value={`${performance.backtestResult.toFixed(2)}%`} detail="Simulated return from the latest signal set" />
              <MetricCard label="Historical Comparison" value={performance.historicalComparison} detail="Latest momentum relative to the prior baseline" />
            </div>
          </motion.section>
        </div>

        <motion.section className="card ai-risk-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="ai-section-heading">
            <div>
              <p className="kicker">Risk Warning</p>
              <h3>Educational use only</h3>
            </div>
          </div>
          <div className="ai-risk-text">
            <p>This dashboard is for educational trading insights only and does not constitute financial advice.</p>
            <p>Predictions are probabilistic and can change as new market data arrives. Always validate the signal against your own research.</p>
          </div>
        </motion.section>

        <motion.section className="card ai-actions-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
          <div className="ai-section-heading">
            <div>
              <p className="kicker">Actions</p>
              <h3>Save and compare</h3>
            </div>
          </div>
          <div className="ai-actions-row">
            <motion.button className="ai-action-btn primary" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleSaveToStrategy}>Save to Strategy</motion.button>
            <motion.button className="ai-action-btn" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleAddToWatchlist}>Add to Watchlist</motion.button>
            <motion.button className="ai-action-btn" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleExportReport}>Export Report (PDF)</motion.button>
            <motion.button className="ai-action-btn" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={handleCompareActualData}>Compare with Actual Data</motion.button>
          </div>
        </motion.section>
      </div>
    </PremiumShell>
  );
}