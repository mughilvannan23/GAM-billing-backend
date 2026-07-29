const express = require('express');
const router = express.Router();
const {
  getSales,
  getSaleById,
  getSalesReports,
  getPaymentSummary,
  createSale,
  receivePayment
} = require('../controllers/saleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/reports')
  .get(protect, getSalesReports);

router.route('/payment-summary')
  .get(protect, getPaymentSummary);

router.route('/:id')
  .get(protect, getSaleById);

router.route('/:id/pay')
  .put(protect, receivePayment);

module.exports = router;
