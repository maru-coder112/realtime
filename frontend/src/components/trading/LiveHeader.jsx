import React from 'react';
import { motion } from 'framer-motion';

export default function LiveHeader({ selected, setSelected, timeframe, setTimeframe, connection, balance }) {
  return (
    <motion.header className="card nav-topbar live-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="nav-brand-row">
        <div style={{ minWidth: 220 }}>
          <div className="kicker">Live</div>
          <h3 style={{ margin: 0 }}>{selected.symbol} • {selected.name}</h3>
        </div>

        <div className="nav-actions">
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="1d">1d</option>
          </select>

          <div className="muted" style={{ minWidth: 86, textAlign: 'center' }}>{connection === 'connected' ? 'Connected' : 'Reconnecting'}</div>

          <div className="profile-chip-meta">Balance: ${Number(balance).toLocaleString()}</div>
        </div>
      </div>
    </motion.header>
  );
}
