const express = require('express');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get('/overview', catchAsync(adminController.getOverview));
router.patch('/users/:userId/role', catchAsync(adminController.updateUserRole));
router.patch('/users/:userId/virtual-balance', catchAsync(adminController.updateUserVirtualBalance));
router.post('/reset-virtual-balance', catchAsync(adminController.resetAllUsersVirtualBalance));
router.delete('/users/:userId', catchAsync(adminController.deleteUser));

module.exports = router;
