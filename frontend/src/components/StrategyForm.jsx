import { useState } from 'react';

export default function StrategyForm({ onCreate }) {
  const [form, setForm] = useState({
    name: 'SMA Crossover',
    description: 'Simple moving average crossover strategy',
    shortWindow: 5,
    longWindow: 20,
    initialCapital: 10000,
    stopLossPct: 3,
    takeProfitPct: 8,
    feeRate: 0.1,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const shortWindow = Number(form.shortWindow);
    const longWindow = Number(form.longWindow);
    const stopLossPct = Number(form.stopLossPct);
    const takeProfitPct = Number(form.takeProfitPct);
    const feeRate = Number(form.feeRate);

    if (shortWindow >= longWindow) {
      alert('Short window must be smaller than long window.');
      return;
    }

    if (stopLossPct < 0 || takeProfitPct < 0 || feeRate < 0) {
      alert('Stop Loss, Take Profit, and Fee Rate cannot be negative.');
      return;
    }

    onCreate({
      name: form.name,
      description: form.description,
      parameters: {
        shortWindow,
        longWindow,
        initialCapital: Number(form.initialCapital),
        stopLossPct,
        takeProfitPct,
        feeRate,
      },
    });
  };

  return (
    <form className="card strategy-card" onSubmit={handleSubmit}>
      <h3>Create Strategy</h3>
      <p className="muted">Set your signal parameters, then run backtests and track performance below.</p>

      <div className="compact-grid">
        <div className="field field-full">
          <label>Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div className="field field-full">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Short Window</label>
          <input
            type="number"
            min="2"
            value={form.shortWindow}
            onChange={(e) => setForm({ ...form, shortWindow: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Long Window</label>
          <input
            type="number"
            min="3"
            value={form.longWindow}
            onChange={(e) => setForm({ ...form, longWindow: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Initial Capital</label>
          <input
            type="number"
            min="100"
            step="100"
            value={form.initialCapital}
            onChange={(e) => setForm({ ...form, initialCapital: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Stop Loss (%)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.stopLossPct}
            onChange={(e) => setForm({ ...form, stopLossPct: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Take Profit (%)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.takeProfitPct}
            onChange={(e) => setForm({ ...form, takeProfitPct: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Fee Rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.feeRate}
            onChange={(e) => setForm({ ...form, feeRate: e.target.value })}
          />
        </div>
      </div>

      <button type="submit" className="compact-action">Save Strategy</button>
    </form>
  );
}
