const backtestModel = require('../models/backtestModel');
const { convertBacktestToCsv } = require('../services/reportService');

async function getBacktestById(req, res) {
  const backtest = req.user.role === 'admin'
    ? await backtestModel.getBacktestByIdAnyUser(req.params.id)
    : await backtestModel.getBacktestById(req.params.id, req.user.id);

  if (!backtest) {
    return res.status(404).json({ message: 'Backtest result not found' });
  }

  return res.json(backtest);
}

async function exportBacktestReport(req, res) {
  const backtest = req.user.role === 'admin'
    ? await backtestModel.getBacktestByIdAnyUser(req.params.id)
    : await backtestModel.getBacktestById(req.params.id, req.user.id);

  if (!backtest) {
    return res.status(404).json({ message: 'Backtest result not found' });
  }

  const format = req.query.format || 'csv';
  if (format !== 'csv') {
    return res.status(400).json({ message: 'Only csv format is supported' });
  }

  const csv = convertBacktestToCsv(backtest);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=backtest-${backtest.id}.csv`);
  return res.send(csv);
}

module.exports = {
  getBacktestById,
  exportBacktestReport,
};
