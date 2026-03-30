const express = require('express');
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.post('/predict', authMiddleware, catchAsync(aiController.predict));

module.exports = router;
