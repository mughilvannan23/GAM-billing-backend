const mongoose = require('mongoose');

const settingSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, default: 'JAYASAKTHI AGENCIES AND PARTS' },
  companyLogo: { type: String, default: '' },
  phone: { type: String, default: '8489732891' },
  phone2: { type: String, default: '9442827432' },
  email: { type: String, default: '' },
  address: { type: String, default: 'NO:208/B7,8TH WARD, SELVA NAGAR, 4TH ROAD THURAIMANGALAM, PERAMBALUR - 621220' },
  gstNumber: { type: String, default: '33AAUFJ7343P1ZJ' },
  documentTitle: { type: String, default: 'CASH BILL' },
  salesmanName: { type: String, default: 'DIRECT' },
  bankName: { type: String, default: 'HDFC BANK LIMITED' },
  accountNumber: { type: String, default: '50200100225315' },
  ifscCode: { type: String, default: 'HDFC0001872' },
  branch: { type: String, default: 'VENKATESAPURAM , PERAMBALUR.' },
  invoicePrefix: { type: String, default: 'INV-' },
  invoiceFooter: { type: String, default: 'Thank you for your business!' }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
