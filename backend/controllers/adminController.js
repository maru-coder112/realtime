const pool = require('../models/db');

async function getOverview(req, res) {
  const [usersResult, strategiesResult, backtestsResult, statsResult] = await Promise.all([
    pool.query(
      `
        SELECT id, username, email, role, email_verified
        FROM users
        ORDER BY id DESC
        LIMIT 100
      `
    ),
    pool.query(
      `
        SELECT
          s.id,
          s.name,
          s.description,
          s.parameters,
          s.user_id,
          u.username,
          u.email,
          lb.id AS latest_backtest_id,
          lb.metrics AS latest_metrics
        FROM strategies s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN LATERAL (
          SELECT b.id, b.metrics
          FROM backtest_results b
          WHERE b.strategy_id = s.id
          ORDER BY b.id DESC
          LIMIT 1
        ) lb ON TRUE
        ORDER BY s.id DESC
        LIMIT 100
      `
    ),
    pool.query(
      `
        SELECT b.id, b.strategy_id, b.user_id, b.start_date, b.end_date, b.metrics,
               s.name AS strategy_name, u.username, u.email
        FROM backtest_results b
        JOIN strategies s ON s.id = b.strategy_id
        JOIN users u ON u.id = b.user_id
        ORDER BY b.id DESC
        LIMIT 100
      `
    ),
    pool.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM users) AS users_count,
          (SELECT COUNT(*)::int FROM users WHERE role = 'admin') AS admins_count,
          (SELECT COUNT(*)::int FROM strategies) AS strategies_count,
          (SELECT COUNT(*)::int FROM backtest_results) AS backtests_count
      `
    ),
  ]);

  return res.json({
    stats: statsResult.rows[0],
    users: usersResult.rows,
    strategies: strategiesResult.rows,
    backtests: backtestsResult.rows,
  });
}

async function deleteUser(req, res) {
  const targetUserId = Number(req.params.userId);

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (targetUserId === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  const { rows: targetRows } = await pool.query(
    'SELECT id, role FROM users WHERE id = $1',
    [targetUserId]
  );

  if (!targetRows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (targetRows[0].role === 'admin') {
    const { rows: adminCountRows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'"
    );
    if ((adminCountRows[0]?.count || 0) <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin account' });
    }
  }

  await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);
  return res.json({ message: 'User deleted successfully' });
}

async function updateUserRole(req, res) {
  const targetUserId = Number(req.params.userId);
  const role = String(req.body.role || '').trim().toLowerCase();

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'role must be user or admin' });
  }

  if (targetUserId === req.user.id && role !== 'admin') {
    return res.status(400).json({ message: 'You cannot remove your own admin role' });
  }

  const { rows } = await pool.query(
    `
      UPDATE users
      SET role = $2
      WHERE id = $1
      RETURNING id, username, email, role, email_verified
    `,
    [targetUserId, role]
  );

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: rows[0], message: 'User role updated' });
}

module.exports = {
  getOverview,
  updateUserRole,
  deleteUser,
};
