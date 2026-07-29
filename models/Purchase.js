const mongoose = require('mongoose');

const purchaseSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseNumber: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  invoiceNumber: { type: String },
  purchaseDate: { type: Date, required: true },
  subTotal: { type: Number, required: true },
  gstTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Multiple'] },
  amountPaid: { type: Number, default: 0 },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Purchase = mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;
