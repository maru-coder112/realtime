import { useMarketTicker } from '../hooks/useMarketTicker';

function PriceChip({ label, value }) {
  if (!value) return <span className="chip">{label}: --</span>;
  return <span className="chip">{label}: ${Number(value).toFixed(2)}</span>;
}

export default function RealTimeTicker() {
  const { ticker, connected } = useMarketTicker();

  return (
    <div className="card ticker-card">
      <div className="row space-between">
        <h3>Live Market Ticker</h3>
        <span className={connected ? 'status-good' : 'status-bad'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      <div className="row gap">
        <PriceChip label="BTCUSDT" value={ticker?.BTCUSDT} />
        <PriceChip label="ETHUSDT" value={ticker?.ETHUSDT} />
        <span className="chip">source: {ticker?.source || '--'}</span>
      </div>
    </div>
  );
}
