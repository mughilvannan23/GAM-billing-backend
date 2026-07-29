const mongoose = require('mongoose');

const customerSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String },
  dob: { type: Date },
  address: { type: String },
  gstNumber: { type: String },
  vehicleNumber: { type: String },
  totalPurchases: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },
  status: { type: Boolean, default: true }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;
