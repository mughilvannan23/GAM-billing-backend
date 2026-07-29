const mongoose = require('mongoose');

const stockHistorySchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['Stock In', 'Stock Out', 'Manual Adjustment', 'Purchase', 'Sales', 'Sales Return'], required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  quantity: { type: Number, required: true },
  reason: { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId }, // Can be Sale, Purchase, or Return ID
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
module.exports = StockHistory;
