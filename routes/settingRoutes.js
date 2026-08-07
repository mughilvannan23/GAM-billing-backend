const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSettings)
  .put(protect, admin, updateSettings);

module.exports = router;
