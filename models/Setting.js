const mongoose = require('mongoose');

const settingSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, default: 'My Spare Parts Shop' },
  companyLogo: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  gstNumber: { type: String },
  invoicePrefix: { type: String, default: 'INV-' },
  invoiceFooter: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
