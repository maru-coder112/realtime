import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import PremiumShell from '../components/PremiumShell';

function metricValue(metrics, key) {
  if (!metrics || typeof metrics !== 'object') return '--';
  const value = metrics[key];
  if (value === undefined || value === null) return '--';
  return typeof value === 'number' ? value.toFixed(2) : String(value);
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [backtests, setBacktests] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [virtualBalanceDrafts, setVirtualBalanceDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [errorText, setErrorText] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const { data } = await api.get('/api/admin/overview');
      setStats(data.stats || null);
      setUsers(Array.isArray(data.users) ? data.users : []);
      setStrategies(Array.isArray(data.strategies) ? data.strategies : []);
      setBacktests(Array.isArray(data.backtests) ? data.backtests : []);
      setRoleDrafts(
        Object.fromEntries((Array.isArray(data.users) ? data.users : []).map((u) => [u.id, u.role]))
      );
      setVirtualBalanceDrafts(
        Object.fromEntries((Array.isArray(data.users) ? data.users : []).map((u) => [u.id, u.virtual_balance || 10000]))
      );
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const updateRole = async (userId) => {
    const role = roleDrafts[userId];
    if (!role) return;

    setInfoText('');
    setErrorText('');
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role });
      setInfoText('User role updated successfully.');
      loadOverview();
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Could not update role');
    }
  };

  const updateVirtualBalance = async (userId) => {
    const amount = Number(virtualBalanceDrafts[userId]);
    if (isNaN(amount) || amount < 0) {
      setErrorText('Virtual balance must be a non-negative number');
      return;
    }

    setInfoText('');
    setErrorText('');
    try {
      await api.patch(`/api/admin/users/${userId}/virtual-balance`, { amount });
      setInfoText(`Virtual balance updated to $${amount.toFixed(2)}`);
      loadOverview();
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Could not update virtual balance');
    }
  };

  const resetAllVirtualBalance = async () => {
    const confirmed = window.confirm('Reset all users\' virtual balance to $10,000? This cannot be undone.');
    if (!confirmed) return;

    setInfoText('');
    setErrorText('');
    try {
      const { data } = await api.post('/api/admin/reset-virtual-balance', { amount: 10000 });
      setInfoText(`✓ Reset virtual balance for ${data.updatedCount} users to $10,000.00`);
      loadOverview();
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Could not reset virtual balances');
    }
  };

  const downloadBacktestCsv = async (backtestId) => {
    setInfoText('');
    setErrorText('');
    try {
      const response = await api.get(`/api/backtests/${backtestId}/report`, {
        params: { format: 'csv' },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backtest-${backtestId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setInfoText(`CSV downloaded for backtest #${backtestId}`);
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Could not download CSV report');
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(`Delete user ${user.username} (${user.email})? This will remove related strategies/backtests.`);
    if (!confirmed) return;

    setInfoText('');
    setErrorText('');
    try {
      await api.delete(`/api/admin/users/${user.id}`);
      setInfoText('User deleted successfully.');
      loadOverview();
    } catch (error) {
      setErrorText(error.response?.data?.message || 'Could not delete user');
    }
  };

  return (
    <PremiumShell
      title="Admin Control Center"
      subtitle="Manage users, virtual money, strategies, and backtest reports"
    >
      <motion.div
        className="admin-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {errorText && <div className="admin-alert error">{errorText}</div>}
        {infoText && <div className="admin-alert success">{infoText}</div>}

        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <p className="admin-kpi-label">Total Users</p>
            <h2>{stats?.users_count ?? '--'}</h2>
            <span className="admin-kpi-icon">👥</span>
          </div>
          <div className="admin-kpi-card">
            <p className="admin-kpi-label">Admins</p>
            <h2>{stats?.admins_count ?? '--'}</h2>
            <span className="admin-kpi-icon">🔐</span>
          </div>
          <div className="admin-kpi-card">
            <p className="admin-kpi-label">Strategies</p>
            <h2>{stats?.strategies_count ?? '--'}</h2>
            <span className="admin-kpi-icon">📊</span>
          </div>
          <div className="admin-kpi-card">
            <p className="admin-kpi-label">Backtests</p>
            <h2>{stats?.backtests_count ?? '--'}</h2>
            <span className="admin-kpi-icon">🧪</span>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h2>User Management</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="admin-refresh-btn" 
                onClick={loadOverview} 
                disabled={loading}
              >
                {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
              </button>
              <button
                type="button"
                className="admin-action-btn save"
                onClick={resetAllVirtualBalance}
                title="Reset all users to $10,000"
              >
                💰 Reset All to $10K
              </button>
            </div>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Virtual Balance</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!users.length && (
                  <tr>
                    <td colSpan="7" className="admin-empty">No users found.</td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><span className="admin-id">#{user.id}</span></td>
                    <td><strong>{user.username}</strong></td>
                    <td>{user.email}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          className="admin-input"
                          value={virtualBalanceDrafts[user.id] ?? 10000}
                          onChange={(e) => setVirtualBalanceDrafts((prev) => ({ ...prev, [user.id]: Number(e.target.value) }))}
                          style={{ width: '100px', padding: '4px' }}
                        />
                        <button
                          type="button"
                          className="admin-action-btn save"
                          onClick={() => updateVirtualBalance(user.id)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Set
                        </button>
                      </div>
                    </td>
                    <td>
                      <select
                        className="admin-select"
                        value={roleDrafts[user.id] || user.role}
                        onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>{user.email_verified ? '✓ Yes' : '✗ No'}</td>
                    <td className="admin-actions-cell">
                      <button
                        type="button"
                        className="admin-action-btn save"
                        onClick={() => updateRole(user.id)}
                      >
                        Save Role
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn delete"
                        onClick={() => deleteUser(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Strategy Reports</h2>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Description</th>
                  <th>Return</th>
                  <th>Sharpe</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!strategies.length && (
                  <tr>
                    <td colSpan="8" className="admin-empty">No strategy reports found.</td>
                  </tr>
                )}
                {strategies.map((item) => (
                  <tr key={item.id}>
                    <td><span className="admin-id">#{item.id}</span></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.username}</td>
                    <td>{item.email}</td>
                    <td className="admin-desc">{item.description || '--'}</td>
                    <td><span className="admin-metric">{metricValue(item.latest_metrics, 'totalReturn')}%</span></td>
                    <td>{metricValue(item.latest_metrics, 'sharpeRatio')}</td>
                    <td className="admin-actions-cell">
                      {item.latest_backtest_id && (
                        <>
                          <Link className="admin-action-btn view" to={`/backtests/${item.latest_backtest_id}`}>View</Link>
                          <button
                            type="button"
                            className="admin-action-btn download"
                            onClick={() => downloadBacktestCsv(item.latest_backtest_id)}
                          >
                            CSV
                          </button>
                        </>
                      )}
                      {!item.latest_backtest_id && <span className="admin-none">--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-section">
          <div className="admin-section-header">
            <h2>Backtest Reports</h2>
          </div>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Strategy</th>
                  <th>User</th>
                  <th>Period</th>
                  <th>Return</th>
                  <th>Sharpe</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!backtests.length && (
                  <tr>
                    <td colSpan="7" className="admin-empty">No backtests found.</td>
                  </tr>
                )}
                {backtests.map((item) => (
                  <tr key={item.id}>
                    <td><span className="admin-id">#{item.id}</span></td>
                    <td><strong>{item.strategy_name}</strong></td>
                    <td>{item.username}</td>
                    <td className="admin-period">{item.start_date} to {item.end_date}</td>
                    <td><span className="admin-metric">{metricValue(item.metrics, 'totalReturn')}%</span></td>
                    <td>{metricValue(item.metrics, 'sharpeRatio')}</td>
                    <td className="admin-actions-cell">
                      <Link className="admin-action-btn view" to={`/backtests/${item.id}`}>View</Link>
                      <button
                        type="button"
                        className="admin-action-btn download"
                        onClick={() => downloadBacktestCsv(item.id)}
                      >
                        CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </PremiumShell>
  );
}
