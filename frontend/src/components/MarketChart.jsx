import { useEffect, useMemo, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, LineSeries, createChart } from 'lightweight-charts';
import api from '../services/api';
import { MARKET_SYMBOLS } from '../constants/markets';
import { useTheme } from '../context/ThemeContext';

const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i += 1) {
    if (i + 1 < period) continue;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j += 1) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function toCandlePoint(candle) {
  return {
    time: Math.floor(Number(candle.openTime) / 1000),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

function addCompatCandlestickSeries(chart, options) {
  if (typeof chart.addCandlestickSeries === 'function') {
    return chart.addCandlestickSeries(options);
  }

  if (typeof chart.addSeries === 'function') {
    return chart.addSeries(CandlestickSeries, options);
  }

  throw new Error('Unsupported lightweight-charts version: no candlestick API found');
}

function addCompatLineSeries(chart, options) {
  if (typeof chart.addLineSeries === 'function') {
    return chart.addLineSeries(options);
  }

  if (typeof chart.addSeries === 'function') {
    return chart.addSeries(LineSeries, options);
  }

  throw new Error('Unsupported lightweight-charts version: no line API found');
}

export default function MarketChart({ selectedSymbol, onSymbolChange }) {
  const { isDark } = useTheme();
  const [symbol, setSymbol] = useState(selectedSymbol || MARKET_SYMBOLS[0].value);
  const [interval, setChartInterval] = useState('1h');
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [hoverData, setHoverData] = useState(null);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const ma7Ref = useRef(null);
  const ma25Ref = useRef(null);
  const ma99Ref = useRef(null);

  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== symbol) {
      setSymbol(selectedSymbol);
    }
  }, [selectedSymbol, symbol]);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      try {
        const { data } = await api.get('/api/market/history', {
          params: { symbol, interval, limit: 120 },
        });
        if (mounted) {
          setCandles(data.candles || []);
          setLastUpdated(new Date());
          setErrorText('');
        }
      } catch (error) {
        if (mounted) {
          setCandles([]);
          setErrorText(error.response?.data?.message || 'Unable to load market history right now.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchHistory();
    const timer = window.setInterval(fetchHistory, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [symbol, interval]);

  const candleData = useMemo(() => candles.map(toCandlePoint), [candles]);
  const closeSeries = useMemo(() => candleData.map((c) => c.close), [candleData]);
  const highSeries = useMemo(() => candleData.map((c) => c.high), [candleData]);
  const lowSeries = useMemo(() => candleData.map((c) => c.low), [candleData]);
  const ma7 = useMemo(() => calculateMA(candleData, 7), [candleData]);
  const ma25 = useMemo(() => calculateMA(candleData, 25), [candleData]);
  const ma99 = useMemo(() => calculateMA(candleData, 99), [candleData]);
  const volumeSeries = useMemo(() => candles.map((c) => c.volume), [candles]);
  const firstPrice = closeSeries[0] || 0;
  const lastPrice = closeSeries[closeSeries.length - 1] || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePct = firstPrice ? (priceChange / firstPrice) * 100 : 0;
  const isUp = priceChange >= 0;
  const sessionHigh = highSeries.length ? Math.max(...highSeries) : 0;
  const sessionLow = lowSeries.length ? Math.min(...lowSeries) : 0;
  const totalVolume = volumeSeries.reduce((sum, v) => sum + Number(v || 0), 0);
  const latestCandle = candleData[candleData.length - 1] || null;

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0f131c' : '#ffffff' },
        textColor: isDark ? '#b7c5db' : '#1f2937',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(120, 140, 170, 0.15)' : 'rgba(55, 65, 81, 0.12)' },
        horzLines: { color: isDark ? 'rgba(120, 140, 170, 0.15)' : 'rgba(55, 65, 81, 0.12)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(120, 140, 170, 0.35)' : 'rgba(55, 65, 81, 0.32)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(120, 140, 170, 0.35)' : 'rgba(55, 65, 81, 0.32)',
        timeVisible: true,
      },
      crosshair: {
        vertLine: { color: isDark ? 'rgba(246, 185, 59, 0.45)' : 'rgba(176, 123, 22, 0.55)' },
        horzLine: { color: isDark ? 'rgba(246, 185, 59, 0.45)' : 'rgba(176, 123, 22, 0.55)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 460,
    });

    const candlestickSeries = addCompatCandlestickSeries(chart, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderDownColor: '#f6465d',
      borderUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
    });

    const ma7Series = addCompatLineSeries(chart, { color: '#f0b94d', lineWidth: 2, priceLineVisible: false });
    const ma25Series = addCompatLineSeries(chart, { color: '#58db92', lineWidth: 2, priceLineVisible: false });
    const ma99Series = addCompatLineSeries(chart, { color: '#75a9ff', lineWidth: 2, priceLineVisible: false });

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }

      const c = param.seriesData.get(candlestickSeries);
      if (!c) {
        setHoverData(null);
        return;
      }

      setHoverData({
        time: Number(param.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      });
    });

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chart) {
        chart.applyOptions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(chartContainerRef.current);

    chartRef.current = chart;
    candleSeriesRef.current = candlestickSeries;
    ma7Ref.current = ma7Series;
    ma25Ref.current = ma25Series;
    ma99Ref.current = ma99Series;

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ma7Ref.current = null;
      ma25Ref.current = null;
      ma99Ref.current = null;
    };
  }, [isDark]);

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0f131c' : '#ffffff' },
        textColor: isDark ? '#b7c5db' : '#1f2937',
      },
      grid: {
        vertLines: { color: isDark ? 'rgba(120, 140, 170, 0.15)' : 'rgba(55, 65, 81, 0.12)' },
        horzLines: { color: isDark ? 'rgba(120, 140, 170, 0.15)' : 'rgba(55, 65, 81, 0.12)' },
      },
      rightPriceScale: {
        borderColor: isDark ? 'rgba(120, 140, 170, 0.35)' : 'rgba(55, 65, 81, 0.32)',
      },
      timeScale: {
        borderColor: isDark ? 'rgba(120, 140, 170, 0.35)' : 'rgba(55, 65, 81, 0.32)',
      },
    });
  }, [isDark]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    candleSeriesRef.current.setData(candleData);
    ma7Ref.current.setData(ma7);
    ma25Ref.current.setData(ma25);
    ma99Ref.current.setData(ma99);
    chartRef.current.timeScale().fitContent();
  }, [candleData, ma7, ma25, ma99]);

  return (
    <div className="card market-chart-card">
      <div className="row space-between wrap gap">
        <div>
          <h3 className="chart-title">{symbol}</h3>
          <p className={isUp ? 'status-good chart-price' : 'status-bad chart-price'}>
            ${lastPrice.toFixed(2)} ({isUp ? '+' : ''}{priceChange.toFixed(2)} / {isUp ? '+' : ''}{priceChangePct.toFixed(2)}%)
          </p>
          <div className="row gap wrap">
            <span className="chip high-chip">High: ${sessionHigh.toFixed(2)}</span>
            <span className="chip low-chip">Low: ${sessionLow.toFixed(2)}</span>
            <span className="chip">Volume: {totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="chip">MA7</span>
              <span className="chip">MA25</span>
              <span className="chip">MA99</span>
          </div>
          {!!latestCandle && (
            <div className="chart-mini-stats">
              <span>O {Number(latestCandle.open).toFixed(2)}</span>
              <span>H {Number(latestCandle.high).toFixed(2)}</span>
              <span>L {Number(latestCandle.low).toFixed(2)}</span>
              <span>C {Number(latestCandle.close).toFixed(2)}</span>
            </div>
          )}
          <p className="muted chart-live">
            <span className="live-dot" />
            Live updates every 5s
            {lastUpdated ? ` • ${lastUpdated.toLocaleTimeString()}` : ''}
          </p>
        </div>

        <div className="row gap controls-row">
          <select
            value={symbol}
            onChange={(e) => {
              const next = e.target.value;
              setSymbol(next);
              if (onSymbolChange) onSymbolChange(next);
            }}
          >
            {MARKET_SYMBOLS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <div className="interval-group">
            {intervals.map((item) => (
              <button
                key={item}
                type="button"
                className={item === interval ? 'interval-btn active' : 'interval-btn'}
                onClick={() => setChartInterval(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="market-chart-wrap">
        {loading && !candles.length && <p className="muted">Loading chart...</p>}
        {!loading && errorText && <p className="status-bad">{errorText}</p>}
        <div ref={chartContainerRef} className="candlestick-container" />
        {!!hoverData && (
          <div className="chart-tooltip">
            <p>{new Date(hoverData.time * 1000).toLocaleString()}</p>
            <p>O: {hoverData.open.toFixed(2)}</p>
            <p>H: {hoverData.high.toFixed(2)}</p>
            <p>L: {hoverData.low.toFixed(2)}</p>
            <p>C: {hoverData.close.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
