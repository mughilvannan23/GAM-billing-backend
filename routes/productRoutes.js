const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateMarginGst,
  importProducts
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getProducts)
  .post(protect, admin, createProduct);

router.post('/bulk-delete', protect, admin, bulkDeleteProducts);
router.post('/bulk-update-margin-gst', protect, admin, bulkUpdateMarginGst);
router.post('/import', protect, admin, upload.single('file'), importProducts);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = router;
