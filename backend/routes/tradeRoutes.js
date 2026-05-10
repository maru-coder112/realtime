const express = require('express');
const tradeController = require('../controllers/tradeController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.post('/', authMiddleware, catchAsync(tradeController.postTrade));
router.get('/', authMiddleware, catchAsync(tradeController.listTrades));

module.exports = router;
