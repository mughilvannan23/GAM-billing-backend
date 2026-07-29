const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, unique: true },
  description: { type: String },
  status: { type: Boolean, default: true }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
