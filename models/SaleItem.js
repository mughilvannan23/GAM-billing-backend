const mongoose = require('mongoose');

const saleItemSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { timestamps: true });

const SaleItem = mongoose.model('SaleItem', saleItemSchema);
module.exports = SaleItem;
