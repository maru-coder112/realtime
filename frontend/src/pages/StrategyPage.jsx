import { useMemo } from 'react';
import { motion } from 'framer-motion';
import PremiumShell from '../components/PremiumShell';
import StrategyBuilderPanel from '../components/strategy/StrategyBuilderPanel';
import StrategyLibraryPanel from '../components/strategy/StrategyLibraryPanel';
import StrategyAnalyticsPanel from '../components/strategy/StrategyAnalyticsPanel';
import useStrategyWorkspace from '../hooks/useStrategyWorkspace';
import api from '../services/api';
import { useNotifications } from '../context/NotificationContext';

function HeaderMetric({ label, value, tone = 'neutral' }) {
  return (
    <div className="strategy-header-metric">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

export default function StrategyPage() {
  const { notify } = useNotifications();
  const {
    strategies,
    loading,
    saving,
    running,
    progress,
    error,
    draft,
    setDraft,
    activeStrategy,
    compareBacktest,
    compareStrategyId,
    setCompareStrategyId,
    backtest,
    loadStrategy,
    createNewStrategy,
    saveStrategy,
    deleteStrategy,
    runBacktest,
  } = useStrategyWorkspace();

  const headerTone = useMemo(() => {
    if (!backtest?.metrics) return 'neutral';
    return Number(backtest.metrics.totalReturn || 0) >= 0 ? 'good' : 'bad';
  }, [backtest]);

  const handleRun = async () => {
    try {
      await runBacktest();
      notify({ title: 'Backtest completed', message: 'Results are ready for review.', variant: 'success', kind: 'report' });
    } catch (runError) {
      notify({ title: 'Backtest failed', message: runError.response?.data?.message || 'Unable to run the backtest.', variant: 'error', kind: 'report' });
    }
  };

  const handleSave = async () => {
    try {
      await saveStrategy();
      notify({ title: 'Strategy saved', message: 'Strategy stored successfully.', variant: 'success', kind: 'report' });
    } catch (saveError) {
      notify({ title: 'Save failed', message: saveError.response?.data?.message || 'Unable to save strategy.', variant: 'error', kind: 'report' });
    }
  };

  const handleDelete = async (strategyId) => {
    try {
      await deleteStrategy(strategyId);
      notify({ title: 'Strategy deleted', message: 'Strategy removed from the library.', variant: 'success', kind: 'report' });
    } catch (deleteError) {
      notify({ title: 'Delete failed', message: deleteError.response?.data?.message || 'Unable to delete strategy.', variant: 'error', kind: 'report' });
    }
  };

  const handleDownloadCsv = async () => {
    if (!backtest?.id) {
      notify({ title: 'No backtest yet', message: 'Run a backtest before exporting results.', variant: 'warning', kind: 'report' });
      return;
    }

    try {
      const response = await api.get(`/api/backtests/${backtest.id}/report`, {
        params: { format: 'csv' },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backtest-${backtest.id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notify({ title: 'CSV exported', message: 'Backtest CSV report downloaded.', variant: 'success', kind: 'report' });
    } catch (downloadError) {
      notify({ title: 'Export failed', message: downloadError.response?.data?.message || 'Unable to download CSV report.', variant: 'error', kind: 'report' });
    }
  };

  const handleDownloadPdf = () => {
    if (!backtest?.metrics) {
      notify({ title: 'No backtest yet', message: 'Run a backtest before exporting a report.', variant: 'warning', kind: 'report' });
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!reportWindow) {
      notify({ title: 'Popup blocked', message: 'Allow popups to generate the PDF report.', variant: 'warning', kind: 'report' });
      return;
    }

    const metrics = backtest.metrics;
    const rows = backtest.tradeRows.slice(0, 10).map((row) => `
      <tr><td>${row.tradeId}</td><td>${row.asset}</td><td>$${Number(row.entryPrice || 0).toFixed(2)}</td><td>$${Number(row.exitPrice || 0).toFixed(2)}</td><td>${row.profitLoss >= 0 ? '+' : '-'}$${Math.abs(Number(row.profitLoss || 0)).toFixed(2)}</td><td>${row.date}</td></tr>
    `).join('');

    reportWindow.document.write(`<!doctype html><html><head><title>Backtest Report</title><style>
      body{font-family:Inter,Segoe UI,sans-serif;background:#0b1120;color:#e5eefc;padding:28px;}
      .card{background:rgba(17,24,39,.92);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;} th,td{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;}
      .muted{color:#94a3b8}.good{color:#0ecb81}.bad{color:#f6465d}
    </style></head><body>
      <div class="card"><h1>Backtest Report</h1><p class="muted">${draft.name} • ${draft.assetSymbol}</p></div>
      <div class="card"><h2>Performance</h2><p>Total Return: <strong class="${Number(metrics.totalReturn || 0) >= 0 ? 'good' : 'bad'}">${Number(metrics.totalReturn || 0).toFixed(2)}%</strong></p><p>Win Rate: ${Number(metrics.winRate || 0).toFixed(2)}%</p><p>Sharpe Ratio: ${metrics.sharpeRatio != null ? Number(metrics.sharpeRatio).toFixed(2) : 'N/A'}</p><p>Max Drawdown: ${Number(metrics.maxDrawdown || 0).toFixed(2)}%</p></div>
      <div class="card"><h2>Trades</h2><table><thead><tr><th>ID</th><th>Asset</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Date</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No trades</td></tr>'}</tbody></table></div>
      <script>window.print();</script>
    </body></html>`);
    reportWindow.document.close();
    notify({ title: 'PDF report opened', message: 'Use the browser print dialog to save as PDF.', variant: 'success', kind: 'report' });
  };

  const handleShare = async () => {
    const payload = {
      strategy: draft.name,
      asset: draft.assetSymbol,
      timeframe: draft.timeframe,
      returnPct: backtest?.metrics?.totalReturn,
      winRate: backtest?.metrics?.winRate,
    };

    const text = `Strategy: ${payload.strategy}\nAsset: ${payload.asset}\nTimeframe: ${payload.timeframe}\nReturn: ${payload.returnPct ?? 'N/A'}%\nWin Rate: ${payload.winRate ?? 'N/A'}%`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Strategy Backtest Summary', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        notify({ title: 'Copied', message: 'Strategy summary copied to clipboard.', variant: 'success', kind: 'report' });
      }
    } catch (shareError) {
      notify({ title: 'Share cancelled', message: 'Strategy sharing was not completed.', variant: 'warning', kind: 'report' });
    }
  };

  const handleCompareStrategies = () => {
    if (!compareBacktest?.metrics || !backtest?.metrics) {
      notify({ title: 'Comparison unavailable', message: 'Run a backtest and select a saved comparison strategy first.', variant: 'warning', kind: 'report' });
      return;
    }

    const currentReturn = Number(backtest.metrics.totalReturn || 0);
    const compareReturn = Number(compareBacktest.metrics.totalReturn || 0);
    const currentWinRate = Number(backtest.metrics.winRate || 0);
    const compareWinRate = Number(compareBacktest.metrics.winRate || 0);
    const diffReturn = currentReturn - compareReturn;
    const diffWinRate = currentWinRate - compareWinRate;

    notify({
      title: 'Strategy comparison ready',
      message: `Return diff ${diffReturn >= 0 ? '+' : ''}${diffReturn.toFixed(2)}% | Win rate diff ${diffWinRate >= 0 ? '+' : ''}${diffWinRate.toFixed(2)}%`,
      variant: 'info',
      kind: 'report',
    });
  };

  return (
    <PremiumShell
      title="Strategy Builder & Backtesting"
      subtitle="Design institutional trading logic, run historical simulations, and compare performance in one workspace."
    >
      <div className="strategy-dashboard">
        <motion.section className="card strategy-hero-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <div className="strategy-hero-top">
            <div>
              <p className="kicker">Backtest Terminal</p>
              <h1>Strategy Builder & Backtesting</h1>
              <p className="muted">Create, manage, and evaluate trading strategies with professional analytics and risk controls.</p>
            </div>
          </div>

          <div className="strategy-hero-metrics">
            <HeaderMetric label="Active strategies" value={String(strategies.length)} tone="neutral" />
            <HeaderMetric label="Current strategy" value={activeStrategy?.name || draft.name} tone="neutral" />
            <HeaderMetric label="Latest return" value={backtest?.metrics ? `${Number(backtest.metrics.totalReturn || 0).toFixed(2)}%` : '—'} tone={headerTone} />
            <HeaderMetric label="Backtest status" value={running ? 'Running' : loading ? 'Loading' : 'Ready'} tone="neutral" />
          </div>

          {running && (
            <div className="strategy-hero-progress">
              <div className="strategy-progress-track">
                <motion.div className="strategy-progress-fill" animate={{ width: `${progress || 0}%` }} transition={{ duration: 0.18 }} />
              </div>
              <p className="muted">Generating simulated results and updating analytics.</p>
            </div>
          )}
          {error && <p className="strategy-error-banner">{error}</p>}
        </motion.section>

        <div className="strategy-dashboard-grid">
          <StrategyBuilderPanel
            draft={draft}
            setDraft={setDraft}
            onCreateNew={createNewStrategy}
            onSave={handleSave}
            onRun={handleRun}
            saving={saving}
            running={running}
            progress={progress}
            error={error}
            selectedStrategyId={activeStrategy?.id || draft.id}
          />

          <StrategyAnalyticsPanel
            backtest={backtest}
            compareBacktest={compareBacktest}
            running={running}
            progress={progress}
            onRun={handleRun}
            onSave={handleSave}
            onDownloadPdf={handleDownloadPdf}
            onDownloadCsv={handleDownloadCsv}
            onShare={handleShare}
            onCompare={handleCompareStrategies}
          />

          <StrategyLibraryPanel
            strategies={strategies}
            activeStrategy={activeStrategy}
            compareStrategyId={compareStrategyId}
            setCompareStrategyId={setCompareStrategyId}
            onLoad={loadStrategy}
            onDelete={handleDelete}
            loading={loading}
          />
        </div>
      </div>
    </PremiumShell>
  );
}