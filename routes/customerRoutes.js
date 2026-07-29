const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerProfile
} = require('../controllers/customerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .get(protect, getCustomerProfile)
  .put(protect, updateCustomer)
  .delete(protect, admin, deleteCustomer);

module.exports = router;
