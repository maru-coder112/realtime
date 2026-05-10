import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { useTheme } from '../context/ThemeContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function PredictionChart({ result }) {
  const { isDark } = useTheme();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [vizMode, setVizMode] = useState('bar');

  useEffect(() => {
    if (!chartContainerRef.current || !result || !result.stats) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

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
        timeVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    // Build forecast data: 14 points from current baseline with momentum
    const baseValue = 100; // normalize to 100 as baseline
    const momentum = Number(result.stats.recentMomentumPct) || 0;
    const dailyChange = momentum / 14; // spread over 14 days

    const forecastData = [];
    for (let i = 0; i <= 14; i += 1) {
      const value = baseValue + dailyChange * i;
      forecastData.push({ time: i, value });
    }

    // Determine color based on trend
    const trendColor = result.stats.trend === 'Bullish' ? '#0ecb81' : 
                       result.stats.trend === 'Bearish' ? '#f87171' : '#f97316';

    const series = chart.addLineSeries({
      color: trendColor,
      lineWidth: 3,
      priceLineVisible: true,
      priceLineColor: trendColor,
    });

    series.setData(forecastData);
    chartRef.current = chart;
    seriesRef.current = series;

    // Add area fill
    try {
      const areaChart = chart.addAreaSeries({
        lineColor: trendColor,
        topColor: trendColor + '22',
        bottomColor: trendColor + '08',
        lineWidth: 0,
        priceLineVisible: false,
      });
      areaChart.setData(forecastData);
    } catch (e) {
      // area not supported in some versions
    }

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      if (entries[0] && chartRef.current) {
        chartRef.current.applyOptions({
          width: Math.floor(entries[0].contentRect.width),
        });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [isDark, result]);

  if (!result || !result.stats) return null;

  return (
    <div className="prediction-chart-wrap">
      <div className="prediction-chart-title">
        <h4>14-Day Forecast</h4>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          Momentum: {result.stats.recentMomentumPct.toFixed(2)}%
        </span>
      </div>
      <div ref={chartContainerRef} className="prediction-chart-container" />

      {/* Small prediction breakdown visualization */}
      <div className="prediction-breakdown mt-md">
        <div className="row gap">
          <div className="chip">Prediction</div>
          <div style={{ marginLeft: 'auto' }}>
            <button className={`btn-toggle ${vizMode === 'pie' ? 'active' : ''}`} onClick={() => setVizMode('pie')}>Pie</button>
            <button className={`btn-toggle ${vizMode === 'bar' ? 'active' : ''}`} onClick={() => setVizMode('bar')}>Bar</button>
          </div>
        </div>

        {(() => {
          // Build simple distribution: use explicit probabilities if provided, else use confidence
          const probs = result.probabilities || result.distribution;
          let labels = [];
          let dataVals = [];
          if (probs && typeof probs === 'object' && !Array.isArray(probs)) {
            labels = Object.keys(probs);
            dataVals = labels.map((k) => Math.max(0, Number(probs[k]) * 100));
          } else {
            const predicted = result.prediction || result.bias || 'Signal';
            const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0.65));
            labels = [predicted, 'Other'];
            dataVals = [Math.round(confidence * 100), Math.round((1 - confidence) * 100)];
          }

          const labelColorMap = {
            buy: '#0ecb81',
            bullish: '#0ecb81',
            sell: '#f87171',
            bearish: '#f87171',
            hold: '#f97316',
            neutral: '#9ca3af',
            increase: '#0ecb81',
            decrease: '#f87171',
          };

          const chartData = {
            labels,
            datasets: [
              {
                data: dataVals,
                backgroundColor: labels.map((l, i) => {
                  const key = String(l).toLowerCase();
                  return labelColorMap[key] || (i === 0 ? '#0ecb81' : '#e5e7eb');
                }),
                borderWidth: 0,
              },
            ],
          };

          const barOptions = {
            indexAxis: 'x',
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: isDark ? '#b7c5db' : '#1f2937' } }, y: { display: false } },
          };

          return vizMode === 'pie' ? <Pie data={chartData} /> : <Bar data={chartData} options={barOptions} />;
        })()}
      </div>
    </div>
  );
}
