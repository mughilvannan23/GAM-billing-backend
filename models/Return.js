const mongoose = require('mongoose');

const returnSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnNumber: { type: String, required: true, unique: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, required: true },
  refundAmount: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Return = mongoose.model('Return', returnSchema);
module.exports = Return;
