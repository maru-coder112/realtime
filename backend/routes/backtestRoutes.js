const express = require('express');
const backtestController = require('../controllers/backtestController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/:id', authMiddleware, catchAsync(backtestController.getBacktestById));
router.get('/:id/report', authMiddleware, catchAsync(backtestController.exportBacktestReport));

module.exports = router;
