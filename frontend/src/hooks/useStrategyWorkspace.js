import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { MARKET_SYMBOLS } from '../constants/markets';

function buildDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function createEmptyStrategyDraft() {
  const { startDate, endDate } = buildDateRange();
  return {
    id: null,
    name: 'Institutional Momentum Strategy',
    description: 'Example: trend-following with risk filters and dynamic exits.',
    assetSymbol: MARKET_SYMBOLS[0].value,
    timeframe: '1d',
    startDate,
    endDate,
    initialCapital: 25000,
    riskLevel: 'Medium',
    stopLossPct: 3,
    takeProfitPct: 8,
    feeRate: 0.1,
    indicators: {
      sma: true,
      ema: true,
      rsi: false,
      macd: true,
      bollinger: false,
    },
    indicatorType: 'SMA',
    shortWindow: 8,
    longWindow: 24,
    rsiPeriod: 14,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    bollingerPeriod: 20,
    bollingerStdDev: 2,
    thresholdValue: 0,
    buyCondition: {
      left: 'shortMA',
      operator: '>',
      right: 'longMA',
      logic: 'AND',
      threshold: 0,
    },
    sellCondition: {
      left: 'shortMA',
      operator: '<',
      right: 'longMA',
      logic: 'OR',
      threshold: 0,
    },
  };
}

function normalizeDraft(strategy) {
  if (!strategy) return createEmptyStrategyDraft();
  const parameters = strategy.parameters || {};
  return {
    ...createEmptyStrategyDraft(),
    id: strategy.id,
    name: strategy.name || 'Untitled Strategy',
    description: strategy.description || '',
    assetSymbol: parameters.assetSymbol || MARKET_SYMBOLS[0].value,
    timeframe: parameters.timeframe || '1d',
    startDate: parameters.startDate || buildDateRange().startDate,
    endDate: parameters.endDate || buildDateRange().endDate,
    initialCapital: Number(parameters.initialCapital || 25000),
    riskLevel: parameters.riskLevel || 'Medium',
    stopLossPct: Number(parameters.stopLossPct || 3),
    takeProfitPct: Number(parameters.takeProfitPct || 8),
    feeRate: Number(parameters.feeRate || 0.1),
    indicators: {
      sma: parameters.indicators?.sma ?? true,
      ema: parameters.indicators?.ema ?? false,
      rsi: parameters.indicators?.rsi ?? false,
      macd: parameters.indicators?.macd ?? false,
      bollinger: parameters.indicators?.bollinger ?? false,
    },
    indicatorType: parameters.indicatorType || 'SMA',
    shortWindow: Number(parameters.shortWindow || 8),
    longWindow: Number(parameters.longWindow || 24),
    rsiPeriod: Number(parameters.rsiPeriod || 14),
    macdFast: Number(parameters.macdFast || 12),
    macdSlow: Number(parameters.macdSlow || 26),
    macdSignal: Number(parameters.macdSignal || 9),
    bollingerPeriod: Number(parameters.bollingerPeriod || 20),
    bollingerStdDev: Number(parameters.bollingerStdDev || 2),
    thresholdValue: Number(parameters.thresholdValue || 0),
    buyCondition: parameters.buyCondition || {
      left: 'shortMA',
      operator: '>',
      right: 'longMA',
      logic: 'AND',
      threshold: 0,
    },
    sellCondition: parameters.sellCondition || {
      left: 'shortMA',
      operator: '<',
      right: 'longMA',
      logic: 'OR',
      threshold: 0,
    },
  };
}

