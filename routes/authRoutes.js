const express = require('express');
const router = express.Router();
const { login, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.route('/profile').get(protect, getUserProfile);

module.exports = router;
