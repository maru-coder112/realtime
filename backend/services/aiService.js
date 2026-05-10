const OpenAI = require('openai');

function avg(numbers) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function stdDev(numbers) {
  if (numbers.length < 2) return 0;
  const mean = avg(numbers);
  const variance = avg(numbers.map((n) => (n - mean) ** 2));
  return Math.sqrt(variance);
}

function computeSignalStats(candles) {
  const closes = candles.map((c) => Number(c.close));
  if (closes.length < 5) {
    return {
      totalReturnPct: 0,
      recentMomentumPct: 0,
      volatilityPct: 0,
      trend: 'Sideways',
      riskLevel: 'Medium',
      confidence: 0.52,
    };
  }

  const first = closes[0];
  const last = closes[closes.length - 1];
  const totalReturnPct = first === 0 ? 0 : ((last - first) / first) * 100;

  const lookback = Math.min(7, closes.length - 1);
  const recentBase = closes[closes.length - 1 - lookback];
  const recentMomentumPct = recentBase === 0 ? 0 : ((last - recentBase) / recentBase) * 100;

  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    const prev = closes[i - 1];
    if (prev === 0) continue;
    returns.push((closes[i] - prev) / prev);
  }

  const volatilityPct = stdDev(returns) * 100;

  let trend = 'Sideways';
  if (totalReturnPct > 2 && recentMomentumPct > 0.5) trend = 'Bullish';
  else if (totalReturnPct < -2 && recentMomentumPct < -0.5) trend = 'Bearish';

  let riskLevel = 'Low';
  if (volatilityPct >= 2.2) riskLevel = 'High';
  else if (volatilityPct >= 1.1) riskLevel = 'Medium';

  // Confidence rewards directional consistency and penalizes high volatility.
  const directionScore = Math.min(Math.abs(totalReturnPct) / 12, 1) * 0.22;
  const momentumScore = Math.min(Math.abs(recentMomentumPct) / 6, 1) * 0.18;
  const volPenalty = Math.min(volatilityPct / 5, 1) * 0.2;
  const confidence = Math.min(Math.max(0.5 + directionScore + momentumScore - volPenalty, 0.4), 0.88);

  return {
    totalReturnPct,
    recentMomentumPct,
    volatilityPct,
    trend,
    riskLevel,
    confidence,
  };
}

function buildHeuristicInsight(candles, symbol) {
  const stats = computeSignalStats(candles);
  const symbolName = symbol === 'ETHUSDT' ? 'ETH' : 'BTC';

  let recommendation = 'Hold / wait for clearer setup';
  if (stats.trend === 'Bullish' && stats.riskLevel !== 'High') recommendation = 'Buy on pullbacks with stop-loss';
  if (stats.trend === 'Bearish') recommendation = 'Reduce long exposure and wait for trend reversal';
  if (stats.trend === 'Sideways' && stats.riskLevel === 'Low') recommendation = 'Range-trade with tight risk controls';

  const catalysts = [
    `${symbolName} 30-day return: ${stats.totalReturnPct.toFixed(2)}%`,
    `Recent momentum (last ${Math.min(7, candles.length - 1)} periods): ${stats.recentMomentumPct.toFixed(2)}%`,
  ];

  const risks = [
    `Realized volatility estimate: ${stats.volatilityPct.toFixed(2)}%`,
    'Rapid sentiment shifts can invalidate short-term setups.',
  ];

  return {
    prediction: `${symbolName} currently shows a ${stats.trend.toLowerCase()} structure with ${stats.riskLevel.toLowerCase()} risk conditions.`,
    summary: `${symbolName} trend is ${stats.trend}. Volatility is ${stats.volatilityPct.toFixed(2)}%, so risk is ${stats.riskLevel}.`,
    bias: stats.trend,
    marketTrend: stats.trend,
    riskLevel: stats.riskLevel,
    recommendation,
    confidence: Number(stats.confidence.toFixed(2)),
    catalysts,
    risks,
    actionPlan: [
      'Risk only 1-2% of capital per trade.',
      'Use stop-loss below recent swing low for longs (or above swing high for shorts).',
      'Re-check trend and volatility before new entries.',
    ],
  };
}

async function getAiPrediction(candles, symbol = 'BTCUSDT') {
  const fallback = buildHeuristicInsight(candles, symbol);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stats = computeSignalStats(candles);
  const prompt = `Analyze this 30-day close-price series for ${symbol}. Return concise JSON using the schema. Include marketTrend (Bullish/Bearish/Sideways), riskLevel (Low/Medium/High), and recommendation (short actionable sentence). Use these computed hints: totalReturnPct=${stats.totalReturnPct.toFixed(
    2
  )}, recentMomentumPct=${stats.recentMomentumPct.toFixed(2)}, volatilityPct=${stats.volatilityPct.toFixed(
    2
  )}. Price series: ${JSON.stringify(
    candles.map((c) => ({ date: c.timestamp, close: c.close }))
  )}`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a financial analysis assistant.' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'prediction_response',
        schema: {
          type: 'object',
          properties: {
            prediction: { type: 'string' },
            summary: { type: 'string' },
            bias: { type: 'string' },
            marketTrend: { type: 'string' },
            riskLevel: { type: 'string' },
            recommendation: { type: 'string' },
            confidence: { type: 'number' },
            catalysts: {
              type: 'array',
              items: { type: 'string' },
            },
            risks: {
              type: 'array',
              items: { type: 'string' },
            },
            actionPlan: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: [
            'prediction',
            'summary',
            'bias',
            'marketTrend',
            'riskLevel',
            'recommendation',
            'confidence',
            'catalysts',
            'risks',
            'actionPlan',
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return fallback;

  const parsed = JSON.parse(content);
  const safeConfidence = Number(parsed.confidence);
  const base = {
    prediction: parsed.prediction || fallback.prediction,
    summary: parsed.summary || fallback.summary,
    bias: parsed.bias || fallback.bias,
    marketTrend: parsed.marketTrend || fallback.marketTrend,
    riskLevel: parsed.riskLevel || fallback.riskLevel,
    recommendation: parsed.recommendation || fallback.recommendation,
    confidence: Number.isFinite(safeConfidence) ? Math.min(Math.max(safeConfidence, 0), 1) : fallback.confidence,
    catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : fallback.catalysts,
    risks: Array.isArray(parsed.risks) ? parsed.risks : fallback.risks,
    actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : fallback.actionPlan,
  };

  return {
    ...base,
    stats,
  };
}

module.exports = {
  getAiPrediction,
};
