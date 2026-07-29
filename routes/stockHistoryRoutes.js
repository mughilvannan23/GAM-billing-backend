const express = require('express');
const router = express.Router();
const { getStockHistory } = require('../controllers/stockHistoryController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getStockHistory);

module.exports = router;
