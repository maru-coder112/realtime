const express = require('express');
const marketController = require('../controllers/marketController');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.get('/history', catchAsync(marketController.getMarketHistory));
router.get('/summary', catchAsync(marketController.getMarketSummary));
router.get('/news', catchAsync(marketController.getMarketNews));

module.exports = router;
