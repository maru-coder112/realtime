import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function clip(text, max = 140) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

export default function DashboardNews({ limit = 8, title = 'Crypto News Feed', showMoreLink = false }) {
  const [news, setNews] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadNews() {
      try {
        const { data } = await api.get('/api/market/news', { params: { limit } });
        if (!mounted) return;
        setNews(Array.isArray(data.news) ? data.news : []);
      } catch (error) {
        if (mounted) setNews([]);
      }
    }

    loadNews();
    const timer = window.setInterval(loadNews, 45000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [limit]);

  return (
    <div className="card news-card">
      <div className="row space-between wrap gap">
        <h3>{title}</h3>
        {showMoreLink && <Link className="btn-link" to="/news">Open News Page</Link>}
      </div>
      {!news.length && <p className="muted">Loading news...</p>}

      <div className="news-list">
        {news.map((item) => (
          <a key={item.id} className="news-item" href={item.url} target="_blank" rel="noreferrer">
            <p className="news-title">{item.title}</p>
            <p className="muted">{clip(item.summary)}</p>
            <p className="news-meta">{item.source || 'News'} {item.publishedAt ? `• ${new Date(item.publishedAt).toLocaleString()}` : ''}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
