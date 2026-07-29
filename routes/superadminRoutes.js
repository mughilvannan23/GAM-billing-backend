const express = require('express');
const router = express.Router();
const { getAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/superAdminController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/admins')
  .get(protect, superAdmin, getAdmins)
  .post(protect, superAdmin, createAdmin);

router.route('/admins/:id')
  .put(protect, superAdmin, updateAdmin)
  .delete(protect, superAdmin, deleteAdmin);

module.exports = router;
