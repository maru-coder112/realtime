import React from 'react';

export default function LiveFeed({ feed = [] }) {
  return (
    <div className="live-feed card">
      <h4>Live Market Feed</h4>
      <ul>
        {feed.slice(0, 10).map((f, i) => (
          <li key={i} className={`feed-item ${f.type || 'info'}`}>
            <div className="feed-time">{f.time}</div>
            <div className="feed-text">{f.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
