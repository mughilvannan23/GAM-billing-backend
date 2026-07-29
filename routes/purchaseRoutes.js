const express = require('express');
const router = express.Router();
const {
  getPurchases,
  getPurchaseById,
  createPurchase
} = require('../controllers/purchaseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getPurchases)
  .post(protect, admin, createPurchase);

router.route('/:id')
  .get(protect, admin, getPurchaseById);

module.exports = router;
