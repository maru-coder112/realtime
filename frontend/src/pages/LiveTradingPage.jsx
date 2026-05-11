import React, { useEffect, useMemo, useState } from 'react';
import PremiumShell from '../components/PremiumShell';
import api from '../services/api';

const START_BALANCE = 10000;
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d'];
const ORDER_TYPES = ['market', 'limit'];
const QUICK_SIZES = [0.01, 0.02, 0.05, 0.1];

const MARKET_SEED = [
  { symbol: 'BTCUSD', name: 'Bitcoin', price: 48652.14, openPrice: 47880, spread: 14.8, volume: 18240, volatility: 0.0024 },
  { symbol: 'ETHUSD', name: 'Ethereum', price: 2741.26, openPrice: 2718, spread: 4.4, volume: 23560, volatility: 0.0028 },
  { symbol: 'SOLUSD', name: 'Solana', price: 162.41, openPrice: 159.2, spread: 0.92, volume: 19420, volatility: 0.0034 },
  { symbol: 'AAPL', name: 'Apple', price: 197.88, openPrice: 195.6, spread: 0.55, volume: 15120, volatility: 0.0018 },
  { symbol: 'BNBUSD', name: 'BNB', price: 622.37, openPrice: 614.9, spread: 1.4, volume: 12940, volatility: 0.0029 },
  { symbol: 'XRPUSD', name: 'XRP', price: 0.6248, openPrice: 0.6114, spread: 0.006, volume: 42810, volatility: 0.0036 },
  { symbol: 'NVDA', name: 'NVIDIA', price: 914.12, openPrice: 903.5, spread: 1.1, volume: 11280, volatility: 0.0021 },
  { symbol: 'TSLA', name: 'Tesla', price: 186.54, openPrice: 182.3, spread: 0.62, volume: 18760, volatility: 0.0027 },
  { symbol: 'XAUUSD', name: 'Gold', price: 2326.8, openPrice: 2311.2, spread: 1.9, volume: 9680, volatility: 0.0017 },
];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount >= 100 ? 2 : 4,
  }).format(amount);
}

function formatNumber(value, digits = 2) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

function formatPercent(value) {
  const amount = Number(value || 0);
  return `${amount >= 0 ? '+' : ''}${amount.toFixed(2)}%`;
}

function formatTradeTime(trade) {
  const value = trade.time || trade.created_at || trade.createdAt || trade.timestamp;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleTimeString() : '—';
}

function initialSeries(basePrice) {
  const now = Date.now();
  let lastClose = basePrice;
  return Array.from({ length: 64 }).map((_, index) => {
    const drift = Math.sin(index / 5) * 0.0012 + (Math.random() - 0.5) * 0.0034;
    const close = Math.max(0.01, lastClose * (1 + drift));
    const open = lastClose;
    const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0015);
    lastClose = close;
    return {
      time: now - (64 - index) * 60000,
      open,
      high,
      low,
      close,
      volume: Math.round(180 + Math.random() * 800),
    };
  });
}

