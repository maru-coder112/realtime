import { motion } from 'framer-motion';

export default function StrategyLibraryPanel({
  strategies,
  activeStrategy,
  compareStrategyId,
  setCompareStrategyId,
  onLoad,
  onDelete,
  loading,
}) {
  return (
    <motion.aside
      className="card strategy-library-panel"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="strategy-panel-header stack">
        <div>
          <p className="kicker">Strategy Management</p>
          <h2>Saved strategies</h2>
          <p className="muted">Load, edit, delete, or compare previously saved configurations.</p>
        </div>

        <label className="strategy-field full">
          <span className="strategy-field-label">Compare with</span>
          <select value={compareStrategyId} onChange={(e) => setCompareStrategyId(e.target.value)}>
            <option value="">Select strategy</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="strategy-skeleton-stack">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : (
        <div className="strategy-list">
          {strategies.length ? strategies.map((strategy) => {
            const isActive = Number(activeStrategy?.id) === Number(strategy.id);
            return (
              <motion.div
                key={strategy.id}
                className={`strategy-list-item ${isActive ? 'active' : ''}`}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <div className="strategy-list-item-top">
                  <div>
                    <p className="strategy-list-name">{strategy.name}</p>
                    <p className="muted">ID #{strategy.id} • {strategy.parameters?.assetSymbol || 'Unassigned'}</p>
                  </div>
                  {isActive && <span className="chip strategy-active-chip">Active</span>}
                </div>

                <p className="strategy-list-desc">{strategy.description || 'No description provided.'}</p>

                <div className="strategy-list-meta">
                  <span className="chip">TF {strategy.parameters?.timeframe || '1d'}</span>
                  <span className="chip">Capital {Number(strategy.parameters?.initialCapital || 0).toLocaleString('en-US')}</span>
                </div>

                <div className="strategy-list-actions">
                  <button type="button" className="nav-btn" onClick={() => onLoad(strategy)}>Load</button>
                  <button type="button" className="nav-btn" onClick={() => onLoad(strategy)}>Edit</button>
                  <button type="button" className="nav-btn danger-btn" onClick={() => onDelete(strategy.id)}>Delete</button>
                </div>
              </motion.div>
            );
          }) : (
            <div className="strategy-empty-state">
              <p className="muted">No saved strategies yet.</p>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  );
}