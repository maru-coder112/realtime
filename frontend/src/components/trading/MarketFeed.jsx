import React from 'react';

export default function MarketFeed({ events = [] }) {
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4>Market Feed</h4>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {events.slice(0, 40).map((ev) => (
          <li key={ev.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13 }}>{ev.text}</div>
              <div className="muted" style={{ fontSize: 12 }}>{new Date().toLocaleTimeString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
