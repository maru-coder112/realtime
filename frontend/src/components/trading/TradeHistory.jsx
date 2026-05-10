import React, { useState, useMemo } from 'react';

function formatTradeTime(trade) {
  const value = trade.time || trade.created_at || trade.createdAt || trade.timestamp;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleTimeString() : '—';
}

export default function TradeHistory({ trades = [], onCloseTrade }) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [sortKey, setSortKey] = useState('time');
  const [filterSide, setFilterSide] = useState('all');

  const filtered = useMemo(() => trades.filter((t) => (filterSide === 'all' ? true : t.side === filterSide)), [trades, filterSide]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => (b[sortKey] > a[sortKey] ? 1 : -1)), [filtered, sortKey]);
  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page, pageSize]);

  return (
    <div className="trade-history card">
      <div className="trade-history-header">
        <h4>Trade History</h4>
        <div>
          <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)}>
            <option value="all">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="time">Time</option>
            <option value="profit">P/L</option>
          </select>
        </div>
      </div>

      <table className="trade-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Asset</th>
            <th>Type</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Qty</th>
            <th>P/L</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((t) => (
            <tr key={t.id} className={t.profit >= 0 ? 'profit' : 'loss'}>
              <td>{t.id}</td>
              <td>{t.asset}</td>
              <td>{t.side}</td>
              <td>{t.entry}</td>
              <td>{t.exit || '—'}</td>
              <td>{t.qty}</td>
              <td>{t.profit != null ? t.profit.toFixed(2) : '—'}</td>
              <td>{formatTradeTime(t)}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="trade-pagination">
        <button onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
        <span>{page}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
