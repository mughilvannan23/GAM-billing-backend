const StockHistory = require('../models/StockHistory');

// @desc    Get stock history
// @route   GET /api/stock-history
// @access  Private/Admin
const getStockHistory = async (req, res) => {
  try {
    const filter = req.adminId ? { adminId: req.adminId } : {};
    const history = await StockHistory.find(filter).populate('product').populate('updatedBy', 'name').sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStockHistory
};
