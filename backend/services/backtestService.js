const { calculateMaxDrawdown, calculateSharpeRatio } = require('../utils/math');

function movingAverage(values, period, index) {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i += 1) {
    sum += values[i];
  }
  return sum / period;
}

function runSmaCrossoverBacktest(candles, parameters = {}) {
  const shortWindow = Number(parameters.shortWindow || 5);
  const longWindow = Number(parameters.longWindow || 20);
  const initialCapital = Number(parameters.initialCapital || 10000);
  const stopLossPct = Math.max(Number(parameters.stopLossPct || 3), 0);
  const takeProfitPct = Math.max(Number(parameters.takeProfitPct || 8), 0);
  const feeRate = Math.max(Number(parameters.feeRate || 0.1), 0);

  let cash = initialCapital;
  let position = 0;
  let entryPrice = 0;
  let entryFee = 0;
  const trades = [];
  const closePrices = candles.map((c) => c.close);
  const equityCurve = [];
  const dailyReturns = [];

  for (let i = 0; i < candles.length; i += 1) {
    const candle = candles[i];
    const shortMA = movingAverage(closePrices, shortWindow, i);
    const longMA = movingAverage(closePrices, longWindow, i);

    if (!shortMA || !longMA) {
      const equity = cash + position * candle.close;
      equityCurve.push(equity);
      continue;
    }

    const previousEquity = equityCurve[equityCurve.length - 1] || initialCapital;
    const pnlPct = entryPrice ? ((candle.close - entryPrice) / entryPrice) * 100 : 0;
    const riskExit = position > 0 && ((stopLossPct > 0 && pnlPct <= -stopLossPct) || (takeProfitPct > 0 && pnlPct >= takeProfitPct));

    if (shortMA > longMA && position === 0) {
      const buyFee = cash * (feeRate / 100);
      const netCapital = cash - buyFee;
      position = netCapital / candle.close;
      cash = 0;
      entryPrice = candle.close;
      entryFee = buyFee;
      trades.push({
        type: 'BUY',
        timestamp: candle.timestamp || candle.openTime,
        price: candle.close,
        fee: Number(buyFee.toFixed(2)),
      });
    } else if ((shortMA < longMA && position > 0) || riskExit) {
      const grossProceeds = position * candle.close;
      const sellFee = grossProceeds * (feeRate / 100);
      cash = grossProceeds - sellFee;
      const pnl = (candle.close - entryPrice) * position - sellFee - entryFee;
      trades.push({
        type: 'SELL',
        reason: riskExit ? 'RISK_EXIT' : 'SIGNAL_EXIT',
        timestamp: candle.timestamp || candle.openTime,
        price: candle.close,
        fee: Number(sellFee.toFixed(2)),
        pnl: Number(pnl.toFixed(2)),
      });
      position = 0;
      entryPrice = 0;
      entryFee = 0;
    }

    const equity = cash + position * candle.close;
    equityCurve.push(equity);

    if (previousEquity !== 0) {
      dailyReturns.push((equity - previousEquity) / previousEquity);
    }
  }

  const finalEquity = equityCurve[equityCurve.length - 1] || initialCapital;
  const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

  const closedTrades = [];
  for (let i = 0; i < trades.length - 1; i += 1) {
    if (trades[i].type === 'BUY' && trades[i + 1].type === 'SELL') {
      closedTrades.push(trades[i + 1].pnl || 0);
    }
  }

  const wins = closedTrades.filter((pnl) => pnl > 0).length;
  const winRate = closedTrades.length === 0 ? 0 : (wins / closedTrades.length) * 100;
  const losses = closedTrades.filter((pnl) => pnl < 0);
  const totalProfit = closedTrades.filter((pnl) => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
  const totalLossAbs = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
  const averageTradePnl = closedTrades.length ? closedTrades.reduce((sum, pnl) => sum + pnl, 0) / closedTrades.length : 0;
  const profitFactor = totalLossAbs === 0 ? (totalProfit > 0 ? 999 : 0) : totalProfit / totalLossAbs;
  const expectancy = closedTrades.length ? ((winRate / 100) * (totalProfit / (wins || 1))) - ((1 - winRate / 100) * (totalLossAbs / (losses.length || 1))) : 0;

  const metrics = {
    initialCapital,
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    winRate: Number(winRate.toFixed(2)),
    totalTrades: closedTrades.length,
    averageTradePnl: Number(averageTradePnl.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    expectancy: Number(expectancy.toFixed(2)),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    sharpeRatio: calculateSharpeRatio(dailyReturns),
    equityCurve: equityCurve.map((value, index) => ({
      step: index,
      equity: Number(value.toFixed(2)),
    })),
  };

  return { metrics, trades };
}

module.exports = {
  runSmaCrossoverBacktest,
};
