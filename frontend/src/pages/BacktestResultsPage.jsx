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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function BacktestResultsPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/api/backtests/${id}`);
        setResult(data);
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to load result');
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
      alert(error.response?.data?.message || 'Failed to download CSV report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="layout">
      <h2>Backtest Result #{id}</h2>
      <MetricsTable metrics={result?.metrics} />
      <div className="card">
        <h3>Equity Curve</h3>
        <Line data={chartData} />
      </div>
      <div className="card">
        <h3>Trades</h3>
        <pre>{JSON.stringify(result?.trades || [], null, 2)}</pre>
      </div>
      <button type="button" className="nav-btn" onClick={downloadCsv} disabled={downloading}>
        {downloading ? 'Downloading...' : 'Download CSV Report'}
      </button>
    </div>
  );
}
