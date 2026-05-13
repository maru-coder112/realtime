import { useEffect, useMemo, useState } from 'react';
import PremiumShell from '../components/PremiumShell';
import api from '../services/api';
import { useMarketTicker } from '../hooks/useMarketTicker';

const START_BALANCE = 10000;
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d'];

const INITIAL_WATCHLIST = [
  { symbol: 'BTCUSD', name: 'Bitcoin', price: 80712.95, openPrice: 79980, spread: 18.4, volume: 18240, volatility: 0.0026 },
  { symbol: 'ETHUSD', name: 'Ethereum', price: 4218.34, openPrice: 4172, spread: 5.2, volume: 23560, volatility: 0.0029 },
  { symbol: 'SOLUSD', name: 'Solana', price: 168.12, openPrice: 164.9, spread: 0.92, volume: 19420, volatility: 0.0034 },
  { symbol: 'AAPL', name: 'Apple', price: 197.88, openPrice: 195.6, spread: 0.55, volume: 15120, volatility: 0.0018 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 914.12, openPrice: 903.5, spread: 1.1, volume: 11280, volatility: 0.0021 },
  { symbol: 'XAUUSD', name: 'Gold', price: 2326.8, openPrice: 2311.2, spread: 1.9, volume: 9680, volatility: 0.0017 },
];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number(value || 0) >= 100 ? 2 : 4,
  }).format(Number(value || 0));
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}%`;
}

function formatTradeTime(trade) {
  const value = trade.time || trade.created_at || trade.createdAt || trade.timestamp;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString() : '—';
}

function createHistorySeries(basePrice) {
  const now = Date.now();
  let lastClose = basePrice;
  return Array.from({ length: 72 }).map((_, index) => {
    const drift = Math.sin(index / 5) * 0.0012 + (Math.random() - 0.5) * 0.0034;
    const close = Math.max(0.01, lastClose * (1 + drift));
    const open = lastClose;
    const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0015);
    lastClose = close;
    return {
      time: now - (72 - index) * 60000,
      open,
      high,
      low,
      close,
      volume: Math.round(180 + Math.random() * 800),
    };
  });
}

function buildChartGeometry(series) {
  if (!series.length) return { line: '', area: '', min: 0, max: 1 };

  const width = 840;
  const height = 280;
  const padding = 18;
  const prices = series.map((point) => point.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(max - min, 0.01);

  const points = series.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(series.length - 1, 1);
    const y = height - padding - ((point.close - min) / span) * (height - padding * 2);
    return { x, y };
  });

  return {
    line: points.map((point) => `${point.x},${point.y}`).join(' '),
    area: [
      `M ${padding} ${height - padding}`,
      `L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`,
      `L ${width - padding} ${height - padding}`,
      'Z',
    ].join(' '),
    min,
    max,
  };
}

function normalizeTradeRow(row) {
  const trade = row?.trade_data || row || {};
  const tradeId = row?.trade_id || trade.tradeId || trade.id || uid();
  const createdAt = trade.created_at || trade.createdAt || row?.created_at || new Date().toISOString();

  return {
    id: tradeId,
    tradeId,
    asset: trade.asset || row?.asset || 'UNKNOWN',
    side: trade.side || row?.side || 'buy',
    type: trade.type || row?.type || 'market',
    qty: Number(trade.qty ?? row?.qty ?? 0),
    entryPrice: trade.entryPrice ?? trade.price ?? row?.entryPrice ?? row?.price ?? null,
    exitPrice: trade.exitPrice ?? row?.exitPrice ?? null,
    pnl: trade.pnl ?? row?.pnl ?? null,
    status: trade.status || row?.status || 'open',
    sl: trade.sl ?? row?.sl ?? null,
    tp: trade.tp ?? row?.tp ?? null,
    riskPct: trade.riskPct ?? row?.riskPct ?? null,
    created_at: createdAt,
    time: createdAt,
  };
}

function TickerPill({ active, children, tone = 'neutral', ...props }) {
  return (
    <button type="button" className={`live-pill ${active ? 'active' : ''} ${tone}`} {...props}>
      {children}
    </button>
  );
}

function StatCard({ label, value, hint, tone = 'neutral' }) {
  return (
    <div className="metric-card card live-stat-card">
      <p className="metric-label">{label}</p>
      <h3 className={`metric-value ${tone}`}>{value}</h3>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </div>
  );
}

function resolveLivePrice(symbol, ticker) {
  if (!ticker || typeof ticker !== 'object') return null;
  const direct = ticker[symbol];
  if (Number.isFinite(Number(direct))) return Number(direct);

  const alias = {
    BTCUSD: ticker.BTCUSDT,
    ETHUSD: ticker.ETHUSDT,
  };

  const mapped = alias[symbol];
  return Number.isFinite(Number(mapped)) ? Number(mapped) : null;
}

export default function LiveTradingPage() {
  const { ticker, connected: socketConnected } = useMarketTicker();
  const [selectedSymbol, setSelectedSymbol] = useState(INITIAL_WATCHLIST[0].symbol);
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState(() => createHistorySeries(INITIAL_WATCHLIST[0].price));
  const [timeframe, setTimeframe] = useState('1m');
  const [balance, setBalance] = useState(START_BALANCE);
  const [fills, setFills] = useState([]);
  const [loadingFills, setLoadingFills] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Ready to stage a paper trade.');
  const [newSymbol, setNewSymbol] = useState('');
  const [ticket, setTicket] = useState({ side: 'buy', qty: '0.02', riskPct: '1.5', limitPrice: '', stopLoss: '', takeProfit: '' });

  const filteredWatchlist = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return watchlist;
    return watchlist.filter((asset) => (
      asset.symbol.toLowerCase().includes(query)
      || String(asset.name || '').toLowerCase().includes(query)
    ));
  }, [watchlist, searchQuery]);

  const selectedAsset = useMemo(
    () => filteredWatchlist.find((item) => item.symbol === selectedSymbol) || filteredWatchlist[0] || watchlist.find((item) => item.symbol === selectedSymbol) || watchlist[0] || INITIAL_WATCHLIST[0],
    [filteredWatchlist, watchlist, selectedSymbol]
  );

  const chartGeometry = useMemo(() => buildChartGeometry(history), [history]);

  const historyTrend = useMemo(() => {
    const first = history[0]?.close ?? 0;
    const last = history[history.length - 1]?.close ?? first;
    return first ? ((last - first) / first) * 100 : 0;
  }, [history]);

  const openFills = useMemo(() => fills.filter((trade) => trade.status === 'open'), [fills]);
  const currentHoldings = useMemo(() => {
    const holdingsByAsset = new Map();

    for (const trade of openFills) {
      const symbol = String(trade.asset || '').toUpperCase();
      const qty = Number(trade.qty) || 0;
      if (!symbol || qty <= 0) continue;

      const side = String(trade.side || 'buy').toLowerCase() === 'sell' ? -1 : 1;
      const signedQty = qty * side;
      const entryPrice = Number(trade.entryPrice) || 0;
      const current = holdingsByAsset.get(symbol) || {
        symbol,
        netQty: 0,
        signedCost: 0,
        tradeCount: 0,
      };

      current.netQty += signedQty;
      current.signedCost += signedQty * entryPrice;
      current.tradeCount += 1;
      holdingsByAsset.set(symbol, current);
    }

    return Array.from(holdingsByAsset.values())
      .filter((holding) => Math.abs(holding.netQty) > 1e-9)
      .map((holding) => {
        const livePrice = watchlist.find((asset) => asset.symbol === holding.symbol)?.price;
        const avgEntry = holding.netQty !== 0 ? Math.abs(holding.signedCost / holding.netQty) : 0;
        const markPrice = Number.isFinite(Number(livePrice)) ? Number(livePrice) : avgEntry;
        const marketValue = holding.netQty * markPrice;
        const unrealizedPnl = (markPrice - avgEntry) * holding.netQty;

        return {
          ...holding,
          avgEntry,
          markPrice,
          marketValue,
          unrealizedPnl,
          direction: holding.netQty > 0 ? 'Long' : 'Short',
        };
      })
      .sort((a, b) => Math.abs(b.marketValue) - Math.abs(a.marketValue));
  }, [openFills, watchlist]);

  const filteredHoldings = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return currentHoldings;
    return currentHoldings.filter((holding) => holding.symbol.toLowerCase().includes(query));
  }, [currentHoldings, searchQuery]);

  const filteredFills = useMemo(() => {
    const query = String(searchQuery || '').trim().toLowerCase();
    if (!query) return fills;
    return fills.filter((trade) => (
      String(trade.asset || '').toLowerCase().includes(query)
      || String(trade.side || '').toLowerCase().includes(query)
      || String(trade.status || '').toLowerCase().includes(query)
    ));
  }, [fills, searchQuery]);

  const holdingsMarketValue = useMemo(
    () => currentHoldings.reduce((sum, holding) => sum + holding.marketValue, 0),
    [currentHoldings]
  );

  const holdingsUnrealized = useMemo(
    () => currentHoldings.reduce((sum, holding) => sum + holding.unrealizedPnl, 0),
    [currentHoldings]
  );

  const openPnl = useMemo(() => openFills.reduce((sum, trade) => {
    const quote = watchlist.find((item) => item.symbol === trade.asset)?.price ?? selectedAsset.price;
    const qty = Number(trade.qty) || 0;
    const entry = Number(trade.entryPrice) || quote;
    const delta = trade.side === 'buy' ? (quote - entry) * qty : (entry - quote) * qty;
    return sum + delta;
  }, 0), [openFills, watchlist, selectedAsset.price]);

  const selectedChange = useMemo(() => {
    const base = selectedAsset.openPrice || selectedAsset.price || 1;
    return ((selectedAsset.price - base) / base) * 100;
  }, [selectedAsset]);

  const selectedNotional = Number(ticket.qty || 0) * Number(selectedAsset.price || 0);
  const projectedBalance = ticket.side === 'buy' ? Math.max(0, balance - selectedNotional) : balance + selectedNotional;

  useEffect(() => {
    setHistory(createHistorySeries(selectedAsset.price));
  }, [selectedSymbol]);

  useEffect(() => {
    if (!ticker) return;

    const liveBTC = resolveLivePrice('BTCUSD', ticker);
    const liveETH = resolveLivePrice('ETHUSD', ticker);

    setWatchlist((current) => current.map((asset) => {
      const live = asset.symbol === 'BTCUSD' ? liveBTC : asset.symbol === 'ETHUSD' ? liveETH : null;
      if (Number.isFinite(live)) {
        return {
          ...asset,
          price: live,
          source: 'live',
        };
      }
      return asset;
    }));

    setStatusMessage(`Live feed active${ticker.timestamp ? ` • ${new Date(ticker.timestamp).toLocaleTimeString()}` : ''}`);
  }, [ticker]);

  useEffect(() => {
    const timer = setInterval(() => {
      setWatchlist((current) => current.map((asset, index) => {
        const live = resolveLivePrice(asset.symbol, ticker);
        if (Number.isFinite(live)) {
          return { ...asset, price: live, source: 'live' };
        }

        const volatility = asset.volatility || 0.0025;
        const drift = (Math.random() - 0.5) * volatility + Math.sin((Date.now() / 1000 + index) / 9) * 0.00045;
        const price = Math.max(0.01, asset.price * (1 + drift));
        return {
          ...asset,
          price,
          volume: Math.round(asset.volume * (1 + (Math.random() - 0.5) * 0.03)),
          spread: Math.max(0.01, asset.spread * (1 + (Math.random() - 0.5) * 0.01)),
          source: 'sim',
        };
      }));

      setHistory((current) => {
        const last = current[current.length - 1] || { close: selectedAsset.price };
        const drift = (Math.random() - 0.5) * 0.004 + Math.sin(current.length / 7) * 0.0006;
        const close = Math.max(0.01, last.close * (1 + drift));
        const next = {
          time: Date.now(),
          open: last.close,
          high: Math.max(last.close, close) * (1 + Math.random() * 0.0012),
          low: Math.min(last.close, close) * (1 - Math.random() * 0.0012),
          close,
          volume: Math.round(160 + Math.random() * 640),
        };
        return [...current.slice(-95), next];
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [ticker, selectedAsset.price]);

  useEffect(() => {
    let mounted = true;

    async function loadFills() {
      try {
        const response = await api.get('/api/trades');
        if (!mounted) return;
        const rows = response?.data?.trades || [];
        setFills(rows.map(normalizeTradeRow));
      } catch {
        if (mounted) {
          setFills([]);
        }
      } finally {
        if (mounted) {
          setLoadingFills(false);
        }
      }
    }

    loadFills();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleGlobalSearch = (event) => {
      setSearchQuery(String(event?.detail?.query || ''));
    };

    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);

  useEffect(() => {
    if (!filteredWatchlist.length) return;
    if (!filteredWatchlist.some((asset) => asset.symbol === selectedSymbol)) {
      setSelectedSymbol(filteredWatchlist[0].symbol);
    }
  }, [filteredWatchlist, selectedSymbol]);

  const addWatchSymbol = () => {
    const symbol = String(newSymbol || '').trim().toUpperCase();
    if (!symbol) return;

    setWatchlist((current) => {
      if (current.some((asset) => asset.symbol === symbol)) return current;
      const next = {
        symbol,
        name: symbol,
        price: symbol.includes('USD') ? 180 : 100,
        openPrice: symbol.includes('USD') ? 176 : 98,
        spread: 0.5,
        volume: 8000,
        volatility: 0.003,
      };
      return [next, ...current];
    });

    setSelectedSymbol(symbol);
    setNewSymbol('');
  };

  const stagePaperTrade = async () => {
    const qty = Number(ticket.qty);
    const price = Number(selectedAsset.price || 0);
    if (!qty || qty <= 0 || !price) {
      setStatusMessage('Enter a quantity and select an asset.');
      return;
    }

    if (ticket.side === 'buy' && qty * price > balance) {
      setStatusMessage('Not enough virtual cash for this order.');
      return;
    }

    setStatusMessage('Staging paper trade...');

    try {
      const payload = {
        asset: selectedAsset.symbol,
        side: ticket.side,
        type: 'market',
        price,
        qty,
        sl: ticket.stopLoss ? Number(ticket.stopLoss) : null,
        tp: ticket.takeProfit ? Number(ticket.takeProfit) : null,
        riskPct: ticket.riskPct ? Number(ticket.riskPct) : null,
      };

      const response = await api.post('/api/trades', payload);
      const trade = normalizeTradeRow(response?.data?.trade || { ...payload, created_at: new Date().toISOString() });

      setFills((current) => [trade, ...current]);
      setBalance((current) => (ticket.side === 'buy' ? current - qty * price : current + qty * price));
      setStatusMessage(`${ticket.side.toUpperCase()} paper trade staged for ${selectedAsset.symbol}.`);
    } catch {
      setStatusMessage('Trade archive rejected the order. Check backend auth or connectivity.');
    }
  };

  const fillRows = filteredFills.slice(0, 8);

  return (
    <PremiumShell title="Live Trading" subtitle="Simplified paper desk with realtime prices">
      <div className="live-desk simplified-live-desk">
        <section className="live-hero card">
          <div className="live-hero-copy">
            <p className="kicker">Paper trading / realtime market feed</p>
            <h2>Watchlist, Market board, and Stage a paper trade</h2>
            <p>
              A simplified trading workspace with live BTCUSD pricing, a compact order ticket, and recent fills from the trade archive.
            </p>
          </div>

          <div className="live-hero-actions simplified-stats">
            <StatCard label="Virtual cash" value={formatMoney(balance)} hint="Starting balance: $10,000" tone={balance >= START_BALANCE ? 'good' : 'warning'} />
            <StatCard label="Open P/L" value={formatMoney(openPnl)} hint={`${openFills.length} open fills`} tone={openPnl >= 0 ? 'good' : 'warning'} />
            <StatCard label="Paper equity" value={formatMoney(balance + openPnl)} hint={statusMessage} tone={balance + openPnl >= START_BALANCE ? 'good' : 'warning'} />
          </div>
        </section>

        <div className="live-simplified-grid">
          <div className="live-main-column">
            <details className="live-panel live-dropdown" open>
              <summary className="live-dropdown-summary">
                <span>
                  <strong>Watchlist</strong>
                  <small>Realtime prices and quick selection</small>
                </span>
                <span className={`status-pill ${socketConnected ? 'good' : 'warning'}`}>{socketConnected ? 'Live' : 'Offline'}{searchQuery ? ` • ${filteredWatchlist.length} match${filteredWatchlist.length === 1 ? '' : 'es'}` : ''}</span>
              </summary>

              <div className="live-panel-body">
                <div className="live-input-row simplified-input-row">
                  <input
                    value={newSymbol}
                    onChange={(event) => setNewSymbol(event.target.value)}
                    placeholder="Add symbol"
                  />
                  <button className="nav-btn" type="button" onClick={addWatchSymbol}>Add</button>
                </div>

                <div className="watchlist-grid">
                  {filteredWatchlist.map((asset) => {
                    const changePct = ((asset.price - asset.openPrice) / asset.openPrice) * 100;
                    const isActive = asset.symbol === selectedSymbol;
                    const isLive = asset.symbol === 'BTCUSD' || asset.symbol === 'ETHUSD';

                    return (
                      <button
                        key={asset.symbol}
                        type="button"
                        className={`watch-card ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedSymbol(asset.symbol)}
                      >
                        <div className="watch-card-top">
                          <div>
                            <strong>{asset.symbol}</strong>
                            <span>{asset.name}</span>
                          </div>
                          <span className={`watch-change ${changePct >= 0 ? 'positive' : 'negative'}`}>
                            {formatPercent(changePct)}
                          </span>
                        </div>
                        <div className="watch-card-bottom">
                          <span>{formatMoney(asset.price)}</span>
                          <small>{isLive ? 'realtime' : 'synced'}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </details>

            <details className="live-panel live-dropdown" open>
              <summary className="live-dropdown-summary">
                <span>
                  <strong>Market board</strong>
                  <small>{selectedAsset.symbol} chart and quick stats</small>
                </span>
                <span className={`live-trend ${selectedChange >= 0 ? 'positive' : 'negative'}`}>{formatPercent(selectedChange)}</span>
              </summary>

              <div className="live-panel-body">
                <div className="market-board-top">
                  <div>
                    <h3>{selectedAsset.symbol} <span>{selectedAsset.name}</span></h3>
                    <p className="live-price">{formatMoney(selectedAsset.price)}</p>
                  </div>

                  <div className="market-board-meta">
                    <div className="market-meta-pill">Spread {formatMoney(selectedAsset.spread)}</div>
                    <div className="market-meta-pill">Volume {formatNumber(selectedAsset.volume, 0)}</div>
                    <div className="market-meta-pill">Trend {formatPercent(historyTrend)}</div>
                  </div>
                </div>

                <div className="live-timeframes simplified-timeframes">
                  {TIMEFRAMES.map((frame) => (
                    <TickerPill key={frame} active={frame === timeframe} onClick={() => setTimeframe(frame)}>
                      {frame}
                    </TickerPill>
                  ))}
                </div>

                <div className="live-chart-wrap">
                  <svg viewBox="0 0 840 280" preserveAspectRatio="none" className="live-chart-svg" aria-hidden="true">
                    <defs>
                      <linearGradient id="liveChartStroke" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor="#00c896" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="liveChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(0, 200, 150, 0.28)" />
                        <stop offset="100%" stopColor="rgba(0, 200, 150, 0)" />
                      </linearGradient>
                    </defs>
                    <path d={chartGeometry.area} fill="url(#liveChartFill)" />
                    <polyline
                      points={chartGeometry.line}
                      fill="none"
                      stroke="url(#liveChartStroke)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="live-chart-grid" />
                </div>

                <div className="market-summary simplified-market-summary">
                  <div className="market-summary-row">
                    <span>Session range</span>
                    <strong>{formatMoney(chartGeometry.min)} - {formatMoney(chartGeometry.max)}</strong>
                  </div>
                  <div className="market-summary-row">
                    <span>Selected change</span>
                    <strong className={selectedChange >= 0 ? 'good' : 'bad'}>{formatPercent(selectedChange)}</strong>
                  </div>
                  <div className="market-summary-row">
                    <span>Feed source</span>
                    <strong>{socketConnected ? 'socket realtime' : 'local sim'}</strong>
                  </div>
                </div>
              </div>
            </details>

            <details className="live-panel live-dropdown" open>
              <summary className="live-dropdown-summary">
                <span>
                  <strong>Recent fills</strong>
                  <small>Fetched from the trade archive</small>
                </span>
                <span className="status-pill neutral">{loadingFills ? 'Loading' : `${fillRows.length} fills`}</span>
              </summary>

              <div className="live-panel-body">
                <div className="table-wrap live-table-wrap">
                  <table className="live-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Asset</th>
                        <th>Side</th>
                        <th>Qty</th>
                        <th>Entry</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fillRows.map((trade) => (
                        <tr key={trade.id}>
                          <td>{String(trade.tradeId || trade.id).slice(-6)}</td>
                          <td>{trade.asset}</td>
                          <td className={trade.side === 'buy' ? 'good' : 'bad'}>{trade.side}</td>
                          <td>{formatNumber(trade.qty, 3)}</td>
                          <td>{formatMoney(trade.entryPrice)}</td>
                          <td>{trade.status}</td>
                          <td>{formatTradeTime(trade)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </div>

          <aside className="live-ticket-column">
            <details className="live-panel live-dropdown" open>
              <summary className="live-dropdown-summary">
                <span>
                  <strong>Order ticket</strong>
                  <small>Stage a paper trade</small>
                </span>
                <span className="status-pill neutral">Paper only</span>
              </summary>

              <div className="live-panel-body live-ticket-card compact-ticket">
                <div className="trade-type-tabs simplified-tabs">
                  <button
                    type="button"
                    className={`trade-tab ${ticket.side === 'buy' ? 'active buy' : ''}`}
                    onClick={() => setTicket((current) => ({ ...current, side: 'buy' }))}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className={`trade-tab ${ticket.side === 'sell' ? 'active sell' : ''}`}
                    onClick={() => setTicket((current) => ({ ...current, side: 'sell' }))}
                  >
                    Sell
                  </button>
                </div>

                <div className="trade-summary compact-summary">
                  <div className="summary-row">
                    <span>Selected asset</span>
                    <strong>{selectedAsset.symbol}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Current price</span>
                    <strong>{formatMoney(selectedAsset.price)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Projected cash</span>
                    <strong>{formatMoney(projectedBalance)}</strong>
                  </div>
                </div>

                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={ticket.qty}
                    onChange={(event) => setTicket((current) => ({ ...current, qty: event.target.value }))}
                  />
                </div>

                <details className="paper-advanced">
                  <summary>Advanced</summary>
                  <div className="paper-advanced-grid">
                    <div className="form-field">
                      <label>Limit price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ticket.limitPrice}
                        onChange={(event) => setTicket((current) => ({ ...current, limitPrice: event.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>Risk %</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={ticket.riskPct}
                        onChange={(event) => setTicket((current) => ({ ...current, riskPct: event.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>Stop loss</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ticket.stopLoss}
                        onChange={(event) => setTicket((current) => ({ ...current, stopLoss: event.target.value }))}
                      />
                    </div>
                    <div className="form-field">
                      <label>Take profit</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ticket.takeProfit}
                        onChange={(event) => setTicket((current) => ({ ...current, takeProfit: event.target.value }))}
                      />
                    </div>
                  </div>
                </details>

                <button className={`trade-btn ${ticket.side}`} type="button" onClick={stagePaperTrade}>
                  Stage Paper Trade
                </button>

                <p className="live-status">{statusMessage}</p>
              </div>
            </details>

            <details className="live-panel live-dropdown" open>
              <summary className="live-dropdown-summary">
                <span>
                  <strong>Current holding</strong>
                  <small>Open position exposure</small>
                </span>
                <span className="status-pill neutral">{filteredHoldings.length} assets</span>
              </summary>

              <div className="live-panel-body">
                {filteredHoldings.length ? (
                  <>
                    <div className="live-holdings-meta">
                      <div className="live-holdings-meta-item">
                        <span>Marked value</span>
                        <strong>{formatMoney(holdingsMarketValue)}</strong>
                      </div>
                      <div className="live-holdings-meta-item">
                        <span>Unrealized P/L</span>
                        <strong className={holdingsUnrealized >= 0 ? 'good' : 'bad'}>{formatMoney(holdingsUnrealized)}</strong>
                      </div>
                    </div>

                    <div className="live-holdings-list">
                      {filteredHoldings.map((holding) => (
                        <div key={holding.symbol} className="live-holding-row">
                          <div className="live-holding-left">
                            <strong>{holding.symbol}</strong>
                            <span>{holding.direction} • Qty {formatNumber(Math.abs(holding.netQty), 4)}</span>
                            <small>Avg {formatMoney(holding.avgEntry)}</small>
                          </div>
                          <div className="live-holding-right">
                            <span>{formatMoney(holding.markPrice)}</span>
                            <strong>{formatMoney(holding.marketValue)}</strong>
                            <small className={holding.unrealizedPnl >= 0 ? 'good' : 'bad'}>{formatMoney(holding.unrealizedPnl)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="live-empty-note">
                    {searchQuery ? 'No holdings match your search.' : 'No open holdings yet. Stage a paper trade to create a position.'}
                  </p>
                )}
              </div>
            </details>
          </aside>
        </div>
      </div>
    </PremiumShell>
  );
}