import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import { useNotifications } from '../../context/NotificationContext';

function validateOrder({ side, type, qty, price, balance }) {
  const errors = [];
  if (!qty || Number(qty) <= 0) errors.push('Quantity must be > 0');
  if (type === 'limit' && (!price || Number(price) <= 0)) errors.push('Price required for limit order');
  if (Number(qty) * (Number(price) || 0) > balance) errors.push('Insufficient balance');
  return errors;
}

export default function TradingPanel({ selected, balance, placeTrade, running, indicators, setIndicator }) {
  const [form, setForm] = useState({ type: 'market', side: 'buy', qty: 0.001, price: '', sl: '', tp: '', riskPct: 1 });
  const [errors, setErrors] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const { notify } = useNotifications();

  const estCost = useMemo(() => {
    const p = form.type === 'market' ? undefined : Number(form.price || 0);
    return (p || 0) * Number(form.qty || 0);
  }, [form]);

  const handlePlace = async () => {
    const errs = validateOrder({ ...form, balance });
    if (errs.length) return setErrors(errs);
    setErrors([]);
    const order = { ...form, asset: selected?.symbol || selected?.symbol, time: new Date().toISOString() };
    setPendingOrder(order);
  };

  const handleConfirm = async () => {
    if (!pendingOrder) return null;
    try {
      const rec = await placeTrade({ side: pendingOrder.side, type: pendingOrder.type, price: Number(pendingOrder.price || 0), qty: Number(pendingOrder.qty), sl: pendingOrder.sl, tp: pendingOrder.tp, riskPct: pendingOrder.riskPct, asset: selected?.symbol });
      setConfirm(rec);
      return rec;
    } catch (err) {
      throw err;
    } finally {
      setPendingOrder(null);
      setForm({ type: 'market', side: 'buy', qty: 0.001, price: '', sl: '', tp: '', riskPct: 1 });
    }
  };

  return (
    <motion.div className="card trading-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h4>Order Entry</h4>

      <div className="compact-grid">
        <div className="field">
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        <div className="field">
          <label>Side</label>
          <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>

        <div className="field">
          <label>Quantity</label>
          <input type="number" step="any" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
        </div>

        {form.type === 'limit' && (
          <div className="field">
            <label>Price</label>
            <input type="number" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        )}

        <div className="field">
          <label>Stop-loss</label>
          <input type="number" step="any" value={form.sl} onChange={(e) => setForm({ ...form, sl: e.target.value })} />
        </div>

        <div className="field">
          <label>Take-profit</label>
          <input type="number" step="any" value={form.tp} onChange={(e) => setForm({ ...form, tp: e.target.value })} />
        </div>

        <div className="field">
          <label>Risk %</label>
          <input type="number" value={form.riskPct} onChange={(e) => setForm({ ...form, riskPct: e.target.value })} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="muted">Estimated cost: ${estCost ? estCost.toFixed(2) : '0.00'}</div>
        <div className="muted">Available: ${Number(balance).toFixed(2)}</div>
      </div>

      {errors.length > 0 && (
        <div className="card" style={{ marginTop: 10, background: 'rgba(245,20,20,0.06)' }}>
          {errors.map((e, i) => <div key={i} style={{ color: '#fecaca' }}>{e}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="nav-btn" onClick={handlePlace} disabled={running}>Place Trade</button>
        <button className="nav-btn" onClick={() => setForm({ type: 'market', side: 'buy', qty: 0.001, price: '', sl: '', tp: '', riskPct: 1 })}>Clear</button>
      </div>

      <ConfirmationModal open={!!pendingOrder} onClose={() => setPendingOrder(null)} order={pendingOrder || {}} onConfirm={handleConfirm} />

      {confirm && (
        <div className="card" style={{ marginTop: 12, padding: 10 }}>
          <strong>Last trade:</strong>
          <div>{confirm.side.toUpperCase()} {confirm.qty} {confirm.asset} @ {confirm.entryPrice.toFixed(2)}</div>
        </div>
      )}
    </motion.div>
  );
}
