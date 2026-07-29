const Purchase = require('../models/Purchase');
const PurchaseItem = require('../models/PurchaseItem');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');
const AuditLog = require('../models/AuditLog');

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private/Admin
const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ adminId: req.adminId }).populate('supplier').populate('createdBy', 'name');
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get purchase by ID
// @route   GET /api/purchases/:id
// @access  Private/Admin
const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({ _id: req.params.id, adminId: req.adminId }).populate('supplier').populate('createdBy', 'name');
    if (purchase) {
      const items = await PurchaseItem.find({ purchase: purchase._id }).populate('product');
      res.json({ purchase, items });
    } else {
      res.status(404).json({ message: 'Purchase not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a purchase
// @route   POST /api/purchases
// @access  Private/Admin
const createPurchase = async (req, res) => {
  const { purchaseNumber, supplier, invoiceNumber, purchaseDate, items, subTotal, gstTotal, discountTotal, grandTotal, paymentStatus, paymentMethod, amountPaid, notes } = req.body;

  if (items && items.length === 0) {
    res.status(400).json({ message: 'No purchase items' });
    return;
  }

  try {
    const purchase = new Purchase({
      purchaseNumber, supplier, invoiceNumber, purchaseDate, subTotal, gstTotal, discountTotal, grandTotal, paymentStatus, paymentMethod, amountPaid, notes, createdBy: req.user._id
    });

    const createdPurchase = await purchase.save();

    for (const item of items) {
      const purchaseItem = new PurchaseItem({
        purchase: createdPurchase._id,
        product: item.product,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        gst: item.gst,
        discount: item.discount,
        total: item.total
      });
      await purchaseItem.save();

      // Update Stock
      const product = await Product.findById(item.product);
      if (product) {
        const previousStock = product.currentStock;
        product.currentStock += item.quantity;
        // Optionally update purchase price if it has changed
        product.purchasePrice = item.purchasePrice; 
        await product.save();

        // Create Stock History
        await StockHistory.create({
          product: product._id,
          type: 'Purchase',
          previousStock,
          newStock: product.currentStock,
          quantity: item.quantity,
          referenceId: createdPurchase._id,
          updatedBy: req.user._id
        });
      }
    }

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Purchase Processed',
      module: 'Purchase',
      newValue: createdPurchase,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.status(201).json(createdPurchase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase
};
