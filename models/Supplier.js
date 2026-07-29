const mongoose = require('mongoose');

const supplierSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierName: { type: String, required: true },
  companyName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  gstNumber: { type: String },
  address: { type: String },
  outstandingBalance: { type: Number, default: 0 },
  notes: { type: String },
  status: { type: Boolean, default: true }
}, { timestamps: true });

const Supplier = mongoose.model('Supplier', supplierSchema);
module.exports = Supplier;
