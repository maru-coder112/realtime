const pool = require('./db');

async function createStrategy({ userId, name, description, parameters }) {
  const query = `
    INSERT INTO strategies (user_id, name, description, parameters)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [userId, name, description || '', parameters || {}];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function getStrategyById(id, userId) {
  const { rows } = await pool.query(
    'SELECT * FROM strategies WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0];
}

async function getStrategiesByUser(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM strategies WHERE user_id = $1 ORDER BY id DESC',
    [userId]
  );
  return rows;
}

async function updateStrategy(id, userId, updates) {
  const { name, description, parameters } = updates;
  const { rows } = await pool.query(
    `
      UPDATE strategies
      SET name = COALESCE($3, name),
          description = COALESCE($4, description),
          parameters = COALESCE($5::jsonb, parameters)
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [id, userId, name ?? null, description ?? null, parameters ? JSON.stringify(parameters) : null]
  );
  return rows[0];
}

async function deleteStrategy(id, userId) {
  const { rows } = await pool.query(
    'DELETE FROM strategies WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );
  return rows[0];
}

module.exports = {
  createStrategy,
  getStrategyById,
  getStrategiesByUser,
  updateStrategy,
  deleteStrategy,
};
