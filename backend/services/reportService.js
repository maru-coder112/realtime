function convertBacktestToCsv(backtest) {
  const metricsRows = Object.entries(backtest.metrics).filter(([, v]) => !Array.isArray(v));
  const lines = ['section,key,value'];

  for (const [key, value] of metricsRows) {
    lines.push(`metrics,${key},${value}`);
  }

  for (const trade of backtest.trades || []) {
    lines.push(`trade,type,${trade.type}`);
    lines.push(`trade,timestamp,${trade.timestamp}`);
    lines.push(`trade,price,${trade.price}`);
    lines.push(`trade,pnl,${trade.pnl || ''}`);
  }

  return lines.join('\n');
}

module.exports = {
  convertBacktestToCsv,
};
