import { useState } from 'react';
import api from '../services/api';
import { MARKET_SYMBOLS } from '../constants/markets';

export default function AIPredictionWidget({ selectedSymbol, onSymbolChange }) {
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
    } catch (error) {
      alert(error.response?.data?.message || 'Prediction failed');
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
        <div className="mt-sm ai-detail-body">
          <p className="ai-summary">{result.summary || result.prediction}</p>
          <div className="row gap wrap mt-sm">
            <span className="chip">Bias: {result.bias || 'Neutral'}</span>
            <span className="chip">Trend: {result.marketTrend || result.bias || 'Sideways'}</span>
            <span className="chip">Risk: {result.riskLevel || 'Medium'}</span>
            <span className="chip">Confidence: {(Number(result.confidence) * 100).toFixed(1)}%</span>
          </div>

          <div className="mt-sm">
            <h4>Recommendation</h4>
            <p>{result.recommendation || 'Wait for stronger confirmation before entering.'}</p>
          </div>

          <div className="ai-columns mt-sm">
            <div>
              <h4>Catalysts</h4>
              <ul>
                {(result.catalysts || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4>Risks</h4>
              <ul>
                {(result.risks || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-sm">
            <h4>Action Plan</h4>
            <ul>
              {(result.actionPlan || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
