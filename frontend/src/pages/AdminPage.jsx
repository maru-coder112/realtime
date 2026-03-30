import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/TopNav';
import api from '../services/api';

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
    <div className="layout admin-layout">
      <TopNav
        title="Admin Control Center"
        subtitle="Manage users and inspect strategies/backtest reports in one desk."
      />

      {errorText && <div className="card"><p className="status-bad">{errorText}</p></div>}
      {infoText && <div className="card"><p className="status-good">{infoText}</p></div>}

      <div className="admin-kpi-grid full-width">
        <div className="card admin-kpi-card">
          <p className="muted">Users</p>
          <h2>{stats?.users_count ?? '--'}</h2>
        </div>
        <div className="card admin-kpi-card">
          <p className="muted">Admins</p>
          <h2>{stats?.admins_count ?? '--'}</h2>
        </div>
        <div className="card admin-kpi-card">
          <p className="muted">Strategies</p>
          <h2>{stats?.strategies_count ?? '--'}</h2>
        </div>
        <div className="card admin-kpi-card">
          <p className="muted">Backtests</p>
          <h2>{stats?.backtests_count ?? '--'}</h2>
        </div>
      </div>

      <div className="card full-width">
        <div className="row space-between wrap gap">
          <h3>User Management</h3>
          <button type="button" className="nav-btn" onClick={loadOverview} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!users.length && (
              <tr>
                <td colSpan="6" className="muted">No users found.</td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={roleDrafts[user.id] || user.role}
                    onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{user.email_verified ? 'Yes' : 'No'}</td>
                <td className="admin-actions-cell">
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => updateRole(user.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn danger"
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

      <div className="card full-width">
        <h3>Strategy Reports</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>User</th>
              <th>Email</th>
              <th>Description</th>
              <th>Latest Return</th>
              <th>Latest Sharpe</th>
              <th>Backtest</th>
              <th>CSV</th>
            </tr>
          </thead>
          <tbody>
            {!strategies.length && (
              <tr>
                <td colSpan="9" className="muted">No strategy reports found.</td>
              </tr>
            )}
            {strategies.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.username}</td>
                <td>{item.email}</td>
                <td>{item.description || '--'}</td>
                <td>{metricValue(item.latest_metrics, 'totalReturn')}%</td>
                <td>{metricValue(item.latest_metrics, 'sharpeRatio')}</td>
                <td>
                  {item.latest_backtest_id
                    ? <Link className="btn-link" to={`/backtests/${item.latest_backtest_id}`}>Open</Link>
                    : '--'}
                </td>
                <td>
                  {item.latest_backtest_id ? (
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => downloadBacktestCsv(item.latest_backtest_id)}
                    >
                      Download
                    </button>
                  ) : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card full-width">
        <h3>Backtest Reports</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Strategy</th>
              <th>User</th>
              <th>Period</th>
              <th>Return</th>
              <th>Sharpe</th>
              <th>Report</th>
              <th>CSV</th>
            </tr>
          </thead>
          <tbody>
            {!backtests.length && (
              <tr>
                <td colSpan="8" className="muted">No backtests found.</td>
              </tr>
            )}
            {backtests.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.strategy_name}</td>
                <td>{item.username}</td>
                <td>{item.start_date} to {item.end_date}</td>
                <td>{metricValue(item.metrics, 'totalReturn')}%</td>
                <td>{metricValue(item.metrics, 'sharpeRatio')}</td>
                <td><Link className="btn-link" to={`/backtests/${item.id}`}>Open</Link></td>
                <td>
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => downloadBacktestCsv(item.id)}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
