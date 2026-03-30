export default function MetricsTable({ metrics, compact = false }) {
  if (!metrics) return null;

  const items = [
    ['Initial Capital', metrics.initialCapital],
    ['Final Equity', metrics.finalEquity],
    ['Total Return (%)', metrics.totalReturn],
    ['Win Rate (%)', metrics.winRate],
    ['Total Trades', metrics.totalTrades],
    ['Average Trade PnL', metrics.averageTradePnl],
    ['Profit Factor', metrics.profitFactor],
    ['Expectancy', metrics.expectancy],
    ['Max Drawdown (%)', metrics.maxDrawdown],
    ['Sharpe Ratio', metrics.sharpeRatio],
  ];

  return (
    <div className={compact ? '' : 'card'}>
      <h3>Backtest Metrics</h3>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {items.map(([label, value]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={label.includes('Return') && Number(value) < 0 ? 'status-bad' : 'status-good'}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
