import { useState } from 'react';
import api from '../services/api';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [createName, setCreateName] = useState('My Portfolio');
  const [holding, setHolding] = useState({ symbol: 'BTC', amount: 0.25 });

  const createPortfolio = async () => {
    try {
      const { data } = await api.post('/api/portfolio', { name: createName, holdings: [] });
      setPortfolio(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create portfolio');
    }
  };

  const updateHolding = async () => {
    if (!portfolio?.id) return;
    try {
      const { data } = await api.put(`/api/portfolio/${portfolio.id}/holding`, {
        symbol: holding.symbol,
        amount: Number(holding.amount),
        action: 'upsert',
      });
      setPortfolio(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update holding');
    }
  };

  const loadPortfolio = async () => {
    if (!portfolio?.id) return;
    try {
      const { data } = await api.get(`/api/portfolio/${portfolio.id}`);
      setPortfolio(data);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load portfolio');
    }
  };

  return (
    <div className="layout">
      <div className="card">
        <h3>Create Portfolio</h3>
        <input value={createName} onChange={(e) => setCreateName(e.target.value)} />
        <button onClick={createPortfolio}>Create</button>
      </div>

      <div className="card">
        <h3>Update Holding</h3>
        <label>Symbol</label>
        <input value={holding.symbol} onChange={(e) => setHolding({ ...holding, symbol: e.target.value })} />
        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          value={holding.amount}
          onChange={(e) => setHolding({ ...holding, amount: e.target.value })}
        />
        <div className="row gap">
          <button onClick={updateHolding} disabled={!portfolio}>Save Holding</button>
          <button onClick={loadPortfolio} disabled={!portfolio}>Refresh</button>
        </div>
      </div>

      <div className="card">
        <h3>Portfolio Snapshot</h3>
        <pre>{JSON.stringify(portfolio, null, 2)}</pre>
      </div>
    </div>
  );
}
