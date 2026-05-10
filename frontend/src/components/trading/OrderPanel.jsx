import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export default function OrderPanel({ selected, balance = 10000, available = 10000, onPlaceOrder }) {
  const [type, setType] = useState('market');
  const [side, setSide] = useState('buy');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [stop, setStop] = useState('');
  const [take, setTake] = useState('');
  const [risk, setRisk] = useState(1);

  const estCost = useMemo(() => {
    const p = Number(price) || 0;
    const q = Number(qty) || 0;
    return q * (type === 'limit' ? p : (p || 0));
  }, [qty, price, type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selected) return;
    if (!qty || Number(qty) <= 0) return alert('Quantity required');
    if (type === 'limit' && (!price || Number(price) <= 0)) return alert('Limit price required');

    const payload = { side, type, qty: Number(qty), price: Number(price) || null, stop: Number(stop) || null, take: Number(take) || null, risk };
    onPlaceOrder(selected, payload);
  };

  return (
    <motion.form className="order-panel card" onSubmit={handleSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h4>Order Panel</h4>

      <div className="order-row">
        <label>Order Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>

      <div className="order-row toggle-row">
        <button type="button" className={`side-btn ${side === 'buy' ? 'buy' : ''}`} onClick={() => setSide('buy')}>Buy</button>
        <button type="button" className={`side-btn ${side === 'sell' ? 'sell' : ''}`} onClick={() => setSide('sell')}>Sell</button>
      </div>

      <div className="order-row">
        <label>Quantity</label>
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.0" />
      </div>

      {type === 'limit' && (
        <div className="order-row">
          <label>Price</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
        </div>
      )}

      <div className="order-row">
        <label>Stop-Loss</label>
        <input type="number" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="0.00" />
      </div>

      <div className="order-row">
        <label>Take-Profit</label>
        <input type="number" value={take} onChange={(e) => setTake(e.target.value)} placeholder="0.00" />
      </div>

      <div className="order-row">
        <label>Risk %</label>
        <input type="range" min="0.1" max="10" step="0.1" value={risk} onChange={(e) => setRisk(Number(e.target.value))} />
        <div className="risk-value">{risk}%</div>
      </div>

      <div className="order-row small">
        <div>Available: {available}</div>
        <div>Est. Cost: {estCost.toFixed(2)}</div>
      </div>

      <div className="order-actions">
        <button type="submit" className="primary">Place Trade</button>
        <button type="button" className="muted" onClick={() => { setQty(''); setPrice(''); setStop(''); setTake(''); }}>Clear</button>
      </div>
    </motion.form>
  );
}
