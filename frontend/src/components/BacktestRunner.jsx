import { useState } from 'react';
import { MARKET_SYMBOLS } from '../constants/markets';
import { useNotifications } from '../context/NotificationContext';

export default function BacktestRunner({ strategyId, onRun, running = false }) {
  const { notify } = useNotifications();
  const today = new Date();
  const past = new Date();
  past.setMonth(today.getMonth() - 3);

  const [payload, setPayload] = useState({
    symbol: MARKET_SYMBOLS[0].value,
    interval: '1d',
    startDate: past.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!strategyId) {
      notify({
        title: 'Strategy required',
        message: 'Please create or load a strategy first.',
        variant: 'warning',
        kind: 'system',
      });
      return;
    }

    if (payload.startDate > payload.endDate) {
      notify({
        title: 'Invalid date range',
        message: 'Start date must be before end date.',
        variant: 'warning',
        kind: 'system',
      });
      return;
    }

    await onRun({
      strategyId,
      symbol: payload.symbol,
      startDate: payload.startDate,
      endDate: payload.endDate,
      interval: payload.interval,
    });
  };

  return (
    <form className="card strategy-card" onSubmit={handleSubmit}>
      <h3>Run Backtest</h3>

      <div className="compact-grid compact-grid-2">
        <div className="field">
          <label>Symbol</label>
          <select value={payload.symbol} onChange={(e) => setPayload({ ...payload, symbol: e.target.value })}>
            {MARKET_SYMBOLS.map((item) => (
              <option key={item.value} value={item.value}>{item.value}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Interval</label>
          <select value={payload.interval} onChange={(e) => setPayload({ ...payload, interval: e.target.value })}>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </div>

        <div className="field">
          <label>Start Date</label>
          <input
            type="date"
            value={payload.startDate}
            onChange={(e) => setPayload({ ...payload, startDate: e.target.value })}
          />
        </div>

        <div className="field">
          <label>End Date</label>
          <input
            type="date"
            value={payload.endDate}
            onChange={(e) => setPayload({ ...payload, endDate: e.target.value })}
          />
        </div>
      </div>

      <button type="submit" className="compact-action" disabled={!strategyId || running}>
        {running ? 'Running...' : 'Run Backtest'}
      </button>
      {!strategyId && <p className="muted">Create a strategy first.</p>}
    </form>
  );
}