function buildChartGeometry(series) {
  if (!series.length) {
    return { line: '', area: '', min: 0, max: 1 };
  }

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

  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = [
    `M ${padding} ${height - padding}`,
    `L ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`,
    `L ${width - padding} ${height - padding}`,
    'Z',
  ].join(' ');

  return { line, area, min, max };
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

function createActivity(message, tone = 'neutral') {
  return {
    id: uid(),
    message,
    tone,
    time: new Date().toLocaleTimeString(),
  };
}

function MetricCard({ label, value, hint, tone = 'neutral' }) {
  return (
    <div className="metric-card card">
      <p className="metric-label">{label}</p>
      <h3 className={`metric-value ${tone}`}>{value}</h3>
      {hint ? <p className="metric-hint">{hint}</p> : null}
    </div>
  );
}

function PillButton({ active, tone = 'neutral', children, ...props }) {
  return (
    <button
      className={`live-pill ${active ? 'active' : ''} ${tone}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export default function LiveTradingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState(MARKET_SEED[0].symbol);
  const [watchlist, setWatchlist] = useState(MARKET_SEED);
  const [history, setHistory] = useState(() => initialSeries(MARKET_SEED[0].price));
  const [timeframe, setTimeframe] = useState('1m');
  const [connection, setConnection] = useState('connected');
  const [balance, setBalance] = useState(START_BALANCE);
  const [openTrades, setOpenTrades] = useState([]);
  const [activity, setActivity] = useState([
    createActivity('Paper account opened with $10,000 virtual capital.', 'good'),
  ]);
  const [customSymbol, setCustomSymbol] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to stage an order.');
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [ticket, setTicket] = useState({
    side: 'buy',
    type: 'market',
    qty: '0.02',
    limitPrice: '',
    stopLoss: '',
    takeProfit: '',
    riskPct: '1.5',
  });

  const selectedAsset = useMemo(
    () => watchlist.find((item) => item.symbol === selectedSymbol) || watchlist[0] || MARKET_SEED[0],
    [watchlist, selectedSymbol],
  );

  const quoteMap = useMemo(() => Object.fromEntries(watchlist.map((item) => [item.symbol, item])), [watchlist]);

  const historyGeometry = useMemo(() => buildChartGeometry(history), [history]);

  const historyTrend = useMemo(() => {
    const first = history[0]?.close ?? 0;
    const last = history[history.length - 1]?.close ?? first;
    return first ? ((last - first) / first) * 100 : 0;
  }, [history]);

  const openPnl = useMemo(() => {
    return openTrades.reduce((sum, trade) => {
      const quote = quoteMap[trade.asset]?.price ?? selectedAsset.price;
      const qty = Number(trade.qty) || 0;
      const entry = Number(trade.entryPrice) || quote;
      const delta = trade.side === 'buy' ? (quote - entry) * qty : (entry - quote) * qty;
      return sum + delta;
    }, 0);
  }, [openTrades, quoteMap, selectedAsset.price]);

  const openCount = openTrades.filter((trade) => trade.status === 'open').length;
  const closedCount = openTrades.filter((trade) => trade.status === 'closed').length;
  const totalValue = balance + openPnl;

  useEffect(() => {
    setHistory(initialSeries(selectedAsset.price));
  }, [selectedSymbol]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await api.get('/api/trades');
        if (!mounted) return;
        const rows = response?.data?.trades || [];
        const normalized = rows.map(normalizeTradeRow);
        setOpenTrades(normalized);
        if (normalized.length) {
          setActivity((current) => [
            createActivity(`Loaded ${normalized.length} persisted trades from the desk archive.`, 'good'),
            ...current,
          ].slice(0, 10));
        }
      } catch (error) {
        if (mounted) {
          setStatusMessage('Using offline paper mode until the trade archive responds.');
          setActivity((current) => [createActivity('Trade archive unavailable; running local simulation.', 'warning'), ...current].slice(0, 10));
        }
      } finally {
        if (mounted) {
          setLoadingTrades(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWatchlist((current) => current.map((item, index) => {
        const volatility = item.volatility || 0.0025;
        const drift = (Math.random() - 0.5) * volatility + Math.sin((Date.now() / 1000 + index) / 9) * 0.00045;
        const price = Math.max(0.01, item.price * (1 + drift));
        return {
          ...item,
          price,
          volume: Math.round(item.volume * (1 + (Math.random() - 0.5) * 0.03)),
          spread: Math.max(0.01, item.spread * (1 + (Math.random() - 0.5) * 0.01)),
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

      if (Math.random() < 0.06) {
        setConnection((current) => (current === 'connected' ? 'syncing' : 'connected'));
      }
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  const addActivity = (message, tone = 'neutral') => {
    setActivity((current) => [createActivity(message, tone), ...current].slice(0, 10));
  };

  const addSymbol = () => {
    const symbol = String(customSymbol || '').trim().toUpperCase();
    if (!symbol) return;

    setWatchlist((current) => {
      if (current.some((item) => item.symbol === symbol)) {
        return current;
      }

      const starter = symbol.includes('USD') ? 140 : symbol.length > 4 ? 220 : 92;
      const next = {
        symbol,
        name: symbol,
        price: starter,
        openPrice: starter,
        spread: Math.max(0.08, starter * 0.003),
        volume: 12400,
        volatility: 0.003,
      };
      return [...current, next];
    });

    setSelectedSymbol(symbol);
    setCustomSymbol('');
    addActivity(`Added ${symbol} to the watchlist.`, 'good');
  };

  const removeSymbol = (symbol) => {
    setWatchlist((current) => {
      const next = current.filter((item) => item.symbol !== symbol);
      if (!next.length) {
        return current;
      }
      if (selectedSymbol === symbol) {
        setSelectedSymbol(next[0].symbol);
      }
      return next;
    });
    addActivity(`Removed ${symbol} from the watchlist.`, 'warning');
  };

  const updateTicket = (field, value) => {
    setTicket((current) => ({ ...current, [field]: value }));
  };

  const executionPrice = ticket.type === 'limit'
    ? Number(ticket.limitPrice || selectedAsset.price)
    : selectedAsset.price;
  const quantity = Math.max(Number(ticket.qty || 0), 0);
  const notional = executionPrice * quantity;
  const projectedBalance = ticket.side === 'buy'
    ? Math.max(0, balance - notional)
    : balance + notional;
  const fee = notional * 0.0004;

  const placeOrder = async () => {
    const qty = Number(ticket.qty);
    if (!qty || qty <= 0) {
      setStatusMessage('Enter a valid quantity before placing the order.');
      return;
    }

    if (ticket.type === 'limit' && !ticket.limitPrice) {
      setStatusMessage('Limit orders need a limit price.');
      return;
    }

    const orderPrice = ticket.type === 'limit' ? Number(ticket.limitPrice) : selectedAsset.price;
    if (!orderPrice || orderPrice <= 0) {
      setStatusMessage('Order price must be greater than zero.');
      return;
    }

    const orderNotional = orderPrice * qty;
    if (ticket.side === 'buy' && orderNotional > balance) {
      setStatusMessage('Not enough virtual cash for this buy order.');
      return;
    }

    const payload = {
      asset: selectedAsset.symbol,
      side: ticket.side,
      type: ticket.type,
      price: orderPrice,
      qty,
      sl: ticket.stopLoss ? Number(ticket.stopLoss) : null,
      tp: ticket.takeProfit ? Number(ticket.takeProfit) : null,
      riskPct: ticket.riskPct ? Number(ticket.riskPct) : null,
    };

    setStatusMessage('Submitting order to the trade archive...');
    try {
      const response = await api.post('/api/trades', payload);
      const record = normalizeTradeRow(response?.data?.trade || { ...payload, created_at: new Date().toISOString() });
      const createdAt = record.created_at || new Date().toISOString();

      const nextTrade = {
        ...record,
        entryPrice: orderPrice,
        status: 'open',
        time: createdAt,
        created_at: createdAt,
      };

      setOpenTrades((current) => [nextTrade, ...current]);
      setBalance((current) => (ticket.side === 'buy' ? Math.max(0, current - orderNotional) : current + orderNotional));
      setStatusMessage(`${ticket.side.toUpperCase()} ${formatNumber(qty, 3)} ${selectedAsset.symbol} staged successfully.`);
      addActivity(`${ticket.side.toUpperCase()} ${formatNumber(qty, 3)} ${selectedAsset.symbol} @ ${formatMoney(orderPrice)}.`, ticket.side === 'buy' ? 'good' : 'warning');
    } catch (error) {
      setStatusMessage('Order failed. The backend may be offline or the token expired.');
      addActivity('Order rejected by the archive service.', 'warning');
    }
  };

  const closeTrade = (tradeId) => {
    const trade = openTrades.find((item) => item.id === tradeId || item.tradeId === tradeId);
    if (!trade) return;

    const marketPrice = quoteMap[trade.asset]?.price ?? selectedAsset.price;
    const qty = Number(trade.qty) || 0;
    const entry = Number(trade.entryPrice) || marketPrice;
    const pnl = trade.side === 'buy' ? (marketPrice - entry) * qty : (entry - marketPrice) * qty;
    const cashDelta = trade.side === 'buy' ? marketPrice * qty : -marketPrice * qty;

    setBalance((current) => Math.max(0, current + cashDelta));
    setOpenTrades((current) => current.map((item) => {
      if (item.id !== tradeId && item.tradeId !== tradeId) {
        return item;
      }

      return {
        ...item,
        status: 'closed',
        exitPrice: marketPrice,
        pnl,
        closedAt: new Date().toISOString(),
      };
    }));
    setStatusMessage(`${trade.asset} closed at ${formatMoney(marketPrice)} for ${formatMoney(pnl)} P/L.`);
    addActivity(`Closed ${trade.asset} trade and realized ${formatMoney(pnl)}.`, pnl >= 0 ? 'good' : 'warning');
  };

  const clearDesk = () => {
    setBalance(START_BALANCE);
    setOpenTrades((current) => current.map((trade) => ({ ...trade, status: 'closed', exitPrice: trade.entryPrice || selectedAsset.price, pnl: 0, closedAt: new Date().toISOString() })));
    setActivity([createActivity('Desk reset to the default $10,000 paper balance.', 'good')]);
    setStatusMessage('Desk reset.');
  };

  return (
    <PremiumShell title="Live Trading" subtitle="Interactive paper desk with a $10,000 virtual account">
      <div className="live-desk">
        <section className="live-hero card">
          <div className="live-hero-copy">
            <p className="kicker">Virtual execution / institutional layout</p>
            <h2>$10,000 paper desk</h2>
          </div>

          <div className="live-hero-actions">
            <MetricCard label="Virtual cash" value={formatMoney(balance)} hint="Starting capital: $10,000" tone={balance >= START_BALANCE ? 'good' : 'warning'} />
            <MetricCard label="Open P/L" value={formatMoney(openPnl)} hint={`${openCount} open / ${closedCount} closed`} tone={openPnl >= 0 ? 'good' : 'warning'} />
            <MetricCard label="Paper equity" value={formatMoney(totalValue)} hint={statusMessage} tone={totalValue >= START_BALANCE ? 'good' : 'warning'} />
          </div>
        </section>

        <section className="live-grid">
          <aside className="live-sidebar">
            <div className="card live-stack">
              <div className="section-head">
                <div>
                  <p className="kicker">Watchlist</p>
                  <h3>Market board</h3>
                </div>
                <span className={`status-pill ${connection === 'connected' ? 'good' : 'warning'}`}>{connection}</span>
              </div>

              <div className="live-input-row">
                <input
                  value={customSymbol}
                  onChange={(event) => setCustomSymbol(event.target.value)}
                  placeholder="Add symbol"
                />
                <button className="nav-btn" type="button" onClick={addSymbol}>Add</button>
              </div>

              <div className="live-watchlist">
                {watchlist.map((asset) => {
                  const changePct = ((asset.price - asset.openPrice) / asset.openPrice) * 100;
                  const isActive = asset.symbol === selectedSymbol;
                  return (
                    <div
                      key={asset.symbol}
                      role="button"
                      tabIndex={0}
                      className={`watch-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedSymbol(asset.symbol);
                        }
                      }}
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
                        <button
                          className="watch-remove"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeSymbol(asset.symbol);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="market-summary">
                <div className="market-summary-row">
                  <span>Selected</span>
                  <strong>{selectedAsset.symbol}</strong>
                </div>
                <div className="market-summary-row">
                  <span>Spread</span>
                  <strong>{formatMoney(selectedAsset.spread)}</strong>
                </div>
                <div className="market-summary-row">
                  <span>Volume</span>
                  <strong>{formatNumber(selectedAsset.volume, 0)}</strong>
                </div>
                <div className="market-summary-row">
                  <span>Trend</span>
                  <strong className={historyTrend >= 0 ? 'good' : 'bad'}>{formatPercent(historyTrend)}</strong>
                </div>
              </div>
            </div>
          </aside>

          <main className="live-main">
            <div className="card live-chart-card">
              <div className="live-chart-head">
                <div>
                  <p className="kicker">Market tape</p>
                  <h3>{selectedAsset.symbol} <span>{selectedAsset.name}</span></h3>
                  <p className="live-price">{formatMoney(history[history.length - 1]?.close || selectedAsset.price)}</p>
                </div>

                <div className="live-chart-meta">
                  <div className="live-chart-badge">{connection === 'connected' ? 'Connected' : 'Syncing'}</div>
                  <div className={`live-trend ${historyTrend >= 0 ? 'positive' : 'negative'}`}>{formatPercent(historyTrend)}</div>
                </div>
              </div>

              <div className="live-timeframes">
                {TIMEFRAMES.map((frame) => (
                  <PillButton
                    key={frame}
                    active={frame === timeframe}
                    onClick={() => setTimeframe(frame)}
                  >
                    {frame}
                  </PillButton>
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
                  <path d={historyGeometry.area} fill="url(#liveChartFill)" />
                  <polyline
                    points={historyGeometry.line}
                    fill="none"
                    stroke="url(#liveChartStroke)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="live-chart-grid" />
              </div>

              <div className="live-analytics">
                <div className="analysis-tile">
                  <span>Session range</span>
                  <strong>{formatMoney(historyGeometry.min)} - {formatMoney(historyGeometry.max)}</strong>
                </div>
                <div className="analysis-tile">
                  <span>Selected exposure</span>
                  <strong>{formatMoney(selectedAsset.price * quantity)}</strong>
                </div>
                <div className="analysis-tile">
                  <span>Execution fee</span>
                  <strong>{formatMoney(fee)}</strong>
                </div>
                <div className="analysis-tile">
                  <span>Projected cash</span>
                  <strong>{formatMoney(projectedBalance)}</strong>
                </div>
              </div>
            </div>

            <div className="card live-table-card">
              <div className="section-head">
                <div>
                  <p className="kicker">Trade archive</p>
                  <h3>Recent fills</h3>
                </div>
                <span className="muted">{loadingTrades ? 'Loading...' : `${openTrades.length} records`}</span>
              </div>

              <div className="table-wrap live-table-wrap">
                <table className="live-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Asset</th>
                      <th>Side</th>
                      <th>Qty</th>
                      <th>Entry</th>
                      <th>P/L</th>
                      <th>Time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.slice(0, 8).map((trade) => {
                      const marketPrice = quoteMap[trade.asset]?.price ?? selectedAsset.price;
                      const entry = Number(trade.entryPrice) || marketPrice;
                      const qty = Number(trade.qty) || 0;
                      const pnl = trade.status === 'closed'
                        ? Number(trade.pnl) || 0
                        : trade.side === 'buy'
                          ? (marketPrice - entry) * qty
                          : (entry - marketPrice) * qty;

                      return (
                        <tr key={trade.id}>
                          <td>{String(trade.id).slice(-6)}</td>
                          <td>{trade.asset}</td>
                          <td className={trade.side === 'buy' ? 'good' : 'bad'}>{trade.side}</td>
                          <td>{formatNumber(qty, 3)}</td>
                          <td>{formatMoney(entry)}</td>
                          <td className={pnl >= 0 ? 'good' : 'bad'}>{formatMoney(pnl)}</td>
                          <td>{formatTradeTime(trade)}</td>
                          <td>
                            {trade.status === 'open' ? (
                              <button className="nav-btn" type="button" onClick={() => closeTrade(trade.id)}>Close</button>
                            ) : (
                              <span className="status-pill neutral">Closed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          <aside className="live-ticket-column">
            <div className="card live-ticket-card trade-panel">
              <div className="section-head">
                <div>
                  <p className="kicker">Order ticket</p>
                  <h3>Stage a paper trade</h3>
                </div>
                <span className={`status-pill ${connection === 'connected' ? 'good' : 'warning'}`}>{connection}</span>
              </div>

              <div className="trade-controls">
                <div className="trade-type-tabs">
                  <button
                    type="button"
                    className={`trade-tab ${ticket.side === 'buy' ? 'active buy' : ''}`}
                    onClick={() => updateTicket('side', 'buy')}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className={`trade-tab ${ticket.side === 'sell' ? 'active sell' : ''}`}
                    onClick={() => updateTicket('side', 'sell')}
                  >
                    Sell
                  </button>
                </div>

                <div className="trade-type-tabs">
                  {ORDER_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`trade-tab ${ticket.type === type ? 'active' : ''}`}
                      onClick={() => updateTicket('type', type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="form-field">
                  <label>Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={ticket.qty}
                    onChange={(event) => updateTicket('qty', event.target.value)}
                  />
                  <div className="quick-size-row">
                    {QUICK_SIZES.map((size) => (
                      <button key={size} type="button" className="live-pill" onClick={() => updateTicket('qty', String(size))}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {ticket.type === 'limit' ? (
                  <div className="form-field">
                    <label>Limit price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ticket.limitPrice}
                      placeholder={formatMoney(selectedAsset.price)}
                      onChange={(event) => updateTicket('limitPrice', event.target.value)}
                    />
                  </div>
                ) : (
                  <div className="trade-summary">
                    <div className="summary-row">
                      <span>Execution price</span>
                      <strong>{formatMoney(selectedAsset.price)}</strong>
                    </div>
                  </div>
                )}

                <div className="live-grid-two">
                  <div className="form-field">
                    <label>Stop loss</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ticket.stopLoss}
                      onChange={(event) => updateTicket('stopLoss', event.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Take profit</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ticket.takeProfit}
                      onChange={(event) => updateTicket('takeProfit', event.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Risk %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={ticket.riskPct}
                    onChange={(event) => updateTicket('riskPct', event.target.value)}
                  />
                </div>

                <div className="trade-summary">
                  <div className="summary-row">
                    <span>Notional</span>
                    <strong>{formatMoney(notional)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Projected cash</span>
                    <strong>{formatMoney(projectedBalance)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Risk budget</span>
                    <strong>{formatMoney(balance * (Number(ticket.riskPct || 0) / 100))}</strong>
                  </div>
                </div>

                <div className="live-actions">
                  <button className={`trade-btn ${ticket.side}`} type="button" onClick={placeOrder}>
                    Place {ticket.side === 'buy' ? 'Buy' : 'Sell'} Order
                  </button>
                  <button
                    className="nav-btn"
                    type="button"
                    onClick={() => {
                      setTicket({ side: 'buy', type: 'market', qty: '0.02', limitPrice: '', stopLoss: '', takeProfit: '', riskPct: '1.5' });
                      setStatusMessage('Order ticket cleared.');
                    }}
                  >
                    Reset
                  </button>
                </div>

                <p className="live-status">{statusMessage}</p>
              </div>
            </div>

            <div className="card live-ticket-card live-activity-card">
              <div className="section-head">
                <div>
                  <p className="kicker">Order flow</p>
                  <h3>Activity stream</h3>
                </div>
                <button className="nav-btn" type="button" onClick={clearDesk}>Reset desk</button>
              </div>

              <div className="activity-list">
                {activity.map((item) => (
                  <div key={item.id} className={`activity-item ${item.tone}`}>
                    <div>
                      <strong>{item.message}</strong>
                      <span>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </PremiumShell>
  );
}
