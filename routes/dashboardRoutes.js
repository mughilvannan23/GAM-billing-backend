const express = require('express');
const router = express.Router();
const { getDashboardStats, getInventoryAnalytics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.route('/stats').get(protect, getDashboardStats);
router.route('/analytics').get(protect, getInventoryAnalytics);

module.exports = router;
