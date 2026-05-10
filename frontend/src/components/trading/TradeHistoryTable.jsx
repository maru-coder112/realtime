import React, { useMemo, useState } from 'react';

function formatPL(p) {
  if (p == null) return '—';
  return `${p >= 0 ? '+' : '-'}$${Math.abs(p).toFixed(2)}`;
}

function formatTradeTime(trade) {
  const value = trade.time || trade.created_at || trade.createdAt || trade.timestamp;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleTimeString() : '—';
}

export default function TradeHistoryTable({ trades = [], onCancel }) {
  const [page, setPage] = useState(1);
  const per = 8;
  const pages = Math.max(1, Math.ceil(trades.length / per));

  const visible = useMemo(() => trades.slice((page - 1) * per, page * per), [trades, page]);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4>Trade History</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr className="muted"><th>ID</th><th>Asset</th><th>Type</th><th>Qty</th><th>Entry</th><th>Exit</th><th>P/L</th><th>Time</th><th /></tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ fontSize: 12 }}>{t.id.slice(-6)}</td>
              <td>{t.asset}</td>
              <td>{t.side}</td>
              <td>{t.qty}</td>
              <td>{t.entryPrice?.toFixed?.(2) ?? '—'}</td>
              <td>{t.exitPrice ? t.exitPrice.toFixed(2) : '—'}</td>
              <td style={{ color: t.pl >= 0 ? '#00C896' : '#FF4D6D' }}>{formatPL(t.pl)}</td>
              <td className="muted">{formatTradeTime(t)}</td>
              <td>{t.status === 'open' && <button className="nav-btn" onClick={() => onCancel && onCancel(t.id)}>Cancel</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <div className="muted">Page {page} / {pages}</div>
        <div>
          <button className="nav-btn" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button className="nav-btn" onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
