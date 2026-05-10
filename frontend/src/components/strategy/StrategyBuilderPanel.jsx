import { motion } from 'framer-motion';
import { MARKET_SYMBOLS } from '../../constants/markets';

const indicatorOptions = [
  { key: 'sma', label: 'Moving Average (SMA)', color: 'green' },
  { key: 'ema', label: 'Moving Average (EMA)', color: 'blue' },
  { key: 'rsi', label: 'RSI', color: 'amber' },
  { key: 'macd', label: 'MACD', color: 'cyan' },
  { key: 'bollinger', label: 'Bollinger Bands', color: 'violet' },
];

const operators = ['>', '<', '='];
const logicOperators = ['AND', 'OR'];
const riskLevels = ['Low', 'Medium', 'High'];
const timeframes = ['15m', '1h', '4h', '1d'];
const conditionFields = ['shortMA', 'longMA', 'price', 'rsi', 'macd', 'threshold'];

function Field({ label, children, hint, full = false }) {
  return (
    <label className={`strategy-field ${full ? 'full' : ''}`}>
      <span className="strategy-field-label">{label}</span>
      {children}
      {hint && <span className="strategy-field-hint">{hint}</span>}
    </label>
  );
}

function ToggleChip({ active, label, onClick, color = 'green' }) {
  return (
    <button type="button" className={`strategy-toggle-chip ${active ? 'active' : ''} ${color}`} onClick={onClick}>
      {label}
    </button>
  );
}

