const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  productCode: { type: String, required: true, unique: true },
  barcode: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: { type: String },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minimumStock: { type: Number, default: 5 },
  unit: { type: String, default: 'Nos' },
  rackNumber: { type: String },
  description: { type: String },
  image: { type: String },
  status: { type: Boolean, default: true }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
