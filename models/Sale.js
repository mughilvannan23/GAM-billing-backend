const mongoose = require('mongoose');

// Sub-schema for individual payment entries
const paymentEntrySchema = mongoose.Schema({
  method: {
    type: String,
    enum: ['Cash', 'GPay', 'PhonePe', 'Paytm', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Pay Later'],
    required: true
  },
  amount: { type: Number, required: true },
  // UPI / GPay / PhonePe / Paytm / Card / Bank Transfer
  transactionId: { type: String, default: '' },
  // Credit / Debit Card
  cardLast4: { type: String, default: '' },
  // Bank Transfer
  bankName: { type: String, default: '' },
  // Pay Later
  dueDate: { type: Date },
  notes: { type: String, default: '' },
  // Historical Tracking
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receivedDate: { type: Date, default: Date.now },
  // Per-entry status (mainly for Pay Later)
  status: { type: String, enum: ['Paid', 'Pending', 'Partially Paid'], default: 'Paid' }
}, { _id: false });

const saleSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  saleDate: { type: Date, required: true, default: Date.now },
  subTotal: { type: Number, required: true },
  gstTotal: { type: Number, default: 0 },
  cgstTotal: { type: Number, default: 0 },
  sgstTotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },

  // --- New multi-payment fields ---
  payments: { type: [paymentEntrySchema], default: [] },
  // Convenience: 'Cash', 'GPay', ..., or 'Split Payment' when >1 method
  paymentType: { type: String, default: 'Cash' },
  pendingAmount: { type: Number, default: 0 },

  // --- Kept for backward compatibility with old invoices ---
  paymentMethod: { type: String },
  amountPaid: { type: Number, default: 0 },

  paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partially Paid'], default: 'Paid' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
