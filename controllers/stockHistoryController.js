const StockHistory = require('../models/StockHistory');

// @desc    Get stock history
// @route   GET /api/stock-history
// @access  Private/Admin
const getStockHistory = async (req, res) => {
  try {
    const history = await StockHistory.find({}).populate('product').populate('updatedBy', 'name').sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStockHistory
};
