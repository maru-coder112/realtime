function calculateMaxDrawdown(equityCurve) {
  let peak = equityCurve[0] || 0;
  let maxDrawdown = 0;

  for (const value of equityCurve) {
    if (value > peak) peak = value;
    const drawdown = peak === 0 ? 0 : (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return Number((maxDrawdown * 100).toFixed(2));
}

function calculateSharpeRatio(returns, riskFreeRate = 0) {
  if (!returns.length) return 0;
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return Number((((avgReturn - riskFreeRate) / stdDev) * Math.sqrt(252)).toFixed(2));
}

module.exports = {
  calculateMaxDrawdown,
  calculateSharpeRatio,
};