function buildStrategyPayload(draft) {
  return {
    name: draft.name,
    description: draft.description,
    parameters: {
      assetSymbol: draft.assetSymbol,
      timeframe: draft.timeframe,
      startDate: draft.startDate,
      endDate: draft.endDate,
      initialCapital: Number(draft.initialCapital),
      riskLevel: draft.riskLevel,
      stopLossPct: Number(draft.stopLossPct),
      takeProfitPct: Number(draft.takeProfitPct),
      feeRate: Number(draft.feeRate),
      indicators: draft.indicators,
      indicatorType: draft.indicatorType,
      shortWindow: Number(draft.shortWindow),
      longWindow: Number(draft.longWindow),
      rsiPeriod: Number(draft.rsiPeriod),
      macdFast: Number(draft.macdFast),
      macdSlow: Number(draft.macdSlow),
      macdSignal: Number(draft.macdSignal),
      bollingerPeriod: Number(draft.bollingerPeriod),
      bollingerStdDev: Number(draft.bollingerStdDev),
      thresholdValue: Number(draft.thresholdValue),
      buyCondition: draft.buyCondition,
      sellCondition: draft.sellCondition,
    },
  };
}

function pairTrades(trades = [], symbol = 'BTCUSDT') {
  const rows = [];
  let openTrade = null;
  let id = 1;

  trades.forEach((trade) => {
    if (trade.type === 'BUY') {
      openTrade = trade;
      return;
    }

    if (trade.type === 'SELL' && openTrade) {
      rows.push({
        tradeId: `T-${String(id).padStart(3, '0')}`,
        asset: symbol,
        entryPrice: Number(openTrade.price || 0),
        exitPrice: Number(trade.price || 0),
        profitLoss: Number(trade.pnl || 0),
        date: trade.timestamp || openTrade.timestamp || '',
        tradeType: 'BUY → SELL',
      });
      id += 1;
      openTrade = null;
    }
  });

  return rows.reverse();
}

function deriveRiskData(metrics) {
  const equityCurve = metrics?.equityCurve || [];
  const peaks = [];
  let highest = 0;
  const drawdownSeries = equityCurve.map((point, index) => {
    highest = Math.max(highest, Number(point.equity || 0));
    peaks.push(highest);
    const equity = Number(point.equity || 0);
    const drawdown = highest === 0 ? 0 : ((equity - highest) / highest) * 100;
    return {
      step: point.step ?? index,
      drawdown: Number(drawdown.toFixed(2)),
    };
  });

  const drawdowns = drawdownSeries.map((item) => item.drawdown);
  const maxDrawdown = drawdowns.length ? Math.min(...drawdowns) : 0;
  const volatility = metrics?.sharpeRatio != null ? Math.abs(100 / (1 + Math.abs(metrics.sharpeRatio))) : 50;
  const consistency = metrics?.winRate != null ? Math.max(0, Math.min(100, metrics.winRate - Math.abs(maxDrawdown) * 0.5)) : 0;
  const riskScore = Math.max(0, Math.min(100, 100 - Math.abs(maxDrawdown) * 2 - volatility * 0.35 + consistency * 0.15));

  return {
    drawdownSeries,
    volatility,
    consistency,
    riskScore,
    maxDrawdown,
  };
}

