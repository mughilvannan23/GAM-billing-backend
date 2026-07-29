const Return = require('../models/Return');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockHistory = require('../models/StockHistory');
const AuditLog = require('../models/AuditLog');

// @desc    Get all returns
// @route   GET /api/returns
// @access  Private
const getReturns = async (req, res) => {
  try {
    const returns = await Return.find({}).populate('sale').populate('product').populate('createdBy', 'name');
    res.json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a return
// @route   POST /api/returns
// @access  Private
const createReturn = async (req, res) => {
  const { returnNumber, saleId, productId, quantity, reason, refundAmount } = req.body;

  try {
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const newReturn = new Return({
      returnNumber,
      sale: saleId,
      product: productId,
      quantity,
      reason,
      refundAmount,
      createdBy: req.user._id
    });

    const createdReturn = await newReturn.save();

    // Increase stock
    const previousStock = product.currentStock;
    product.currentStock += quantity;
    await product.save();

    // Create Stock History
    await StockHistory.create({
      product: product._id,
      type: 'Sales Return',
      previousStock,
      newStock: product.currentStock,
      quantity: quantity,
      reason: reason,
      referenceId: createdReturn._id,
      updatedBy: req.user._id
    });

    await AuditLog.create({
      adminId: req.adminId,
      action: 'Return Processed',
      module: 'Return',
      newValue: createdReturn,
      user: req.user._id,
      ipAddress: req.ip
    });

    res.status(201).json(createdReturn);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getReturns,
  createReturn
};
