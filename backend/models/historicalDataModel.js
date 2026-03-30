const pool = require('./db');

async function getHistoricalData(symbol, startDate, endDate, interval = '1d') {
  const query = `
    SELECT symbol, timestamp, open, high, low, close, volume, interval
    FROM historical_data
    WHERE symbol = $1
      AND interval = $2
      AND timestamp BETWEEN $3::timestamp AND $4::timestamp
    ORDER BY timestamp ASC
  `;
  const values = [symbol, interval, startDate, endDate];
  const { rows } = await pool.query(query, values);
  return rows.map((row) => ({
    ...row,
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume),
  }));
}

module.exports = {
  getHistoricalData,
};
