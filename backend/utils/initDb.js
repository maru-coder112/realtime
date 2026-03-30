require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../models/db');

async function init() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(schema);
  console.log('Database schema initialized successfully.');
  await pool.end();
}

init().catch((error) => {
  console.error('Failed to initialize database:', error.message);
  process.exit(1);
});
