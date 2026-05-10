import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const SAMPLE_ASSETS = [
  { symbol: 'BTCUSD', name: 'Bitcoin' },
  { symbol: 'ETHUSD', name: 'Ethereum' },
  { symbol: 'SOLUSD', name: 'Solana' },
  { symbol: 'AAPL', name: 'Apple' },
];

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }

export default function useLiveTrading() {
  const [assets, setAssets] = useState(SAMPLE_ASSETS);
  const [selected, setSelected] = useState(SAMPLE_ASSETS[0]);
  const [timeframe, setTimeframe] = useState('1m');
  const [connection, setConnection] = useState('connected');
  const [balance, setBalance] = useState(10000); // virtual USD
  const [prices, setPrices] = useState([]); // price series for chart
  const [indicators, setIndicators] = useState({ ma: true, rsi: false, macd: false });
  const [trades, setTrades] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // mock initial series
    const now = Date.now();
    const base = 48000;
    const series = Array.from({ length: 120 }).map((_, i) => ({
      time: Math.floor((now - (120 - i) * 60000) / 1000),
      open: base + Math.sin(i / 6) * 600 + (Math.random() - 0.5) * 200,
      high: base + Math.sin(i / 6) * 620 + (Math.random() - 0.5) * 250,
      low: base + Math.sin(i / 6) * 580 + (Math.random() - 0.5) * 250,
      close: base + Math.sin(i / 6) * 600 + (Math.random() - 0.5) * 200,
      volume: Math.round(200 + Math.random() * 800),
    }));
    setPrices(series);

    // fetch recent persisted trades for the user (if authenticated)
    (async () => {
      try {
        const resp = await api.get('/api/trades');
        if (resp?.data?.trades) {
          setTrades(resp.data.trades.map((r) => r.trade_data || r));
        }
      } catch (err) {
        // silent if unauthenticated or not available
      }
    })();
  }, []);

  useEffect(() => {
    // mock realtime ticks
    const t = setInterval(() => {
      setPrices((prev) => {
        const last = prev[prev.length - 1] || { close: 48000, time: Math.floor(Date.now()/1000) };
        const nextClose = Math.max(0.001, last.close * (1 + (Math.random() - 0.5) * 0.002));
        const next = {
          time: Math.floor(Date.now() / 1000),
          open: last.close,
          high: Math.max(last.close, nextClose) * (1 + Math.random() * 0.001),
          low: Math.min(last.close, nextClose) * (1 - Math.random() * 0.001),
          close: nextClose,
          volume: Math.round(150 + Math.random() * 600),
        };
        const out = prev.slice(-500).concat([next]);
        return out;
      });
      // occasional connection blip
      if (Math.random() < 0.002) {
        setConnection('reconnecting');
        setTimeout(() => setConnection('connected'), 1200 + Math.random() * 2400);
      }
    }, 1200);
    return () => clearInterval(t);
  }, []);

  const placeTrade = useCallback(async ({ side, type, price, qty, sl, tp, riskPct, asset }) => {
    // call backend to persist trade (will require auth)
    const payload = { asset: asset || selected.symbol, side, type, price: price || null, qty, sl: sl || null, tp: tp || null, riskPct: riskPct || null };
    try {
      const resp = await api.post('/api/trades', payload);
      const serverRecord = resp?.data?.trade;
      // optimistic local update
      const local = {
        id: serverRecord?.trade_id || uid(),
        asset: payload.asset,
        side,
        type,
        entryPrice: payload.price || (prices[prices.length - 1]?.close ?? 0),
        qty,
        status: 'open',
        time: new Date().toISOString(),
      };
      setTrades((t) => [local, ...t]);
      setEvents((e) => [{ id: uid(), type: 'trade', text: `${side.toUpperCase()} ${qty} ${payload.asset} @ ${local.entryPrice.toFixed(2)}` }, ...e].slice(0, 80));
      // adjust balance for buys
      if (side === 'buy') {
        const notional = local.entryPrice * local.qty;
        setBalance((b) => Math.max(0, b - notional));
      }
      return local;
    } catch (err) {
      throw err;
    }
  }, [prices, selected]);

  const cancelTrade = useCallback((tradeId) => {
    setTrades((t) => t.map((r) => (r.id === tradeId ? { ...r, status: 'cancelled' } : r)));
  }, []);

  const addAsset = useCallback((symbol) => {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    setAssets((prev) => (prev.some((a) => a.symbol === sym) ? prev : [...prev, { symbol: sym, name: sym }]));
  }, []);

  const removeAsset = useCallback((symbol) => {
    const sym = typeof symbol === 'string' ? symbol : symbol?.symbol;
    if (!sym) return;
    setAssets((prev) => prev.filter((a) => a.symbol !== sym));
    setSelected((prev) => (prev?.symbol === sym ? SAMPLE_ASSETS[0] : prev));
  }, []);

  const setIndicator = (k, v) => setIndicators((s) => ({ ...s, [k]: v }));

  return {
    assets,
    selected,
    setSelected,
    onSelect: setSelected,
    onAdd: addAsset,
    onRemove: removeAsset,
    timeframe,
    setTimeframe,
    connection,
    balance,
    prices,
    indicators,
    setIndicator,
    trades,
    placeTrade,
    cancelTrade,
    events,
    setEvents,
  };
}
