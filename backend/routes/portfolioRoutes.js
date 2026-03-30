const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.post('/', authMiddleware, catchAsync(portfolioController.createPortfolio));
router.put('/:id/holding', authMiddleware, catchAsync(portfolioController.updatePortfolioHolding));
router.get('/:id', authMiddleware, catchAsync(portfolioController.getPortfolioById));

module.exports = router;
