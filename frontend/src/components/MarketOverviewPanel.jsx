import { useEffect, useState } from 'react';
import api from '../services/api';

function formatPrice(value) {
  const num = Number(value || 0);
  if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (num >= 1) return `$${num.toFixed(3)}`;
  return `$${num.toFixed(5)}`;
}

function formatMarketValue(value) {
  const num = Number(value || 0);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function getMarketStatus(changePercent) {
  const change = Number(changePercent || 0);
  if (change >= 1) return { label: 'Bullish', className: 'status-good' };
  if (change <= -1) return { label: 'Bearish', className: 'status-bad' };
  return { label: 'Sideways', className: 'status-neutral' };
}

export default function MarketOverviewPanel({ selectedSymbol, onSelectSymbol }) {
  const [assets, setAssets] = useState([]);
  const [source, setSource] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      try {
        const { data } = await api.get('/api/market/summary');
        if (!mounted) return;
        setAssets(Array.isArray(data.assets) ? data.assets : []);
        setSource(data.source || '');
      } catch (error) {
        if (mounted) setAssets([]);
      }
    }

    loadSummary();
    const timer = window.setInterval(loadSummary, 12000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="card market-overview-card">
      <div className="row space-between wrap gap">
        <h3>Market Overview</h3>
        <span className="muted">source: {source || '--'}</span>
      </div>

      {!assets.length && <p className="muted">Loading market overview...</p>}

      <div className="overview-grid">
        {assets.slice(0, 8).map((asset) => {
          const up = Number(asset.priceChangePercent) >= 0;
          const status = getMarketStatus(asset.priceChangePercent);
          const marketValue = Number(asset.quoteVolume || 0);
          return (
            <button
              key={asset.symbol}
              type="button"
              className={asset.symbol === selectedSymbol ? 'overview-item active' : 'overview-item'}
              onClick={() => onSelectSymbol && onSelectSymbol(asset.symbol)}
            >
              <p className="overview-symbol">{asset.symbol}</p>
              <div className="overview-meta-row">
                <p className="overview-price">Price: {formatPrice(asset.lastPrice)}</p>
                <p className={`overview-status ${status.className}`}>Status: {status.label}</p>
              </div>
              <p className="overview-value">Market Value: {formatMarketValue(marketValue)}</p>
              <p className={up ? 'status-good' : 'status-bad'}>
                {up ? '+' : ''}{Number(asset.priceChangePercent || 0).toFixed(2)}%
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