export default function useStrategyWorkspace() {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [draft, setDraft] = useState(createEmptyStrategyDraft());
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [compareStrategyId, setCompareStrategyId] = useState('');
  const [compareMetrics, setCompareMetrics] = useState(null);
  const progressTimerRef = useRef(null);

  const activeStrategy = useMemo(
    () => strategies.find((item) => Number(item.id) === Number(selectedStrategyId)) || null,
    [strategies, selectedStrategyId]
  );

  const compareStrategy = useMemo(
    () => strategies.find((item) => Number(item.id) === Number(compareStrategyId)) || null,
    [strategies, compareStrategyId]
  );

  const refreshStrategies = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/strategies');
      const list = Array.isArray(data) ? data : [];
      setStrategies(list);
      return list;
    } catch (loadError) {
      setError(loadError.response?.data?.message || 'Failed to load strategies');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeStrategies() {
      const list = await refreshStrategies();
      if (!mounted) return;

      if (!selectedStrategyId && list.length) {
        setSelectedStrategyId(list[0].id);
        setDraft(normalizeDraft(list[0]));
      }
      if (!compareStrategyId && list.length > 1) {
        setCompareStrategyId(list[1].id);
      }
    }

    initializeStrategies();
    return () => {
      mounted = false;
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadComparison() {
      if (!compareStrategyId) {
        setCompareMetrics(null);
        return;
      }

      try {
        const { data } = await api.get(`/api/strategies/${compareStrategyId}/performance`);
        if (mounted) {
          setCompareMetrics(data?.metrics || null);
        }
      } catch {
        if (mounted) setCompareMetrics(null);
      }
    }

    loadComparison();
    return () => {
      mounted = false;
    };
  }, [compareStrategyId]);

  const createNewStrategy = useCallback(() => {
    setSelectedStrategyId(null);
    setDraft(createEmptyStrategyDraft());
    setBacktest(null);
    setError('');
  }, []);

  const loadStrategy = useCallback((strategy) => {
    setSelectedStrategyId(strategy.id);
    setDraft(normalizeDraft(strategy));
    setError('');
  }, []);

  const saveStrategy = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const payload = buildStrategyPayload(draft);
      const { data } = draft.id
        ? await api.patch(`/api/strategies/${draft.id}`, payload)
        : await api.post('/api/strategies', payload);

      const normalized = normalizeDraft(data);
      setDraft(normalized);
      setSelectedStrategyId(data.id);
      await refreshStrategies();
      return data;
    } catch (saveError) {
      setError(saveError.response?.data?.message || 'Failed to save strategy');
      throw saveError;
    } finally {
      setSaving(false);
    }
  }, [draft, refreshStrategies]);

  const deleteStrategy = useCallback(async (strategyId) => {
    await api.delete(`/api/strategies/${strategyId}`);
    if (Number(selectedStrategyId) === Number(strategyId)) {
      createNewStrategy();
    }
    await refreshStrategies();
  }, [createNewStrategy, refreshStrategies, selectedStrategyId]);

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    setProgress(8);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return current + (current < 40 ? 13 : 7);
      });
    }, 180);
  }, [stopProgress]);

  const runBacktest = useCallback(async (overrideDraft = null) => {
    const strategyToRun = overrideDraft || draft;
    const strategyId = strategyToRun.id;

    if (!strategyId) {
      const saved = await saveStrategy();
      return runBacktest(normalizeDraft(saved));
    }

    setRunning(true);
    setError('');
    startProgress();

    try {
      const payload = {
        strategyId,
        symbol: strategyToRun.assetSymbol,
        startDate: strategyToRun.startDate,
        endDate: strategyToRun.endDate,
        interval: strategyToRun.timeframe,
        parameters: buildStrategyPayload(strategyToRun).parameters,
      };

      const { data } = await api.post('/api/strategies/backtest', payload);
      const metrics = data.metrics || {};
      const tradeRows = pairTrades(data.trades || [], strategyToRun.assetSymbol);
      const risk = deriveRiskData(metrics);

      setBacktest({
        id: data.id,
        strategyId,
        metrics,
        trades: data.trades || [],
        tradeRows,
        risk,
        symbol: strategyToRun.assetSymbol,
        strategyName: strategyToRun.name,
      });
      setProgress(100);
      await refreshStrategies();
      return data;
    } catch (runError) {
      setError(runError.response?.data?.message || 'Backtest failed');
      throw runError;
    } finally {
      stopProgress();
      setRunning(false);
      window.setTimeout(() => setProgress(0), 500);
    }
  }, [draft, refreshStrategies, saveStrategy, startProgress, stopProgress]);

  const compareBacktest = useMemo(() => {
    if (!backtest || !compareStrategy) return null;
    return {
      strategy: compareStrategy,
      metrics: compareMetrics,
    };
  }, [backtest, compareStrategy, compareMetrics]);

  return {
    strategies,
    loading,
    saving,
    running,
    progress,
    error,
    draft,
    setDraft,
    activeStrategy,
    selectedStrategyId,
    setSelectedStrategyId,
    compareStrategyId,
    setCompareStrategyId,
    compareStrategy,
    compareBacktest,
    backtest,
    loadStrategy,
    createNewStrategy,
    saveStrategy,
    deleteStrategy,
    runBacktest,
    refreshStrategies,
  };
}