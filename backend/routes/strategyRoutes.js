const express = require('express');
const strategyController = require('../controllers/strategyController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/', authMiddleware, catchAsync(strategyController.listStrategies));
router.post('/', authMiddleware, catchAsync(strategyController.createStrategy));
router.patch('/:id', authMiddleware, catchAsync(strategyController.updateStrategy));
router.delete('/:id', authMiddleware, catchAsync(strategyController.deleteStrategy));
router.post('/backtest', authMiddleware, catchAsync(strategyController.runBacktest));
router.get('/:id/performance', authMiddleware, catchAsync(strategyController.getStrategyPerformance));

module.exports = router;
