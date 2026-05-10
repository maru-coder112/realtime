import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../services/api';
import MetricsTable from '../components/MetricsTable';
import PremiumShell from '../components/PremiumShell';
import { useNotifications } from '../context/NotificationContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function BacktestResultsPage() {
  const { notify } = useNotifications();
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/api/backtests/${id}`);
        setResult(data);
      } catch (error) {
        notify({
          title: 'Unable to load backtest',
          message: error.response?.data?.message || 'Failed to load result',
          variant: 'error',
          kind: 'report',
        });
      }
    }
    load();
  }, [id]);

  const curve = result?.metrics?.equityCurve || [];

  const chartData = {
    labels: curve.map((p) => p.step),
    datasets: [
      {
        label: 'Equity Curve',
        data: curve.map((p) => p.equity),
        borderColor: '#2f855a',
        backgroundColor: 'rgba(47, 133, 90, 0.2)',
      },
    ],
  };

  const downloadCsv = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/api/backtests/${id}/report`, {
        params: { format: 'csv' },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backtest-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notify({
        title: 'CSV download failed',
        message: error.response?.data?.message || 'Failed to download CSV report',
        variant: 'error',
        kind: 'report',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PremiumShell
      title={`Backtest Report #${id}`}
      subtitle="Audit strategy results, drawdowns, and execution details in an institutional report view."
    >
      <div className="backtest-hero card full-width">
        <div>
          <p className="kicker">Performance audit</p>
          <h2>Backtest Result #{id}</h2>
          <p className="muted">Review equity behavior, trade outcomes, and exportable evidence.</p>
        </div>
        <button type="button" className="nav-btn backtest-download-btn" onClick={downloadCsv} disabled={downloading}>
          {downloading ? 'Downloading...' : 'Download CSV Report'}
        </button>
      </div>

      <MetricsTable metrics={result?.metrics} />

      <div className="card">
        <h3>Equity Curve</h3>
        <div className="equity-chart-wrap backtest-chart-wrap">
          <Line data={chartData} />
        </div>
      </div>

      <div className="card">
        <h3>Trades</h3>
        <pre>{JSON.stringify(result?.trades || [], null, 2)}</pre>
      </div>
    </PremiumShell>
  );
}
