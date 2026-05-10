const express = require('express');
const cors = require('cors');
const passport = require('passport');

const authRoutes = require('./routes/authRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const backtestRoutes = require('./routes/backtestRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const aiRoutes = require('./routes/aiRoutes');
const marketRoutes = require('./routes/marketRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tradeRoutes = require('./routes/tradeRoutes');

const app = express();

// Allow local dev frontend ports (5173 and 5174) for development CORS
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed by policy'));
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/backtests', backtestRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trades', tradeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
