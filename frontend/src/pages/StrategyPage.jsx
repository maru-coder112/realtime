import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import StrategyForm from '../components/StrategyForm';
import BacktestRunner from '../components/BacktestRunner';
import MetricsTable from '../components/MetricsTable';
import TopNav from '../components/TopNav';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function StrategyPage() {
  const [strategy, setStrategy] = useState(null);
  const [running, setRunning] = useState(false);
  const [performance, setPerformance] = useState(null);
  const [latestBacktestId, setLatestBacktestId] = useState(null);
  const [infoText, setInfoText] = useState('');

  const loadPerformance = async (strategyId) => {
    try {
      const { data } = await api.get(`/api/strategies/${strategyId}/performance`);
      setPerformance(data.metrics || null);
      setLatestBacktestId(data.backtestId || null);
    } catch (error) {
      setPerformance(null);
      setLatestBacktestId(null);
    }
  };

  const createStrategy = async (payload) => {
    try {
      const { data } = await api.post('/api/strategies', payload);
      setStrategy(data);
      setInfoText('Strategy saved. You can run backtest now.');
      loadPerformance(data.id);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create strategy');
    }
  };

  const runBacktest = async (payload) => {
    setRunning(true);
    setInfoText('');
    try {
      const { data } = await api.post('/api/strategies/backtest', payload);
      setPerformance(data.metrics || null);
      setLatestBacktestId(data.id);
      setInfoText('Backtest completed successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Backtest failed');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    async function bootstrapStrategy() {
      try {
        const { data } = await api.get('/api/strategies');
        if (Array.isArray(data) && data.length) {
          setStrategy(data[0]);
          loadPerformance(data[0].id);
          setInfoText('Loaded your latest saved strategy.');
        }
      } catch (error) {
        setInfoText('');
      }
    }

    bootstrapStrategy();
  }, []);

  const equityCurve = performance?.equityCurve || [];
  const equityChartData = {
    labels: equityCurve.map((p) => p.step),
    datasets: [
      {
        data: equityCurve.map((p) => p.equity),
        borderColor: '#00c853',
        backgroundColor: 'rgba(0, 200, 83, 0.2)',
        borderWidth: 2.4,
        pointRadius: 0,
        tension: 0.2,
        fill: true,
      },
    ],
  };

  const equityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(20, 59, 35, 0.1)' } },
      y: { grid: { color: 'rgba(20, 59, 35, 0.1)' } },
    },
  };

  const parameterEntries = Object.entries(strategy?.parameters || {});

  return (
    <div className="layout grid-2 strategy-layout">
      <TopNav
        title="Strategy Workspace"
        subtitle="Create, test, and evaluate strategies with one consistent workflow."
      />
      <StrategyForm onCreate={createStrategy} />
      <BacktestRunner strategyId={strategy?.id} onRun={runBacktest} running={running} />
      {strategy && (
        <div className="card full-width strategy-summary">
          <h3>Saved Strategy</h3>
          <p className="muted">{strategy.name} • ID {strategy.id}</p>
          <div className="row gap wrap param-chips">
            {parameterEntries.map(([key, value]) => (
              <span key={key} className="chip">{key}: {value}</span>
            ))}
          </div>
          {running && <p className="muted">Running backtest...</p>}
        </div>
      )}

      <div className="full-width strategy-performance-grid">
        <div className="card">
          <h3>Strategy Performance</h3>
          {!!infoText && <p className="status-good">{infoText}</p>}
          {!performance && <p className="muted">Run a backtest to view live performance metrics here.</p>}
          {!!performance && <MetricsTable metrics={performance} compact />}
          {!!latestBacktestId && (
            <Link className="btn-link" to={`/backtests/${latestBacktestId}`}>
              Open full backtest report #{latestBacktestId}
            </Link>
          )}
        </div>

        <div className="card">
          <h3>Equity Curve</h3>
          {!equityCurve.length && <p className="muted">Run a backtest to render the equity graph.</p>}
          {!!equityCurve.length && (
            <div className="equity-chart-wrap">
              <Line data={equityChartData} options={equityChartOptions} />
            </div>
          )}
        </div>
      </div>

      {!strategy && (
        <div className="card full-width">
          <h3>Quick Start</h3>
          <p className="muted">1) Save strategy 2) run backtest 3) inspect performance above.</p>
        </div>
      )}
    </div>
  );
}
