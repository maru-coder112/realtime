const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.post('/register', catchAsync(authController.register));
router.post('/login', catchAsync(authController.login));
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);
router.get('/me', authMiddleware, catchAsync(authController.me));

module.exports = router;
