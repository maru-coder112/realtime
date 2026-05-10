import React, { useState } from 'react';

export default function WatchlistPanel({ assets = [], selected, onSelect, setSelected, onAdd, onRemove, prices = {} }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input) return;
    if (onAdd) onAdd(input.toUpperCase());
    setInput('');
  };

  const handleSelect = (asset) => {
    if (onSelect) onSelect(asset);
    else if (setSelected) setSelected(asset);
  };

  return (
    <div className="watchlist-panel card">
      <div className="watchlist-header">
        <h4>Watchlist</h4>
        <div className="watchlist-add">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add symbol" />
          <button onClick={handleAdd}>Add</button>
        </div>
      </div>

      <ul className="watchlist-list">
        {assets.map((a) => {
          const sym = typeof a === 'string' ? a : (a?.symbol || JSON.stringify(a));
          const name = typeof a === 'string' ? '' : (a?.name || '');
          const isActive = (typeof selected === 'string' ? selected === sym : (selected?.symbol === sym));
          return (
            <li key={sym} className={`watchlist-item ${isActive ? 'active' : ''}`} onClick={() => handleSelect(typeof a === 'string' ? a : a)}>
              <div className="sym">{sym}<div style={{ fontSize: 11, color: '#9fb0c8' }}>{name}</div></div>
              <div className="price">{prices[sym] != null ? Number(prices[sym]).toFixed(2) : '—'}</div>
              <div className={`chg ${prices[`chg_${sym}`] >= 0 ? 'up' : 'down'}`}>{prices[`chg_${sym}`] != null ? `${prices[`chg_${sym}`].toFixed(2)}%` : ''}</div>
              <button className="remove" onClick={(e) => { e.stopPropagation(); if (onRemove) onRemove(sym); }}>×</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
