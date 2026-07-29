const mongoose = require('mongoose');

const purchaseItemSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { timestamps: true });

const PurchaseItem = mongoose.model('PurchaseItem', purchaseItemSchema);
module.exports = PurchaseItem;
