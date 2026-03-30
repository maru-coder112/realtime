function generateMockCandles({ symbol = 'BTCUSDT', days = 120, startPrice = 30000 }) {
  const data = [];
  let currentPrice = startPrice;

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dailyMove = (Math.random() - 0.5) * 0.06;
    const open = currentPrice;
    const close = open * (1 + dailyMove);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = 500 + Math.random() * 1500;

    currentPrice = close;

    data.push({
      symbol,
      timestamp: date.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      interval: '1d',
    });
  }

  return data;
}

module.exports = {
  generateMockCandles,
};
