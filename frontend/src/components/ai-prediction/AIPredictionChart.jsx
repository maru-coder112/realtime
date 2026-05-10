import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, AreaSeries } from 'lightweight-charts';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

function addSeriesCompat(chart, SeriesType, options) {
  if (typeof chart.addSeries === 'function') {
    return chart.addSeries(SeriesType, options);
  }

  if (SeriesType === CandlestickSeries && typeof chart.addCandlestickSeries === 'function') {
    return chart.addCandlestickSeries(options);
  }

  if (SeriesType === LineSeries && typeof chart.addLineSeries === 'function') {
    return chart.addLineSeries(options);
  }

  if (SeriesType === HistogramSeries && typeof chart.addHistogramSeries === 'function') {
    return chart.addHistogramSeries(options);
  }

  if (SeriesType === AreaSeries && typeof chart.addAreaSeries === 'function') {
    return chart.addAreaSeries(options);
  }

  throw new Error('Unsupported lightweight-charts version');
}

function formatValue(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function AIPredictionChart({ chartPayload, prediction, indicatorState, loading }) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleRef = useRef(null);
  const ma20Ref = useRef(null);
  const ma50Ref = useRef(null);
  const forecastRef = useRef(null);
  const volumeRef = useRef(null);
  const [hoverPoint, setHoverPoint] = useState(null);

  const chartTheme = useMemo(() => ({
    background: { type: ColorType.Solid, color: isDark ? '#0b1120' : '#ffffff' },
    textColor: isDark ? '#c6d3e5' : '#1f2937',
    gridColor: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)',
    borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.12)',
  }), [isDark]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: chartTheme.background,
        textColor: chartTheme.textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: chartTheme.gridColor },
        horzLines: { color: chartTheme.gridColor },
      },
      rightPriceScale: {
        borderColor: chartTheme.borderColor,
      },
      timeScale: {
        borderColor: chartTheme.borderColor,
        timeVisible: true,
        rightOffset: 12,
      },
      crosshair: {
        vertLine: { color: 'rgba(14, 203, 129, 0.35)' },
        horzLine: { color: 'rgba(14, 203, 129, 0.35)' },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candles = addSeriesCompat(chart, CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderDownColor: '#f6465d',
      borderUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
    });
    const ma20 = addSeriesCompat(chart, LineSeries, {
      color: '#f0b94d',
      lineWidth: 2,
      priceLineVisible: false,
    });
    const ma50 = addSeriesCompat(chart, LineSeries, {
      color: '#6ea8fe',
      lineWidth: 2,
      priceLineVisible: false,
    });
    const forecast = addSeriesCompat(chart, LineSeries, {
      color: '#8ee6c7',
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
    });
    const forecastArea = addSeriesCompat(chart, AreaSeries, {
      lineColor: 'rgba(0, 200, 150, 0.96)',
      topColor: 'rgba(0, 200, 150, 0.28)',
      bottomColor: 'rgba(0, 200, 150, 0.02)',
      priceLineVisible: false,
      lastValueVisible: false,
      crossHairMarkerVisible: false,
    });
    const volume = addSeriesCompat(chart, HistogramSeries, {
      color: 'rgba(110, 168, 254, 0.28)',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoverPoint(null);
        return;
      }

      const candle = param.seriesData.get(candles);
      if (!candle) {
        setHoverPoint(null);
        return;
      }

      setHoverPoint({
        time: param.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    });

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        chart.applyOptions({
          width: Math.floor(entries[0].contentRect.width),
          height: Math.floor(entries[0].contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);

    chartRef.current = chart;
    candleRef.current = candles;
    ma20Ref.current = ma20;
    ma50Ref.current = ma50;
    forecastRef.current = { forecast, forecastArea };
    volumeRef.current = volume;

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      ma20Ref.current = null;
      ma50Ref.current = null;
      forecastRef.current = null;
      volumeRef.current = null;
    };
  }, [chartTheme]);

  useEffect(() => {
    if (!chartRef.current || !candleRef.current || !chartPayload?.candles?.length) return;

    candleRef.current.setData(chartPayload.candles);
    ma20Ref.current.applyOptions({ visible: Boolean(indicatorState.movingAverage) });
    ma50Ref.current.applyOptions({ visible: Boolean(indicatorState.movingAverage) });
    ma20Ref.current.setData(chartPayload.ma20);
    ma50Ref.current.setData(chartPayload.ma50);

    forecastRef.current.forecast.setData(chartPayload.forecast);
    forecastRef.current.forecastArea.setData(chartPayload.forecast);

    volumeRef.current.applyOptions({ visible: Boolean(indicatorState.volume) });
    volumeRef.current.setData(chartPayload.volume.map((item) => ({
      time: item.time,
      value: item.value,
      color: 'rgba(110, 168, 254, 0.32)',
    })));

    chartRef.current.timeScale().fitContent();
  }, [chartPayload, indicatorState]);

  return (
    <motion.div
      className="ai-chart-shell"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="ai-chart-topline">
        <div>
          <p className="kicker">Market Intelligence</p>
          <h3>Actual vs predicted price structure</h3>
        </div>
        <div className="ai-chart-legend">
          <span><i className="legend-dot actual" />Actual</span>
          <span><i className="legend-dot predicted" />Predicted</span>
          <span><i className="legend-dot area" />Projection</span>
        </div>
      </div>

      <div className="ai-chart-canvas-wrap">
        {loading && <div className="ai-chart-loading">Loading market intelligence...</div>}
        <div ref={containerRef} className="ai-chart-canvas" />
        {hoverPoint && (
          <div className="ai-chart-tooltip">
            <div className="tooltip-row"><span>Open</span><strong>${formatValue(hoverPoint.open)}</strong></div>
            <div className="tooltip-row"><span>High</span><strong>${formatValue(hoverPoint.high)}</strong></div>
            <div className="tooltip-row"><span>Low</span><strong>${formatValue(hoverPoint.low)}</strong></div>
            <div className="tooltip-row"><span>Close</span><strong>${formatValue(hoverPoint.close)}</strong></div>
          </div>
        )}
      </div>

      <div className="ai-chart-insights">
        <div className={`ai-mini-indicator ${indicatorState.rsi ? 'active' : ''}`}>
          <span>RSI</span>
          <strong>{prediction?.stats?.trend === 'Bullish' ? 'Momentum positive' : 'Momentum balanced'}</strong>
        </div>
        <div className={`ai-mini-indicator ${indicatorState.macd ? 'active' : ''}`}>
          <span>MACD</span>
          <strong>{prediction?.marketTrend || prediction?.trend || 'Neutral'}</strong>
        </div>
        <div className={`ai-mini-indicator ${indicatorState.atr ? 'active' : ''}`}>
          <span>ATR</span>
          <strong>{prediction?.riskLevel || 'Medium'} risk envelope</strong>
        </div>
      </div>
    </motion.div>
  );
}