export default function StrategyBuilderPanel({
  draft,
  setDraft,
  onCreateNew,
  onSave,
  onRun,
  saving,
  running,
  progress,
  error,
  selectedStrategyId,
}) {
  const isValid = Number(draft.shortWindow) > 0 && Number(draft.longWindow) > Number(draft.shortWindow)
    && Number(draft.initialCapital) > 0 && Number(draft.stopLossPct) >= 0 && Number(draft.takeProfitPct) >= 0;

  return (
    <motion.aside
      className="card strategy-builder-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="strategy-panel-header">
        <div>
          <p className="kicker">Strategy Creation</p>
          <h2>{draft.id ? 'Edit strategy' : 'Build a new strategy'}</h2>
          <p className="muted">Define indicators, rules, and risk parameters for the backtest engine.</p>
        </div>
        <div className="strategy-panel-actions">
          <button type="button" className="nav-btn" onClick={onCreateNew}>Create New Strategy</button>
          <button type="button" className="nav-btn" onClick={onSave} disabled={saving || !isValid}>
            {saving ? 'Saving...' : 'Save Strategy'}
          </button>
          <button type="button" className="nav-btn active" onClick={onRun} disabled={running || saving || !isValid}>
            {running ? 'Running Backtest...' : 'Run Backtest'}
          </button>
        </div>
      </div>

      <div className="strategy-progress-shell">
        <div className="strategy-progress-track">
          <motion.div className="strategy-progress-fill" animate={{ width: `${progress || 0}%` }} transition={{ duration: 0.18 }} />
        </div>
        <div className="row space-between wrap gap">
          <span className="muted">{running ? 'Backtest engine running' : 'Idle'}</span>
          <span className="muted">{progress ? `${Math.round(progress)}%` : '0%'}</span>
        </div>
      </div>

      {error && <p className="strategy-error-banner">{error}</p>}

      <div className="strategy-form-grid">
        <Field label="Strategy name" full>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Institutional Momentum Strategy" />
        </Field>

        <Field label="Description" full>
          <textarea
            rows="3"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Explain the logic and market context for this strategy"
          />
        </Field>

        <Field label="Asset" >
          <select value={draft.assetSymbol} onChange={(e) => setDraft({ ...draft, assetSymbol: e.target.value })}>
            {MARKET_SYMBOLS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Timeframe">
          <select value={draft.timeframe} onChange={(e) => setDraft({ ...draft, timeframe: e.target.value })}>
            {timeframes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>

        <Field label="Date range" full>
          <div className="strategy-inline-grid">
            <input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            <input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
          </div>
        </Field>

        <Field label="Initial capital">
          <input type="number" min="100" step="100" value={draft.initialCapital} onChange={(e) => setDraft({ ...draft, initialCapital: e.target.value })} />
        </Field>

        <Field label="Risk level">
          <select value={draft.riskLevel} onChange={(e) => setDraft({ ...draft, riskLevel: e.target.value })}>
            {riskLevels.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>

        <Field label="Stop loss (%)">
          <input type="number" min="0" step="0.1" value={draft.stopLossPct} onChange={(e) => setDraft({ ...draft, stopLossPct: e.target.value })} />
        </Field>

        <Field label="Take profit (%)">
          <input type="number" min="0" step="0.1" value={draft.takeProfitPct} onChange={(e) => setDraft({ ...draft, takeProfitPct: e.target.value })} />
        </Field>

        <Field label="Fee rate (%)">
          <input type="number" min="0" step="0.01" value={draft.feeRate} onChange={(e) => setDraft({ ...draft, feeRate: e.target.value })} />
        </Field>

        <Field label="Indicator type" full>
          <div className="strategy-toggle-row">
            {indicatorOptions.map((item) => (
              <ToggleChip
                key={item.key}
                label={item.label}
                color={item.color}
                active={draft.indicatorType === item.key.toUpperCase()}
                onClick={() => setDraft({ ...draft, indicatorType: item.key.toUpperCase() })}
              />
            ))}
          </div>
        </Field>

        <Field label="Indicators" full hint="Select the overlays that define your strategy logic.">
          <div className="strategy-toggle-row">
            {indicatorOptions.map((item) => (
              <ToggleChip
                key={item.key}
                label={item.label}
                color={item.color}
                active={Boolean(draft.indicators?.[item.key])}
                onClick={() => setDraft({
                  ...draft,
                  indicators: { ...draft.indicators, [item.key]: !draft.indicators?.[item.key] },
                })}
              />
            ))}
          </div>
        </Field>

        <Field label="Short window">
          <input type="number" min="2" value={draft.shortWindow} onChange={(e) => setDraft({ ...draft, shortWindow: e.target.value })} />
        </Field>

        <Field label="Long window">
          <input type="number" min="3" value={draft.longWindow} onChange={(e) => setDraft({ ...draft, longWindow: e.target.value })} />
        </Field>

        <Field label="RSI period">
          <input type="number" min="2" value={draft.rsiPeriod} onChange={(e) => setDraft({ ...draft, rsiPeriod: e.target.value })} />
        </Field>

        <Field label="MACD fast">
          <input type="number" min="2" value={draft.macdFast} onChange={(e) => setDraft({ ...draft, macdFast: e.target.value })} />
        </Field>

        <Field label="MACD slow">
          <input type="number" min="2" value={draft.macdSlow} onChange={(e) => setDraft({ ...draft, macdSlow: e.target.value })} />
        </Field>

        <Field label="MACD signal">
          <input type="number" min="2" value={draft.macdSignal} onChange={(e) => setDraft({ ...draft, macdSignal: e.target.value })} />
        </Field>

        <Field label="Bollinger period">
          <input type="number" min="2" value={draft.bollingerPeriod} onChange={(e) => setDraft({ ...draft, bollingerPeriod: e.target.value })} />
        </Field>

        <Field label="Bollinger std dev">
          <input type="number" min="1" step="0.1" value={draft.bollingerStdDev} onChange={(e) => setDraft({ ...draft, bollingerStdDev: e.target.value })} />
        </Field>

        <Field label="Custom threshold">
          <input type="number" step="0.1" value={draft.thresholdValue} onChange={(e) => setDraft({ ...draft, thresholdValue: e.target.value })} />
        </Field>

        <Field label="Buy condition" full>
          <div className="strategy-condition-grid">
            <select value={draft.buyCondition.left} onChange={(e) => setDraft({ ...draft, buyCondition: { ...draft.buyCondition, left: e.target.value } })}>
              {conditionFields.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.buyCondition.operator} onChange={(e) => setDraft({ ...draft, buyCondition: { ...draft.buyCondition, operator: e.target.value } })}>
              {operators.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.buyCondition.right} onChange={(e) => setDraft({ ...draft, buyCondition: { ...draft.buyCondition, right: e.target.value } })}>
              {conditionFields.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.buyCondition.logic} onChange={(e) => setDraft({ ...draft, buyCondition: { ...draft.buyCondition, logic: e.target.value } })}>
              {logicOperators.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </Field>

        <Field label="Sell condition" full>
          <div className="strategy-condition-grid">
            <select value={draft.sellCondition.left} onChange={(e) => setDraft({ ...draft, sellCondition: { ...draft.sellCondition, left: e.target.value } })}>
              {conditionFields.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.sellCondition.operator} onChange={(e) => setDraft({ ...draft, sellCondition: { ...draft.sellCondition, operator: e.target.value } })}>
              {operators.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.sellCondition.right} onChange={(e) => setDraft({ ...draft, sellCondition: { ...draft.sellCondition, right: e.target.value } })}>
              {conditionFields.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={draft.sellCondition.logic} onChange={(e) => setDraft({ ...draft, sellCondition: { ...draft.sellCondition, logic: e.target.value } })}>
              {logicOperators.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </Field>
      </div>

      <div className="strategy-validation-row">
        <span className={isValid ? 'status-good' : 'status-bad'}>{isValid ? 'Strategy config ready' : 'Long window must be greater than short window'}</span>
        <span className="muted">{draft.id ? `Editing strategy #${draft.id}` : 'New strategy draft'}</span>
      </div>
    </motion.aside>
  );
}