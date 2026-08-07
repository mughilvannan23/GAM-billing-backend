const express = require('express');
const router = express.Router();
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation
} = require('../controllers/quotationController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getQuotations)
  .post(protect, createQuotation);

router.route('/:id')
  .get(protect, getQuotationById)
  .put(protect, updateQuotation)
  .delete(protect, deleteQuotation);

module.exports = router;
