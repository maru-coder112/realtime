import { useState } from 'react';
import api from '../services/api';
import { MARKET_SYMBOLS } from '../constants/markets';
import PredictionChart from './PredictionChart';
import { useNotifications } from '../context/NotificationContext';

export default function AIPredictionWidget({ selectedSymbol, onSymbolChange }) {
  const { notify } = useNotifications();
  const [symbol, setSymbol] = useState(selectedSymbol || MARKET_SYMBOLS[0].value);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeSymbol = selectedSymbol || symbol;

  const handleSymbolChange = (value) => {
    if (onSymbolChange) {
      onSymbolChange(value);
      return;
    }
    setSymbol(value);
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/ai/predict', { symbol: activeSymbol });
      setResult(data);
      notify({
        title: 'AI prediction ready',
        message: `Analysis for ${activeSymbol} completed successfully.`,
        variant: 'success',
        kind: 'ai',
      });
    } catch (error) {
      notify({
        title: 'Prediction failed',
        message: error.response?.data?.message || 'Prediction failed',
        variant: 'error',
        kind: 'ai',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card ai-detail-card">
      <h3>AI Insight</h3>
      <div className="row gap wrap">
        <select value={activeSymbol} onChange={(e) => handleSymbolChange(e.target.value)}>
          {MARKET_SYMBOLS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <button onClick={handlePredict} disabled={loading}>
          {loading ? 'Analyzing...' : 'Predict'}
        </button>
      </div>

      {result && (
        <div className="ai-detail-body-full">
          <div className="ai-forecast-section">
            <PredictionChart result={result} />
          </div>

          <p className="ai-summary mt-md">{result.summary || result.prediction}</p>

          <div className="ai-metrics-grid mt-md">
            <div className="metric-col">
              <h4>Detailed Metrics</h4>
              <div className="row gap wrap">
                <span className="chip">30d return: {result.stats ? result.stats.totalReturnPct.toFixed(2) + '%' : 'N/A'}</span>
                <span className="chip">Momentum: {result.stats ? result.stats.recentMomentumPct.toFixed(2) + '%' : 'N/A'}</span>
                <span className="chip">Volatility: {result.stats ? result.stats.volatilityPct.toFixed(2) + '%' : 'N/A'}</span>
                <span className="chip">Trend: {result.stats ? result.stats.trend : result.marketTrend}</span>
              </div>
            </div>
            <div className="metric-col">
              <h4>Assessment</h4>
              <div className="row gap wrap">
                <span className="chip">Bias: {result.bias || 'Neutral'}</span>
                <span className="chip">Trend: {result.marketTrend || result.bias || 'Sideways'}</span>
                <span className="chip">Risk: {result.riskLevel || 'Medium'}</span>
                <span className="chip">Confidence: {(Number(result.confidence) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="ai-columns-full mt-md">
            <div className="col-section">
              <h4>Recommendation</h4>
              <p>{result.recommendation || 'Wait for stronger confirmation before entering.'}</p>
            </div>

            <div className="col-section">
              <h4>Catalysts</h4>
              <ul>
                {(result.catalysts || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="col-section">
              <h4>Risks</h4>
              <ul>
                {(result.risks || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="col-section">
              <h4>Action Plan</h4>
              <ul>
                {(result.actionPlan || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {(result.comparables && result.comparables.length > 0) && (
            <div className="mt-lg">
              <h4>Comparable Symbols by Correlation</h4>
              <div className="comparables-chips">
                {result.comparables.map((sym) => (
                  <span key={sym} className="chip">{sym}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
